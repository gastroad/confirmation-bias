import type { Metadata } from "next";
import Link from "next/link";
import { ThemeToggle } from "@/features/theme-toggle";
import { Logo } from "@/shared/ui";
import { SITE_NAME, CONTACT_EMAIL } from "@/shared/config/site";
import * as layout from "@/shared/styles/layout.css";
import * as styles from "./privacy.css";

// 시행일. 방침 내용을 실질적으로 바꾸면 이 날짜를 갱신한다.
const EFFECTIVE_DATE = "2026년 7월 20일";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: `${SITE_NAME}의 개인정보 수집·이용·쿠키 및 광고(Google AdSense)에 관한 처리방침입니다.`,
  alternates: { canonical: "/privacy" },
  openGraph: { type: "article", url: "/privacy", title: `개인정보처리방침 — ${SITE_NAME}` },
};

export default function PrivacyPage() {
  return (
    <div className={layout.page}>
      <header className={layout.header}>
        <div className={layout.headerInner}>
          <Link href="/" className={layout.backLink}>
            ← 홈
          </Link>
          <span className={layout.divider}>|</span>
          <Logo size={20} className={layout.logo} />
          <h1 className={layout.brandSmall}>확증편향</h1>
          <div className={layout.headerActions}>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <article className={styles.article}>
        <h1 className={styles.title}>개인정보처리방침</h1>
        <p className={styles.meta}>시행일: {EFFECTIVE_DATE}</p>

        <p className={styles.lead}>
          {SITE_NAME}(&ldquo;서비스&rdquo;)는 이용자의 개인정보를 소중히 다룹니다. 본 방침은
          서비스가 어떤 정보를 수집하고, 쿠키와 광고를 어떻게 사용하며, 이용자가 어떤 권리를 갖는지
          설명합니다.
        </p>

        <section className={styles.section}>
          <h2 className={styles.heading}>1. 수집하는 정보</h2>
          <p className={styles.paragraph}>
            서비스는 <strong>회원가입·로그인 기능이 없으며</strong>, 이용자가 이름·연락처 등
            개인식별정보를 직접 입력하도록 요구하지 않습니다. 다만 다음 정보가 자동으로 수집·처리될
            수 있습니다.
          </p>
          <ul className={styles.list}>
            <li>
              접속 로그: IP 주소, 브라우저·기기 정보(User-Agent), 방문 페이지·시각 (호스팅 및 보안
              목적)
            </li>
            <li>쿠키 및 유사 기술: 아래 &ldquo;쿠키와 광고&rdquo; 참조</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>2. 쿠키와 광고 (Google AdSense)</h2>
          <p className={styles.paragraph}>
            서비스는 Google AdSense를 통해 광고를 게재합니다. Google 및 그 파트너는 쿠키를 사용해
            이용자의 이전 방문 기록을 바탕으로 광고를 제공할 수 있습니다.
          </p>
          <ul className={styles.list}>
            <li>
              유럽 경제 지역(EEA)·영국·스위스 이용자에게는{" "}
              <strong>Google 인증 동의 관리 플랫폼(CMP)</strong>을 통해 개인화 광고·쿠키에 대한
              동의를 받습니다. 동의는 언제든지 변경하거나 철회할 수 있습니다.
            </li>
            <li>
              개인화 광고는{" "}
              <a
                className={styles.link}
                href="https://www.google.com/settings/ads"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google 광고 설정
              </a>
              에서 끌 수 있습니다.
            </li>
            <li>
              제3자 공급업체의 쿠키 사용에 관한 내용은{" "}
              <a
                className={styles.link}
                href="https://policies.google.com/technologies/partner-sites"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google의 파트너 사이트 정책
              </a>
              을 참고하세요.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>3. 분석 도구</h2>
          <p className={styles.paragraph}>
            현재 서비스는 별도의 웹 분석(애널리틱스) 도구를 사용하지 않습니다. 향후 트래픽 측정
            목적으로 분석 도구를 도입할 경우, 관련 쿠키는 동의를 기반으로 사용되며 본 방침을 갱신해
            고지합니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>4. 제3자 서비스</h2>
          <p className={styles.paragraph}>서비스는 다음 외부 제공업체를 이용합니다.</p>
          <ul className={styles.list}>
            <li>Google AdSense — 광고 게재 및 관련 쿠키</li>
            <li>Vercel — 웹 호스팅 및 접속 로그 처리</li>
            <li>Supabase — 뉴스 기사·클러스터 데이터 저장(개인정보 아님)</li>
          </ul>
          <p className={styles.paragraph}>
            서비스가 표시하는 뉴스 기사 링크는 각 언론사의 외부 사이트로 연결되며, 해당 사이트의
            개인정보 처리에는 각 사이트의 정책이 적용됩니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>5. 데이터 보관 및 국외 이전</h2>
          <p className={styles.paragraph}>
            접속 로그 및 쿠키 데이터는 위 제3자 서비스가 각자의 정책에 따라 보관합니다. 이 과정에서
            데이터가 국외 서버에 저장·처리될 수 있습니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>6. 이용자의 권리</h2>
          <p className={styles.paragraph}>
            이용자는 관련 법령(EU GDPR, 대한민국 개인정보 보호법 등)에 따라 자신의 개인정보에 대한
            열람, 정정, 삭제, 처리 제한 및 동의 철회를 요청할 수 있습니다. 요청은 아래 문의처로
            보내주시기 바랍니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>7. 아동의 개인정보</h2>
          <p className={styles.paragraph}>
            서비스는 만 14세 미만 아동을 대상으로 하지 않으며, 아동의 개인정보를 고의로 수집하지
            않습니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>8. 방침의 변경</h2>
          <p className={styles.paragraph}>
            본 방침은 법령·서비스 변경에 따라 개정될 수 있으며, 개정 시 본 페이지에 게시합니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>9. 문의처</h2>
          <p className={styles.paragraph}>
            개인정보 처리에 관한 문의는{" "}
            <a className={styles.link} href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>{" "}
            로 연락해 주세요.
          </p>
        </section>
      </article>
    </div>
  );
}
