import type { APIRequestContext, Page } from "@playwright/test";

/**
 * E2E는 **실 DB**를 본다. 그래서 "이슈가 335개다" 같은 단언은 내일 깨진다.
 *
 * 대신 같은 API를 테스트가 먼저 호출해 그 값과 화면을 대조한다. 데이터가 바뀌어도
 * 둘이 함께 바뀌므로 안 깨지고, "화면이 서버가 말한 것과 같은 값을 보여주는가"라는
 * 더 강한 것을 검증하게 된다.
 */

export interface DaySummary {
  date: string;
  clusterCount: number;
  articleCount: number;
}

export interface ClusterSummary {
  id: string;
  representativeTitle: string;
  bucketDate: string;
  articleCount: number;
  outletCount: number;
  leaningDistribution: Record<string, number>;
  tilt: number;
}

export interface ClusterStats {
  clusterCount: number;
  articleCount: number;
  leaningDistribution: Record<string, number>;
}

/** 색인 기준 — entities/cluster/model.ts와 같은 값. 화면 동작이 이 경계에서 갈린다. */
export const INDEX_MIN_ARTICLES = 3;
export const INDEX_MIN_LEANING_GROUPS = 2;

const GROUPS: Record<string, string[]> = {
  progressive: ["left", "center_left"],
  neutral: ["center"],
  conservative: ["right", "center_right"],
};

export function countLeaningGroups(dist: Record<string, number>): number {
  return Object.values(GROUPS).filter((leanings) => leanings.some((l) => (dist[l] ?? 0) > 0))
    .length;
}

export function isIndexable(c: ClusterSummary): boolean {
  return (
    c.articleCount >= INDEX_MIN_ARTICLES &&
    countLeaningGroups(c.leaningDistribution) >= INDEX_MIN_LEANING_GROUPS
  );
}

async function json<T>(request: APIRequestContext, path: string): Promise<T> {
  const res = await request.get(path);
  if (!res.ok()) throw new Error(`${path} → ${res.status()}`);
  return res.json() as Promise<T>;
}

export const getDays = (request: APIRequestContext) => json<DaySummary[]>(request, "/api/days");

export async function getLatestDay(request: APIRequestContext): Promise<DaySummary> {
  const days = await getDays(request);
  if (days.length === 0) throw new Error("수집된 날짜가 없습니다 — npm run collect 후 다시 시도");
  // /api/days는 최신순이다(server/queries/days.ts).
  return days[0];
}

export const getStats = (request: APIRequestContext, date?: string) =>
  json<ClusterStats>(request, `/api/clusters/stats${date ? `?date=${date}` : ""}`);

export const getClusters = (request: APIRequestContext, date?: string, limit = 50) =>
  json<{ items: ClusterSummary[]; nextCursor: string | null }>(
    request,
    `/api/clusters?limit=${limit}${date ? `&date=${date}` : ""}`
  );

/**
 * 색인 기준을 넘긴 클러스터 하나. 상세 페이지의 "정상 경로"를 보려면 이게 필요하다
 * (기준 미달이면 광고도 안 붙고 noindex가 된다).
 */
export async function findIndexableCluster(
  request: APIRequestContext
): Promise<ClusterSummary | null> {
  const days = await getDays(request);
  for (const day of days.slice(0, 5)) {
    const { items } = await getClusters(request, day.date);
    const hit = items.find(isIndexable);
    if (hit) return hit;
  }
  return null;
}

/** 기준에 못 미치는 클러스터 하나 (noindex 경로). */
export async function findNonIndexableCluster(
  request: APIRequestContext
): Promise<ClusterSummary | null> {
  const days = await getDays(request);
  for (const day of days.slice(0, 5)) {
    const { items } = await getClusters(request, day.date);
    const hit = items.find((c) => !isIndexable(c));
    if (hit) return hit;
  }
  return null;
}

/**
 * `<head>`의 robots 메타.
 *
 * **바로 읽으면 놓친다.** `generateMetadata`가 async인 페이지는 메타데이터가 body 끝으로
 * 스트리밍되고, 인라인 스크립트가 그것을 head로 옮긴다. `page.goto` 직후에는 아직
 * 옮겨지지 않아 `getAttribute`가 null을 준다(dev에서는 통과하고 프로덕션 빌드에서만
 * 터졌다). → docs/agent/infrastructure.md의 "SEO" 절
 *
 * 루트 레이아웃이 robots를 항상 설정하므로 이 대기는 정상 경로에서 즉시 풀린다.
 */
export async function robotsMeta(page: Page): Promise<string | null> {
  const meta = page.locator('head meta[name="robots"]').first();
  await meta.waitFor({ state: "attached", timeout: 10_000 });
  return meta.getAttribute("content");
}

/** JSON-LD 블록들을 파싱해 돌려준다. */
export async function jsonLdBlocks(page: Page): Promise<Record<string, unknown>[]> {
  const raw = await page.locator('script[type="application/ld+json"]').allTextContents();
  return raw.map((t) => JSON.parse(t) as Record<string, unknown>);
}

/** 화면의 "1,234" 같은 표기를 숫자로. */
export const parseLocaleNumber = (text: string): number => Number(text.replace(/[^\d]/g, ""));

/** 목록 한 페이지의 기본 크기 (server/queries/clusters.ts의 DEFAULT_PAGE_LIMIT). */
export const PAGE_LIMIT = 20;

/**
 * 목록 **첫 페이지에** 단독 보도가 섞여 있는 날짜.
 *
 * 정렬이 기사 수 내림차순이라 1건짜리(=단독)는 뒤 페이지로 밀린다. 전체를 훑어
 * "단독이 존재한다"고 판단하면 화면 첫 페이지에는 없어 테스트가 헛돈다.
 */
export async function findDayWithSoloOnFirstPage(
  request: APIRequestContext
): Promise<{ date: string; soloCount: number } | null> {
  for (const day of await getDays(request)) {
    const { items } = await getClusters(request, day.date, PAGE_LIMIT);
    const soloCount = items.filter((c) => c.outletCount === 1).length;
    if (soloCount > 0) return { date: day.date, soloCount };
  }
  return null;
}
