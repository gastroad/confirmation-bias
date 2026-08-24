import type { Leaning, LeaningDistribution, LeaningGroupRatios } from "@/entities/outlet";
import type { ArticleWithOutlet, TimelinePoint } from "@/entities/article";

export interface ClusterSummary {
  id: string;
  representativeTitle: string;
  summary: string | null;
  /** 이 클러스터가 속한 KST 하루 ("YYYY-MM-DD") */
  bucketDate: string;
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

/** 날짜 내비게이션용 하루 요약 */
export interface DaySummary {
  /** "YYYY-MM-DD" (KST 기준일) */
  date: string;
  clusterCount: number;
  articleCount: number;
}

/** 필터 적용된 목록 전체 집계 (StatsBar용) */
export interface ClusterStats {
  clusterCount: number;
  articleCount: number;
  leaningDistribution: LeaningDistribution;
  dominantLeaning: Leaning | null;
}
