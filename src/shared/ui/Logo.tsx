interface LogoProps {
  size?: number;
  className?: string;
}

// 프리즘 분광 마크: 하나의 사건(입사선)이 프리즘을 지나 진영색으로 갈라진다(편향).
// 중립 요소(입사선·프리즘)는 currentColor라 부모 색을 따르고, 분광 rays는 성향 고정색.
export function Logo({ size = 28, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      role="img"
      aria-label="확증편향 로고"
    >
      <line
        x1="8"
        y1="50"
        x2="40"
        y2="50"
        stroke="currentColor"
        strokeWidth={6}
        strokeLinecap="round"
      />
      <path
        d="M44 34 L64 50 L44 66 Z"
        stroke="currentColor"
        strokeWidth={5}
        strokeLinejoin="round"
      />
      <line
        x1="66"
        y1="46"
        x2="92"
        y2="26"
        stroke="#3b82f6"
        strokeWidth={6}
        strokeLinecap="round"
      />
      <line
        x1="68"
        y1="50"
        x2="94"
        y2="50"
        stroke="#9ca3af"
        strokeWidth={6}
        strokeLinecap="round"
      />
      <line
        x1="66"
        y1="54"
        x2="92"
        y2="74"
        stroke="#ef4444"
        strokeWidth={6}
        strokeLinecap="round"
      />
    </svg>
  );
}
