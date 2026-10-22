import Script from "next/script";
import { GTM_ID } from "@/shared/config/site";
import { gtmBootstrapScript } from "@/shared/lib/gtm";

/**
 * Google Tag Manager(→ GA4). **AdSenseLoader와 반대로 루트 레이아웃에 둔다.**
 * 광고는 읽을 것이 없는 화면에 붙으면 정책 위반이지만, 측정은 동선 전체가 이어져야
 * 진입률·재방문을 잴 수 있다. /auth·/admin 제외는 GA 쪽 필터로 한다.
 *
 * 클라이언트 내비게이션의 page_view는 GA4 향상된 측정의 "브라우저 기록 이벤트"가 잡는다.
 * → docs/agent/analytics.md
 */
export function TagManager() {
  if (process.env.VERCEL_ENV !== "production") return null;
  return (
    <Script id="gtm-init" strategy="afterInteractive">
      {gtmBootstrapScript(GTM_ID)}
    </Script>
  );
}

export function TagManagerNoScript() {
  if (process.env.VERCEL_ENV !== "production") return null;
  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
      />
    </noscript>
  );
}
