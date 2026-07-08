// 사이트 전역 SEO/브랜드 상수. metadata·sitemap·robots·OG 이미지·JSON-LD가
// 공유하는 단일 출처. 값을 바꾸려면 여기만 고친다.

// 프로덕션은 커스텀 도메인. 프리뷰/로컬 canonical을 맞추려면 NEXT_PUBLIC_SITE_URL로 덮어쓴다.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://confirmationbias.app"
).replace(/\/+$/, "");

export const SITE_NAME = "확증편향";
export const SITE_NAME_EN = "Confirmation Bias";

export const SITE_TITLE = "확증편향 — 언론사 성향별 뉴스 보도 분석";

export const SITE_DESCRIPTION =
  "같은 이슈를 다룬 여러 언론사의 보도를 자동으로 묶고, 매체 성향(진보·중도·보수) 분포로 시각화합니다. 하나의 사건을 진영별로 어떻게 다르게 전하는지 한눈에 비교하세요.";

export const SITE_LOCALE = "ko_KR";

export const SITE_KEYWORDS = [
  "뉴스 클러스터링",
  "언론사 성향",
  "미디어 편향",
  "확증편향",
  "진보 보수 언론",
  "뉴스 비교",
  "미디어 리터러시",
];

export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
