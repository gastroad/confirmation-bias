import { XMLParser } from "fast-xml-parser";
import { db } from "../server/db";
import { toBucketDate } from "../server/clustering/bucket";
import { findBlockedUrlSet } from "../server/queries/blocked-urls";
import { decodeFeedEntities } from "../server/feed-entities";
import feedSpecs from "./feed_specs.json";

// RSS를 긁어 Article로 바로 적재한다. 임베딩·클러스터링은 하지 않는다
// (하루치를 모아 cluster-day가 한 번에 처리한다).
//
//   npm run collect

interface CollectedArticle {
  title: string;
  description: string | null;
  url: string;
  publishedAt: Date;
  bucketDate: Date;
  outletId: string;
}

/**
 * RSS `description`을 저장할 최대 길이.
 *
 * 일부 언론사(뉴시스·서울신문·천지일보)는 요약이 아니라 **본문 전문**을 실어 보낸다
 * (실측 최대 7,681자). 그대로 저장·표시하면 저작권 문제가 된다. 우리는 "어느 매체가 이 이슈를
 * 어떻게 다뤘는가"를 보여주는 서비스이므로 발췌면 충분하고, 전문은 원문 링크로 보낸다.
 *
 * 300자는 RSS 관행이기도 하다 — 동아·여성신문·시사저널·미디어오늘이 이 길이로 잘라 보낸다.
 * 부수 효과로 임베딩 입력 길이가 매체 간에 고르게 맞춰진다(전에는 300~7,681자로 들쭉날쭉해
 * 긴 요약을 주는 매체가 더 많은 정보로 임베딩됐다).
 */
const MAX_DESCRIPTION_LENGTH = 300;

function toExcerpt(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  return trimmed.length <= MAX_DESCRIPTION_LENGTH
    ? trimmed
    : `${trimmed.slice(0, MAX_DESCRIPTION_LENGTH)}…`;
}

// RSS pubDate는 신뢰할 수 없다. 실제로 2023-03 날짜를 달고 오는 기사가 20건 섞여 있었고,
// 그대로 두면 일별 버킷이 엉뚱한 날짜에 만들어진다.
const MAX_PAST_DAYS = 30;

const parser = new XMLParser({ cdataPropName: "__cdata" });

function toText(val: unknown): string {
  if (typeof val === "string") return val;
  if (val && typeof val === "object" && "__cdata" in val)
    return (val as Record<string, string>).__cdata;
  return "";
}

/**
 * 태그를 걷어낸 뒤 엔티티를 되돌린다. **순서가 중요하다** — 엔티티를 먼저 풀면
 * `&lt;script&gt;`가 진짜 태그가 되어 그다음 태그 제거에 걸려 사라진다.
 *
 * URL에는 적용하지 않는다. 프레시안 링크에 `&amp;ref=rss`가 섞여 오지만 `Article.url`은
 * `@unique`라, 지금부터 디코딩하면 같은 기사가 옛 URL과 새 URL로 두 번 적재된다.
 * 링크 자체는 정상 동작하므로 건드리지 않는다.
 */
function stripHtml(str: string): string {
  return decodeFeedEntities(str.replace(/<[^>]*>/g, "")).trim();
}

// RSS 2.0은 pubDate, Dublin Core는 dc:date를 쓴다. 경향·프레시안이 후자라 pubDate만 보면
// 발행 시각을 통째로 놓쳐 수집 시각으로 대체된다(일별 버킷이 어긋날 수 있다).
// 한겨레는 item에 날짜 태그가 아예 없어 여전히 수집 시각으로 떨어진다.
function pickPublishedRaw(item: Record<string, unknown>): string {
  return toText(item.pubDate) || toText(item["dc:date"]) || "";
}

function sanitizePublishedAt(raw: string, now: Date): Date {
  const t = new Date(raw).getTime();
  if (!Number.isFinite(t)) return now;
  if (t > now.getTime()) return now;
  if (t < now.getTime() - MAX_PAST_DAYS * 24 * 60 * 60 * 1000) return now;
  return new Date(t);
}

async function fetchFeed(
  outletId: string,
  feedUrl: string,
  now: Date
): Promise<CollectedArticle[]> {
  try {
    const res = await fetch(feedUrl, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const xml = await res.text();
    const parsed = parser.parse(xml);

    // 죽은 피드는 200 OK로 HTML(서비스 종료/에러 안내)을 반환하기도 한다.
    // res.ok만으로는 못 거르므로 RSS 구조 부재를 명시적으로 경고한다.
    if (!parsed?.rss?.channel) {
      const snippet = xml.replace(/\s+/g, " ").trim().slice(0, 60);
      throw new Error(`RSS 구조 아님 (응답: ${snippet}…)`);
    }

    const raw = parsed.rss.channel.item ?? [];
    const items: unknown[] = Array.isArray(raw) ? raw : [raw];

    return items
      .map((item) => {
        const i = item as Record<string, unknown>;
        const url = toText(i.link) || toText(i.guid);
        const title = stripHtml(toText(i.title));
        const description = toExcerpt(stripHtml(toText(i.description)));
        const publishedAt = sanitizePublishedAt(pickPublishedRaw(i), now);
        return {
          title,
          description,
          url,
          publishedAt,
          bucketDate: toBucketDate(publishedAt),
          outletId,
        };
      })
      .filter((a) => a.title && a.url);
  } catch (e) {
    console.warn(`  ⚠️  ${outletId}: ${(e as Error).message}`);
    return [];
  }
}

async function main() {
  const feeds = feedSpecs.politics;
  const now = new Date();
  console.log(`Fetching ${feeds.length} feeds in parallel…\n`);

  const results = await Promise.all(feeds.map((feed) => fetchFeed(feed.outletId, feed.url, now)));

  // 저작권자 요청으로 차단한 기사는 다시 들이지 않는다. 지우기만 하면 여기서 재수집된다.
  const blocked = await findBlockedUrlSet();
  const seen = new Set<string>();
  const collected = results.flat();
  const articles = collected.filter(({ url }) => {
    if (blocked.has(url) || seen.has(url)) return false;
    seen.add(url);
    return true;
  });

  // url @unique + skipDuplicates로 이미 적재된 기사는 건너뛴다.
  // 기존 행을 갱신하지 않는 이유: 클러스터 배정과 임베딩이 이미 붙어 있을 수 있다.
  const { count } = await db.article.createMany({ data: articles, skipDuplicates: true });

  console.log(
    `\n✅  수집 ${articles.length}건 · 신규 ${count}건 적재` +
      (blocked.size > 0 ? ` · 차단 목록 ${blocked.size}건 적용` : "")
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
