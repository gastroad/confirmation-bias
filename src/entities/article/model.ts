import type { OutletMetadata } from "@/entities/outlet";

/**
 * 화면에 싣는 기사 정보. **발췌(`description`)는 담지 않는다.**
 *
 * 상세 페이지는 제목·언론사·원문 링크만 보여주므로(→ ClusterDetailView) 300자 발췌는
 * 렌더되지 않은 채 매 요청 실려 다니기만 했다. 남의 텍스트를 페이지에 얹지 않는 것은
 * AdSense "복제된 콘텐츠" 대응의 핵심이기도 하다. 발췌는 임베딩 입력으로만 쓰이며
 * DB(`Article.description`)에는 그대로 남는다. → docs/agent/adsense-compliance.md
 */
export interface ArticleWithOutlet {
  id: string;
  title: string;
  url: string;
  publishedAt: string;
  outlet: OutletMetadata;
}

export interface TimelinePoint {
  hour: string;
  count: number;
}
