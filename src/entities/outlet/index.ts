export type {
  Leaning,
  LeaningGroup,
  LeaningDistribution,
  LeaningGroupRatios,
  OutletMetadata,
  TiltSide,
  OutletStats,
  OutletOverlap,
  OutletDailyPoint,
  OutletClusterRef,
  OutletProfile,
  BarGeometry,
  BarSegment,
  TiltMethodVersion,
  TiltWorkedExample,
} from "./model";

export {
  OUTLETS,
  OUTLET_MAP,
  LEANING_GROUPS,
  LEANING_LABELS,
  LEANING_ORDER,
  LEANING_GROUP_LABELS,
  LEANING_GROUP_ORDER,
  GROUP_BY_LEANING,
  OUTLETS_BY_GROUP,
  emptyDistribution,
  calcLeaningGroupRatios,
  calcTilt,
  tiltSide,
  TILT_BALANCE_THRESHOLD,
  calcBarGeometry,
  OUTLET_ARTICLE_CAP,
  countLeaningDistribution,
  TILT_METHOD_VERSIONS,
  TILT_METHOD_VERSION,
  TILT_METHOD_EXAMPLE,
  workTiltExample,
} from "./model";

export {
  toOutletStats,
  toOutletProfile,
  buildOutletSummary,
  sortOutletsByVolume,
  ratioPercent,
} from "./lib";
export { LEANING_COLORS, TILT_COLORS } from "./leaning-colors";
export { LeaningBar } from "./ui/LeaningBar";
export { TiltLabel } from "./ui/TiltLabel";
