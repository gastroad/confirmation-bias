import type { Metadata } from "next";
import Link from "next/link";
import { getSessionUser } from "@server/auth";
import { ProfileMenu } from "@/features/profile-menu";
import { signOutAction } from "../auth/actions";
import { Logo } from "@/shared/ui";
import { SITE_NAME, CONTACT_EMAIL } from "@/shared/config/site";
import * as layout from "@/shared/styles/layout.css";
import * as styles from "./terms.css";

// 시행일. 약관 내용을 실질적으로 바꾸면 이 날짜를 갱신한다.
const EFFECTIVE_DATE = "2026년 8월 24일";

export const metadata: Metadata = {
  title: "이용약관",
  description: `${SITE_NAME} 서비스 이용에 관한 약관입니다.`,
  alternates: { canonical: "/terms" },
  openGraph: { type: "article", url: "/terms", title: `이용약관 — ${SITE_NAME}` },
};

// 헤더 프로필 메뉴가 세션(쿠키)을 읽어 어차피 동적이다.
export const dynamic = "force-dynamic";

export default async function TermsPage() {
  const sessionUser = await getSessionUser();

  return (
    <div className={layout.page}>
      <header className={layout.header}>
        <div className={layout.headerInner}>
          <Link href="/" className={layout.backLink}>
            ← 홈
          </Link>
          <span className={layout.divider}>|</span>
          <Logo size={20} className={layout.logo} />
          <h1 className={layout.brandSmall}>{SITE_NAME}</h1>
          <div className={layout.headerActions}>
            <ProfileMenu user={sessionUser} signOut={signOutAction} />
          </div>
        </div>
      </header>

      <article className={styles.article}>
        <h1 className={styles.title}>이용약관</h1>
        <p className={styles.meta}>시행일: {EFFECTIVE_DATE}</p>

        <p className={styles.lead}>
          본 약관은 {SITE_NAME}(이하 &ldquo;서비스&rdquo;)의 이용 조건과 절차, 이용자와 서비스의
          권리·의무를 정합니다. 서비스를 이용하면 본 약관에 동의한 것으로 봅니다.
        </p>

        <section className={styles.section}>
          <h2 className={styles.heading}>1. 서비스의 성격</h2>
          <p className={styles.paragraph}>
            서비스는 국내 언론사가 공개한 RSS 피드를 수집해, 같은 사건을 다룬 기사를 자동으로 묶고
            매체 성향별 보도 분포를 보여주는 <strong>분석 도구</strong>입니다. 서비스는 기사를 직접
            생산하지 않으며 언론사가 아닙니다.
          </p>
          <p className={styles.paragraph}>
            기사 묶음과 대표 제목은 <strong>기계적으로 생성</strong>됩니다. 편집자의 판단이 개입하지
            않으므로 부정확하거나 무관한 기사가 함께 묶일 수 있습니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>2. 기사 저작권과 인용 범위</h2>
          <p className={styles.paragraph}>
            서비스가 표시하는 기사의 저작권은 <strong>각 언론사에 있습니다</strong>. 서비스는 제목과
            짧은 발췌(최대 300자), 언론사명, 원문 링크만 표시하며 전문을 복제하거나 저장하지
            않습니다.
          </p>
          <p className={styles.paragraph}>
            기사 전문은 각 언론사 웹사이트에서 확인하시기 바랍니다. 저작권자가 표시 중단을 요청하면
            지체 없이 해당 기사를 제외합니다. 요청은 {CONTACT_EMAIL} 으로 보내주세요.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>3. 매체 성향 분류에 대하여</h2>
          <p className={styles.paragraph}>
            서비스가 표시하는 진보·중도·보수 분류는 미디어 연구를 참고한{" "}
            <strong>상대적 위치 표시</strong>이며, 특정 매체의 신뢰도나 보도 품질에 대한 평가가
            아닙니다. 절대적 기준이 아니며 이견이 있을 수 있습니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>4. 회원가입과 계정</h2>
          <p className={styles.paragraph}>
            뉴스 열람은 <strong>로그인 없이</strong> 이용할 수 있습니다. 댓글 작성 등 일부 기능만
            회원가입이 필요합니다.
          </p>
          <ul className={styles.list}>
            <li>계정 정보는 정확하게 입력해야 하며, 타인의 정보를 도용해서는 안 됩니다.</li>
            <li>계정 관리 책임은 이용자에게 있습니다. 비밀번호를 타인과 공유하지 마세요.</li>
            <li>
              언제든지{" "}
              <Link href="/account/delete" className={styles.link}>
                회원 탈퇴
              </Link>
              할 수 있습니다. 탈퇴 시 계정 정보는 파기되며, 작성한 댓글은 본문만 남고 작성자 표시가
              &ldquo;탈퇴한 사용자&rdquo;로 바뀝니다.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>5. 댓글 등 이용자 게시물</h2>
          <p className={styles.paragraph}>
            이용자가 작성한 댓글의 책임은 <strong>작성자 본인</strong>에게 있습니다. 다음에 해당하는
            게시물은 사전 통지 없이 삭제될 수 있습니다.
          </p>
          <ul className={styles.list}>
            <li>타인의 명예를 훼손하거나 모욕하는 내용</li>
            <li>차별·혐오를 조장하거나 폭력을 선동하는 내용</li>
            <li>타인의 개인정보를 무단으로 공개하는 내용</li>
            <li>저작권 등 타인의 권리를 침해하는 내용</li>
            <li>광고·홍보 목적의 반복 게시(스팸)</li>
            <li>서비스의 정상적인 운영을 방해하는 내용</li>
          </ul>
          <p className={styles.paragraph}>
            서비스는 게시물을 사전 검열하지 않으며, 신고나 인지에 따라 사후적으로 조치합니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>6. 금지 행위</h2>
          <ul className={styles.list}>
            <li>자동화된 수단으로 서비스에 과도한 부하를 주는 행위</li>
            <li>서비스의 데이터를 무단으로 대량 수집(크롤링)하거나 재배포하는 행위</li>
            <li>서비스의 취약점을 악용하거나 정상적인 운영을 방해하는 행위</li>
            <li>타인의 계정에 무단으로 접근하려는 행위</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>7. 서비스의 변경과 중단</h2>
          <p className={styles.paragraph}>
            서비스는 개인이 운영하는 비상업적 프로젝트로, 기능이 예고 없이 변경되거나 서비스가
            중단될 수 있습니다. 이 경우 이용자에게 별도의 보상을 하지 않습니다.
          </p>
          <p className={styles.paragraph}>
            언론사의 RSS 제공 중단, 외부 서비스 정책 변경 등 서비스가 통제할 수 없는 사유로 수집이
            멈추거나 데이터가 누락될 수 있습니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>8. 책임의 한계</h2>
          <p className={styles.paragraph}>
            서비스는 표시되는 정보의 정확성·완전성·최신성을 보증하지 않습니다. 기사 묶음이
            기계적으로 생성되는 만큼 오분류가 발생할 수 있으며, 이를 근거로 한 이용자의 판단과 그
            결과에 대해 서비스는 책임지지 않습니다.
          </p>
          <p className={styles.paragraph}>
            다만 서비스의 고의 또는 중대한 과실로 발생한 손해에 대한 책임은 제한하지 않습니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>9. 약관의 변경</h2>
          <p className={styles.paragraph}>
            약관이 변경되면 본 페이지에 게시하고 시행일을 갱신합니다. 변경된 약관에 동의하지 않으면
            이용을 중단하고 탈퇴할 수 있습니다. 변경 이후에도 서비스를 계속 이용하면 변경에 동의한
            것으로 봅니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>10. 문의</h2>
          <p className={styles.paragraph}>
            약관에 대한 문의, 기사 표시 중단 요청, 게시물 신고는 {CONTACT_EMAIL} 으로 보내주세요.
          </p>
          <p className={styles.paragraph}>
            개인정보의 수집·이용에 관한 사항은{" "}
            <Link href="/privacy" className={styles.link}>
              개인정보처리방침
            </Link>
            을 참고하세요.
          </p>
        </section>
      </article>
    </div>
  );
}
