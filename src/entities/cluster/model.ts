import type { LeaningDistribution, LeaningGroupRatios } from "@/entities/outlet";
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
