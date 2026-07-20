import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import Script from "next/script";
import { ThemeScript } from "@/features/theme-toggle";
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
import * as layout from "@/shared/styles/layout.css";
import { Providers } from "./providers";
import "./global.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
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
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <ThemeScript />
        {/* AdSense 로더. 이 스크립트가 광고 게재와 EEA/UK/CH 대상 CMP 동의 배너를 함께 띄운다. */}
        <Script
          id="adsbygoogle-init"
          strategy="afterInteractive"
          crossOrigin="anonymous"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
        />
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
