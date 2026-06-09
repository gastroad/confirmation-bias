export type Leaning =
  | "left"
  | "center_left"
  | "center"
  | "center_right"
  | "right"
  | "unknown";

export interface OutletMetadata {
  id: string;
  name: string;
  domain: string;
  leaning: Leaning;
  leaningLabel: string;
}

export type LeaningGroup = "conservative" | "neutral" | "progressive";

export type LeaningDistribution = Record<Leaning, number>;

export type LeaningGroupRatios = Record<LeaningGroup, number>;

export interface ArticleWithOutlet {
  id: string;
  title: string;
  description: string | null;
  url: string;
  publishedAt: string; // ISO string
  outlet: OutletMetadata;
}

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

export interface TimelinePoint {
  hour: string; // ISO string, truncated to hour
  count: number;
}

export interface IngestInput {
  title: string;
  description: string | null;
  url: string;
  publishedAt: string;
  outletId: string;
}
