import type { Leaning, LeaningDistribution, LeaningGroupRatios } from "@/entities/outlet";
import type { ArticleWithOutlet, TimelinePoint } from "@/entities/article";

export interface ClusterSummary {
  id: string;
  representativeTitle: string;
  summary: string | null;
  /** 이 클러스터가 속한 KST 하루 ("YYYY-MM-DD") */
  bucketDate: string;
  articleCount: number;
  /** 이 사건을 다룬 서로 다른 언론사 수 */
  outletCount: number;
  latestPublishedAt: string;
  leaningDistribution: LeaningDistribution;
  leaningGroupRatios: LeaningGroupRatios;
  /** 진보 비율 − 보수 비율 (%p). 중심선에서 어느 쪽으로 얼마나 벗어났는지 */
  tilt: number;
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

/**
 * 색인 기준 — **기사 3건 이상 & 등장 성향 그룹 2개 이상.**
 *
 * 2026-08-25 AdSense 심사에서 "복제된 콘텐츠"·"가치가 별로 없는 콘텐츠" 두 건을 통보받았다.
 * 원인은 클러스터 1만여 개를 **전량 색인**한 것이다. 실측(2026-08-27)으로 기사 1건짜리가
 * 61%, 등장 성향이 한쪽뿐인 게 75%였다 — 즉 "성향별 비교"라는 이 서비스의 부가가치가
 * 아예 성립하지 않는 페이지가 대부분이었고, 심사자가 무작위로 열면 그런 껍데기가 나왔다.
 *
 * 이 기준을 넘지 못한 페이지도 **접근은 그대로 열어 둔다.** 색인만 뺀다(noindex, follow) —
 * 사용자에겐 손실이 없고 크롤러에게만 "이건 대표 페이지가 아니다"라고 말하는 것이다.
 * → docs/agent/adsense-compliance.md
 */
export const INDEX_MIN_ARTICLES = 3;
export const INDEX_MIN_LEANING_GROUPS = 2;
