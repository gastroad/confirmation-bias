import { Skeleton } from "@/shared/ui";
import * as styles from "./status.css";

// 서버 컴포넌트가 DB를 조회하는 동안 보이는 화면. 목록 카드 모양에 맞춘 자리표시자다.
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
