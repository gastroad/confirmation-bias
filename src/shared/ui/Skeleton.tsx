import type { CSSProperties } from "react";
import * as styles from "./Skeleton.css";

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  /** 기본값은 theme의 radius.sm. pill 형태가 필요하면 9999 등을 넘긴다. */
  radius?: number | string;
  className?: string;
}

export function Skeleton({ width, height, radius, className }: SkeletonProps) {
  const style: CSSProperties = { width, height, borderRadius: radius };
  return (
    <div
      className={className ? `${styles.skeleton} ${className}` : styles.skeleton}
      style={style}
      aria-hidden
    />
  );
}
