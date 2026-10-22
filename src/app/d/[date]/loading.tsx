import { Skeleton } from "@/shared/ui";
import * as styles from "../../status.css";

/**
 * 날짜 페이지가 DB를 조회하는 동안 보이는 화면. 목록 카드 모양에 맞춘 자리표시자다.
 *
 * ⚠️ **루트(`app/loading.tsx`)에 두지 않는다.** 루트에 두면 모든 라우트가 Suspense 경계
 * 안에 들어가 **응답이 200으로 먼저 스트리밍되고, 그 뒤에는 상태코드를 바꿀 수 없다** —
 * `notFound()`가 HTTP 200 + `noindex`인 soft 404가 된다(실측: 라이브에서
 * `/clusters/<없는 id>`가 200을 냈다). Next 문서가 "404 상태가 필요하면 본문이
 * 스트리밍되기 전에 리소스 존재를 확인하라"고 명시한다.
 *
 * 그래서 이 파일은 **날짜 페이지 세그먼트에만** 둔다. 클러스터 상세는 경계가 없어야
 * 기준 미달 페이지에 진짜 404를 낼 수 있다 → docs/agent/adsense-compliance.md의 P0-6.
 */
export default function Loading() {
  return (
    <div className={styles.skeletonWrap}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Skeleton width="70%" height={16} />
          <Skeleton width="100%" height={12} radius={9999} />
          <Skeleton width="40%" height={12} />
        </div>
      ))}
    </div>
  );
}
