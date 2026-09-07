// cluster 전용 공개 API.
//
// 클러스터는 기사의 outletId를 성향으로 바꿔 분포·편향을 계산하므로 **성향 분류 체계와
// 레지스트리**가 필요하다.
//
// 여는 기준은 "cluster가 실제로 쓰는 것"이다. 넓게 열어 두면 나중에 좁힐 수 없으므로,
// 쓸 때 한 줄씩 늘린다. 지금 닫아 둔 것은 언론사 페이지 집계(OutletProfile·toOutletStats) —
// 그건 cluster의 관심사가 아니다.
//
// 성향 막대·편중 라벨(ui/)은 ClusterCard가 쓴다. 카드 본문이 "제목 → 막대 → 수치 한 줄"이라
// outlet의 화면 조각 없이는 그려지지 않는다 — 막대는 outlet의 것이고 분포는 cluster의 것이다.
// → docs/agent/conventions.md "cross-entity"
export type { Leaning, LeaningGroup, LeaningDistribution, LeaningGroupRatios } from "../model";

export {
  OUTLET_MAP,
  LEANING_ORDER,
  LEANING_GROUPS,
  LEANING_GROUP_ORDER,
  GROUP_BY_LEANING,
  TILT_BALANCE_THRESHOLD,
  emptyDistribution,
  calcLeaningGroupRatios,
  calcTilt,
} from "../model";

export { LeaningBar } from "../ui/LeaningBar";
export { TiltLabel } from "../ui/TiltLabel";
