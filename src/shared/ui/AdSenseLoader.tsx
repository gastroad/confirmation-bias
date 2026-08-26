import Script from "next/script";
import { ADSENSE_CLIENT } from "@/shared/config/site";

/**
 * AdSense 로더. 이 스크립트 하나가 광고 게재와 EEA/UK/CH 대상 CMP 동의 배너를 함께 띄운다.
 *
 * **루트 레이아웃이 아니라 콘텐츠 페이지에서만 렌더한다.** 루트에 두면 `/auth/sign-in`,
 * `/account/delete`, `/admin/*` 처럼 읽을 콘텐츠가 없는 화면에도 자동광고가 붙는데,
 * 그건 "콘텐츠 없는 화면의 광고 게재"라는 **별도의 정책 위반 항목**이다.
 * 색인 기준에 못 미치는 클러스터·날짜에서도 같은 이유로 렌더하지 않는다.
 *
 * 사이트 소유 확인용 `google-adsense-account` 메타와 `public/ads.txt`는 루트에 그대로 둔다
 * (그 둘은 광고 게재가 아니라 소유 증명이다). → docs/agent/adsense-compliance.md
 */
export function AdSenseLoader() {
  return (
    <Script
      id="adsbygoogle-init"
      strategy="afterInteractive"
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
    />
  );
}
