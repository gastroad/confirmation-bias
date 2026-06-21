import { useEffect, useRef } from "react";

interface Options {
  /** 센티넬이 보일 때 호출. (예: react-query의 fetchNextPage) */
  onLoadMore: () => void;
  /** 관찰 활성 여부. (예: hasNextPage && !isFetchingNextPage) */
  enabled: boolean;
  /** 미리 로드하기 위한 여유 마진. */
  rootMargin?: string;
}

/**
 * 반환된 ref를 리스트 끝 센티넬 엘리먼트에 붙이면,
 * 그 엘리먼트가 뷰포트에 들어올 때 onLoadMore가 호출된다.
 */
export function useInfiniteScroll<T extends HTMLElement = HTMLDivElement>({
  onLoadMore,
  enabled,
  rootMargin = "200px",
}: Options) {
  const sentinelRef = useRef<T>(null);

  // 콜백은 항상 최신으로 유지하되, observer는 재구독하지 않는다.
  const onLoadMoreRef = useRef(onLoadMore);
  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !enabled) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onLoadMoreRef.current();
      },
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled, rootMargin]);

  return sentinelRef;
}
