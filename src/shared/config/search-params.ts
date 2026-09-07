// URL 쿼리 파라미터 이름. 클라이언트 fetcher(entities)·필터 UI(features)·API 라우트(app)가
// 공유하는 **와이어 계약**이라 단일 출처가 필요하다.
//
// shared에 두는 이유: 예전엔 OUTLETS_PARAM이 features/outlet-filter에 있었는데, entities는
// 상위 레이어를 import할 수 없어 entities/cluster/api.ts가 "outlets"를 문자열로 다시 박았다.
// 계약을 쓰는 쪽이 여러 레이어에 흩어져 있으면 계약은 가장 아래에 둔다.

export const OUTLETS_PARAM = "outlets";
export const DATE_PARAM = "date";
export const CURSOR_PARAM = "cursor";
export const LIMIT_PARAM = "limit";
