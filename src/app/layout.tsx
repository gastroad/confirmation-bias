import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_KR, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";

import { JsonLd } from "@/shared/seo/JsonLd";
import { websiteSchema } from "@/shared/seo/schemas";
import {
  SITE_URL,
  SITE_NAME,
  SITE_TITLE,
  SITE_DESCRIPTION,
  SITE_LOCALE,
  SITE_KEYWORDS,
  CONTACT_EMAIL,
  ADSENSE_CLIENT,
} from "@/shared/config/site";
import { ThemeScript } from "@/shared/ui";
import * as layout from "@/shared/styles/layout.css";
import { Providers } from "./providers";
import "./global.css";

// 한글 본문용. Geist는 latin 서브셋만 실어 한글이 전부 시스템 폰트로 떨어졌다.
const plexSansKr = IBM_Plex_Sans_KR({
  variable: "--font-plex-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// 날짜·건수·퍼센트 전용. 자릿수가 세로로 맞아야 비교가 읽힌다.
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: SITE_LOCALE,
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  formatDetection: { telephone: false, email: false, address: false },
  other: { "google-adsense-account": ADSENSE_CLIENT },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ebedf0" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0f13" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${plexSansKr.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <ThemeScript />
        {/* AdSense 로더는 여기 없다. 콘텐츠 페이지에서만 렌더한다 → shared/ui/AdSenseLoader.
            루트에 두면 /auth·/account·/admin 같은 콘텐츠 없는 화면에도 광고가 붙는다. */}
        <JsonLd data={websiteSchema()} />
        <Providers>{children}</Providers>
        <footer className={layout.footer}>
          <div className={layout.footerInner}>
            <span>
              © {new Date().getFullYear()} {SITE_NAME}
            </span>
            <nav className={layout.footerLinks}>
              <Link className={layout.footerLink} href="/">
                홈
              </Link>
              <Link className={layout.footerLink} href="/terms">
                이용약관
              </Link>
              <Link className={layout.footerLink} href="/privacy">
                개인정보처리방침
              </Link>
              <a className={layout.footerLink} href={`mailto:${CONTACT_EMAIL}`}>
                문의
              </a>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
