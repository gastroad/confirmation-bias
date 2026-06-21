import type { Leaning, LeaningDistribution, LeaningGroupRatios } from "@/entities/outlet";
import type { ArticleWithOutlet, TimelinePoint } from "@/entities/article";

export interface ClusterSummary {
  id: string;
  representativeTitle: string;
  summary: string | null;
  articleCount: number;
  latestPublishedAt: string;
  leaningDistribution: LeaningDistribution;
  leaningGroupRatios: LeaningGroupRatios;
}

export interface ClusterDetail extends ClusterSummary {
  articles: ArticleWithOutlet[];
  timeline: TimelinePoint[];
}

/** 커서 페이지네이션 응답 (무한 스크롤) */
export interface ClustersPage {
  items: ClusterSummary[];
  nextCursor: string | null;
}

/** 필터 적용된 목록 전체 집계 (StatsBar용) */
export interface ClusterStats {
  clusterCount: number;
  articleCount: number;
  leaningDistribution: LeaningDistribution;
  dominantLeaning: Leaning | null;
}
