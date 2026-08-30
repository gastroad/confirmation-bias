import { describe, it, expect } from "vitest";
import { websiteSchema, clusterCollectionSchema, clusterBreadcrumbSchema } from "./schemas";
import { SITE_URL, SITE_NAME, absoluteUrl } from "@/shared/config/site";

// JSON-LD는 화면에 보이지 않는다 → 깨져도 눈치채지 못한다.
// 구조 오류는 Search Console에 뜰 때쯤이면 이미 색인이 지나간 뒤다.

const cluster = {
  id: "abc-123",
  representativeTitle: "국회 본회의 통과",
  description: "3개 언론사가 보도했습니다.",
  articleCount: 3,
  latestPublishedAt: "2026-08-26T05:00:00.000Z",
  articles: [
    { title: "제목 A", url: "https://hani.co.kr/a" },
    { title: "제목 B", url: "https://chosun.com/b" },
    { title: "제목 C", url: "https://yna.co.kr/c" },
  ],
};

/** 실제로 <script type="application/ld+json">에 실리는 형태로 통과하는지. */
const serializable = (schema: Record<string, unknown>) =>
  JSON.parse(JSON.stringify(schema)) as Record<string, unknown>;

describe("websiteSchema", () => {
  it("@context와 @type을 갖춘다", () => {
    const s = websiteSchema();
    expect(s["@context"]).toBe("https://schema.org");
    expect(s["@type"]).toBe("WebSite");
  });

  it("사이트 상수를 그대로 싣는다 — 값이 두 군데서 갈리지 않는다", () => {
    const s = websiteSchema();
    expect(s.name).toBe(SITE_NAME);
    expect(s.url).toBe(SITE_URL);
    expect(s.inLanguage).toBe("ko-KR");
  });

  it("JSON으로 직렬화된다 (undefined·순환 참조 없음)", () => {
    expect(serializable(websiteSchema())).toEqual(websiteSchema());
  });
});

describe("clusterCollectionSchema", () => {
  it("여러 출처를 묶은 집계 페이지이므로 CollectionPage + ItemList다", () => {
    const s = clusterCollectionSchema(cluster);
    expect(s["@type"]).toBe("CollectionPage");
    expect((s.mainEntity as Record<string, unknown>)["@type"]).toBe("ItemList");
  });

  it("url이 canonical과 같은 절대 주소다", () => {
    const s = clusterCollectionSchema(cluster);
    expect(s.url).toBe(absoluteUrl("/clusters/abc-123"));
    expect(String(s.url).startsWith("https://")).toBe(true);
  });

  it("ItemList의 position이 1부터 빠짐없이 이어진다", () => {
    const list = clusterCollectionSchema(cluster).mainEntity as {
      itemListElement: { position: number; url: string; name: string }[];
    };
    expect(list.itemListElement.map((i) => i.position)).toEqual([1, 2, 3]);
  });

  it("항목 url은 우리 페이지가 아니라 **원문**을 가리킨다", () => {
    const list = clusterCollectionSchema(cluster).mainEntity as {
      itemListElement: { url: string }[];
    };
    expect(list.itemListElement.map((i) => i.url)).toEqual([
      "https://hani.co.kr/a",
      "https://chosun.com/b",
      "https://yna.co.kr/c",
    ]);
  });

  it("numberOfItems는 클러스터의 기사 수다", () => {
    const list = clusterCollectionSchema(cluster).mainEntity as { numberOfItems: number };
    expect(list.numberOfItems).toBe(cluster.articleCount);
  });

  it("기사가 없어도 구조가 무너지지 않는다", () => {
    const s = clusterCollectionSchema({ ...cluster, articleCount: 0, articles: [] });
    const list = s.mainEntity as { numberOfItems: number; itemListElement: unknown[] };
    expect(list.itemListElement).toEqual([]);
    expect(list.numberOfItems).toBe(0);
  });

  it("dateModified가 ISO 문자열이다", () => {
    expect(clusterCollectionSchema(cluster).dateModified).toBe("2026-08-26T05:00:00.000Z");
  });

  it("JSON으로 직렬화된다", () => {
    expect(serializable(clusterCollectionSchema(cluster))).toEqual(
      clusterCollectionSchema(cluster)
    );
  });
});

describe("clusterBreadcrumbSchema", () => {
  it("홈 → 이슈 두 단계다", () => {
    const s = clusterBreadcrumbSchema(cluster);
    expect(s["@type"]).toBe("BreadcrumbList");
    const items = s.itemListElement as { position: number; name: string; item: string }[];
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({ "@type": "ListItem", position: 1, name: "홈", item: SITE_URL });
    expect(items[1].position).toBe(2);
    expect(items[1].name).toBe(cluster.representativeTitle);
    expect(items[1].item).toBe(absoluteUrl(`/clusters/${cluster.id}`));
  });

  it("두 스키마가 같은 URL을 가리킨다 — 크롤러에 서로 다른 대표 주소를 주지 않는다", () => {
    const collection = clusterCollectionSchema(cluster);
    const items = clusterBreadcrumbSchema(cluster).itemListElement as { item: string }[];
    expect(items[1].item).toBe(collection.url);
  });
});

describe("absoluteUrl", () => {
  it("경로 앞의 슬래시를 강제한다", () => {
    expect(absoluteUrl("/about")).toBe(`${SITE_URL}/about`);
    expect(absoluteUrl("about")).toBe(`${SITE_URL}/about`);
  });

  it("인자가 없으면 루트다", () => {
    expect(absoluteUrl()).toBe(`${SITE_URL}/`);
  });

  it("SITE_URL에 후행 슬래시가 남지 않는다 — //about 같은 주소를 만들지 않는다", () => {
    expect(SITE_URL.endsWith("/")).toBe(false);
    expect(absoluteUrl("/about")).not.toContain("//about");
  });
});
