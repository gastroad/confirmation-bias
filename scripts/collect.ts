import { XMLParser } from "fast-xml-parser";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import feedSpecs from "./feed_specs.json";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface CollectedArticle {
  title: string;
  description: string | null;
  url: string;
  publishedAt: string;
  outletId: string;
}

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

async function fetchFeed(outletId: string, feedUrl: string): Promise<CollectedArticle[]> {
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
        const pubDate = toText(i.pubDate);
        const publishedAt = pubDate ? new Date(pubDate).toISOString() : new Date().toISOString();
        return { title, description, url, publishedAt, outletId };
      })
      .filter((a) => a.title && a.url);
  } catch (e) {
    console.warn(`  ⚠️  ${outletId}: ${(e as Error).message}`);
    return [];
  }
}

async function main() {
  const feeds = feedSpecs.politics;
  console.log(`Fetching ${feeds.length} feeds in parallel…\n`);

  const results = await Promise.all(
    feeds.map((feed) => {
      process.stdout.write(`  → ${feed.name} (${feed.outletId})\n`);
      return fetchFeed(feed.outletId, feed.url);
    })
  );

  const seen = new Set<string>();
  const articles = results
    .flat()
    .filter(({ url }) => (seen.has(url) ? false : (seen.add(url), true)));

  const outPath = path.resolve(__dirname, "../data/new-articles.json");
  // data/는 gitignore라 새 체크아웃(CI)엔 없을 수 있다. 쓰기 전에 보장한다.
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(articles, null, 2));

  console.log(`\n✅  ${articles.length} articles → data/new-articles.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
