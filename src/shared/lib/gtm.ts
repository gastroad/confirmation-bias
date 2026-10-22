// 동의가 필요한 지역(EEA·영국·스위스). AdSense의 Google CMP가 배너를 띄우는 범위와 같다.
export const CONSENT_REQUIRED_REGIONS = [
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
  "IS",
  "LI",
  "NO",
  "GB",
  "CH",
] as const;

const CONSENT_TYPES = ["ad_storage", "ad_user_data", "ad_personalization", "analytics_storage"];

function consentState(value: "granted" | "denied") {
  return Object.fromEntries(CONSENT_TYPES.map((type) => [type, value]));
}

/**
 * dataLayer 초기화 → 동의 기본값 → GTM 로드를 **한 스크립트 안에서 이 순서로** 실행한다.
 * 동의 기본값이 GTM보다 늦으면 첫 page_view가 동의 없이 나간다.
 *
 * 동의 지역은 거부로 시작하고, AdSense 로더가 띄우는 Google CMP가 동의를 받으면
 * consent update를 보낸다. CMP는 콘텐츠 페이지에만 있으므로(광고 정책) 그 지역 방문자는
 * /auth 같은 화면에서 쿠키 없는 핑만 남긴다 — 의도한 결과다.
 */
export function gtmBootstrapScript(gtmId: string): string {
  const granted = JSON.stringify(consentState("granted"));
  const denied = JSON.stringify({
    ...consentState("denied"),
    region: CONSENT_REQUIRED_REGIONS,
    wait_for_update: 500,
  });
  return [
    "window.dataLayer=window.dataLayer||[];",
    "function gtag(){dataLayer.push(arguments);}",
    `gtag("consent","default",${granted});`,
    `gtag("consent","default",${denied});`,
    `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({"gtm.start":new Date().getTime(),event:"gtm.js"});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!="dataLayer"?"&l="+l:"";j.async=true;j.src="https://www.googletagmanager.com/gtm.js?id="+i+dl;f.parentNode.insertBefore(j,f);})(window,document,"script","dataLayer",${JSON.stringify(gtmId)});`,
  ].join("");
}
