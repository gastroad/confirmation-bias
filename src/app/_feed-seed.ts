import { QueryClient, dehydrate } from "@tanstack/react-query";
import { clusterQueryKeys } from "@/entities/cluster";
import type { ClustersPage } from "@/entities/cluster";
import { getClustersPage, getClusterStats } from "./_cluster-data";

/**
 * 목록의 **첫 화면을 서버에서 그리게 하는 씨앗.**
 *
 * `ClusterFeed`는 react-query로 목록을 받는 클라이언트 위젯이라, 초기 HTML에는 스켈레톤만
 * 있고 이슈가 한 건도 없었다(2026-09-07 실측: 홈·날짜 페이지 본문 텍스트 132자). 광고가
 * 뜨는 72개 페이지가 전부 그 상태였고, 이는 심사 통보 항목인 "가치가 별로 없는 콘텐츠"와
 * 정확히 겹친다 — 크롤러가 읽는 HTML에 콘텐츠가 없으면 없는 것이다.
 *
 * 그래서 위젯을 서버 컴포넌트로 바꾸는 대신 **같은 위젯이 서버에서도 데이터를 갖게** 한다.
 * 여기서 첫 페이지를 미리 받아 dehydrate하면 `HydrationBoundary`가 렌더 도중에 hydrate하므로
 * (자식보다 먼저 도는 `useMemo` 단계) SSR 시점에 `useInfiniteQuery`가 이미 데이터를 본다.
 * 무한 스크롤·언론사 필터·중심선은 손대지 않는다.
 *
 * ⚠️ **`HydrationBoundary`는 `Suspense` 안이 아니라 밖에 세운다.** 경계 안에서 await하면
 * 그 경계가 지연 렌더로 바뀌어 콘텐츠가 `<div hidden>`으로 스트리밍된 뒤 스크립트가 제자리로
 * 옮긴다 — JS를 실행하지 않는 크롤러에겐 다시 빈 지면이다. 페이지가 먼저 await해서 state를
 * 넘기면 경계 안에서 아무것도 suspend하지 않아 HTML 흐름에 그대로 실린다.
 * (경계 자체는 `useSearchParams` 때문에 남긴다.)
 *
 * 키는 `entities/cluster`의 `clusterQueryKeys` — 위젯과 한 글자도 어긋나면 안 된다.
 */
export async function seedClusterFeed(outletIds: string[], date?: string) {
  const queryClient = new QueryClient();
  // `@db.Date` 컬럼과 맞추기 위한 UTC 자정 — features/date-nav의 parseDateParam과 같은 규칙.
  const bucketDateIso = date ? new Date(`${date}T00:00:00Z`).toISOString() : undefined;

  // prefetch는 실패해도 throw하지 않고 dehydrate 결과에서 빠진다 — DB가 잠들어 있으면
  // 지금까지처럼 스켈레톤이 뜨고 클라이언트가 다시 받아온다.
  await Promise.all([
    queryClient.prefetchInfiniteQuery({
      queryKey: clusterQueryKeys.page(outletIds, date),
      queryFn: () => getClustersPage(undefined, undefined, outletIds, bucketDateIso),
      initialPageParam: null as string | null,
      getNextPageParam: (lastPage: ClustersPage) => lastPage.nextCursor,
    }),
    queryClient.prefetchQuery({
      queryKey: clusterQueryKeys.stats(outletIds, date),
      queryFn: () => getClusterStats(outletIds, bucketDateIso),
    }),
  ]);

  return dehydrate(queryClient);
}
