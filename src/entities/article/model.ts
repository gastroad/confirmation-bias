import type { OutletMetadata } from "@/entities/outlet";

export interface ArticleWithOutlet {
  id: string;
  title: string;
  description: string | null;
  url: string;
  publishedAt: string;
  outlet: OutletMetadata;
}

export interface TimelinePoint {
  hour: string;
  count: number;
}
