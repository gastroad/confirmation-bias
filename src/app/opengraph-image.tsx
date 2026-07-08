import { ImageResponse } from "next/og";
import { SITE_NAME_EN } from "@/shared/config/site";

// opengraph-image.tsx는 Next가 자동으로 og:image(및 twitter 카드)에 배선한다.
// 파일만 있으면 metadata에서 따로 참조하지 않아도 된다.
export const alt = "확증편향 — 언론사 성향별 뉴스 보도 분석";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TITLE_KO = "확증편향";
const SUBTITLE_KO = "언론사 성향별 뉴스 보도 분석";
const DOMAIN = "confirmationbias.app";

const LEANINGS_KO = [
  { label: "진보", color: "#3b82f6" },
  { label: "중도", color: "#9ca3af" },
  { label: "보수", color: "#ef4444" },
];
const LEANINGS_EN = [
  { label: "Left", color: "#3b82f6" },
  { label: "Center", color: "#9ca3af" },
  { label: "Right", color: "#ef4444" },
];

// Satori는 기본 폰트로 한글을 못 그려 글리프 에러가 난다. 필요한 글자만 서브셋으로
// Google Fonts에서 TTF로 받아 넘긴다. 실패하면 영문 카드로 폴백(렌더는 항상 성공).
async function loadKoreanFont(text: string): Promise<ArrayBuffer | null> {
  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@700&text=${encodeURIComponent(
      text
    )}`;
    // 구형 UA를 보내야 css2가 woff2 대신 Satori가 읽는 truetype을 준다.
    // 반환 URL은 확장자 없는 gstatic 링크(...&v=v39)라 format('truetype') 앞의 url만 뽑는다.
    const css = await fetch(cssUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1",
      },
    }).then((r) => r.text());
    const src = css.match(/src:\s*url\((https?:\/\/[^)]+)\)\s*format\(['"]?truetype/)?.[1];
    if (!src) return null;
    return await fetch(src).then((r) => r.arrayBuffer());
  } catch {
    return null;
  }
}

export default async function OgImage() {
  const font = await loadKoreanFont(TITLE_KO + SUBTITLE_KO + "진보중도보수");

  const title = font ? TITLE_KO : SITE_NAME_EN;
  const subtitle = font ? SUBTITLE_KO : "How outlets across the spectrum cover the same story";
  const leanings = font ? LEANINGS_KO : LEANINGS_EN;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#0a0a0a",
        padding: "80px",
      }}
    >
      <div style={{ display: "flex", gap: "32px" }}>
        {leanings.map((l) => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "26px",
                height: "26px",
                borderRadius: "6px",
                background: l.color,
              }}
            />
            <span style={{ color: "#d4d4d8", fontSize: "34px" }}>{l.label}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ color: "#fafafa", fontSize: "120px", fontWeight: 700, lineHeight: 1.1 }}>
          {title}
        </div>
        <div style={{ color: "#a1a1aa", fontSize: "44px", marginTop: "20px" }}>{subtitle}</div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div style={{ width: "48px", height: "6px", borderRadius: "3px", background: "#818cf8" }} />
        <span style={{ color: "#818cf8", fontSize: "32px" }}>{DOMAIN}</span>
      </div>
    </div>,
    {
      ...size,
      // 커스텀 폰트가 있을 때만 fonts를 넘긴다. 빈 배열을 넘기면 next/og가 기본 폰트까지
      // 비워 latin 글리프도 못 그리고 throw하므로, 폴백 시엔 키 자체를 생략한다.
      ...(font
        ? {
            fonts: [
              { name: "Noto Sans KR", data: font, weight: 700 as const, style: "normal" as const },
            ],
          }
        : {}),
    }
  );
}
