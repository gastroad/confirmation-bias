// 캐시 수명만 여기서 관리한다. 실제 캐싱은 **DTO 경계**(API 라우트·서버 컴포넌트)에서 건다.
//
// 쿼리 레벨(Prisma row)에 걸면 안 된다 — `unstable_cache`는 반환값을 JSON 직렬화하므로
// `Date`가 문자열로 돌아와 `row.publishedAt.getTime()` 같은 호출이 깨진다.
// DTO는 이미 ISO 문자열이라 직렬화가 안전하다.
//
// 페이지 단위 `revalidate`를 쓰지 않는 이유: 헤더가 세션(쿠키)을 읽는 순간 모든 페이지가
// 동적이 되어 무력화된다. Neon은 compute-hour 과금이라 왕복 횟수 자체를 줄여야 한다.

export const CACHE_TTL = {
  /** 클러스터 상세. 한번 만들어진 날짜의 클러스터는 굳으므로 길게 잡아도 된다. */
  clusterDetail: 60 * 60 * 6,
  /** 목록·집계. 최신 날짜가 하루 1회 바뀐다. */
  clusterList: 60 * 60,
  /** 날짜 축. 하루 1회 늘어난다. */
  days: 60 * 60,
  /** 사이트맵. 크롤러가 자주 와도 DB를 치지 않게. */
  sitemap: 60 * 60 * 6,
} as const;
