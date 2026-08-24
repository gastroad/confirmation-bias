import { XMLParser } from "fast-xml-parser";
import { db } from "../server/db";
import { toBucketDate } from "../server/clustering/bucket";
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

function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, "").trim();
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
        const description = stripHtml(toText(i.description)) || null;
        const publishedAt = sanitizePublishedAt(toText(i.pubDate), now);
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

  const seen = new Set<string>();
  const articles = results
    .flat()
    .filter(({ url }) => (seen.has(url) ? false : (seen.add(url), true)));

  // url @unique + skipDuplicates로 이미 적재된 기사는 건너뛴다.
  // 기존 행을 갱신하지 않는 이유: 클러스터 배정과 임베딩이 이미 붙어 있을 수 있다.
  const { count } = await db.article.createMany({ data: articles, skipDuplicates: true });

  console.log(`\n✅  수집 ${articles.length}건 · 신규 ${count}건 적재`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
