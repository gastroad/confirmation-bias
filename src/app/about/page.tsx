import type { Metadata } from "next";
import Link from "next/link";
import { getSessionUser } from "@server/auth";
import { ProfileMenu } from "@/features/profile-menu";
import { signOutAction } from "../auth/actions";
import { Logo } from "@/shared/ui";
import {
  LEANING_ORDER,
  LEANING_LABELS,
  LEANING_COLORS,
  OUTLETS,
  TILT_BALANCE_THRESHOLD,
} from "@/entities/outlet";
import { INDEX_MIN_ARTICLES, INDEX_MIN_LEANING_GROUPS } from "@/entities/cluster";
import { SITE_NAME, CONTACT_EMAIL } from "@/shared/config/site";
import * as layout from "@/shared/styles/layout.css";
import * as styles from "./about.css";

// 방법론이 실질적으로 바뀌면(임계값·성향 분류·수집 주기) 이 날짜를 갱신한다.
const UPDATED_AT = "2026년 8월 27일";

// server/clustering/daily.ts의 DEFAULT_THRESHOLD. 그 모듈은 openai를 끌고 오므로
// 정적 페이지에서 import하지 않고 값만 옮겨 적는다. 바꾸면 여기도 같이 고친다.
const THRESHOLD = 0.62;

export const metadata: Metadata = {
  title: "소개 및 방법론",
  description: `${SITE_NAME}이 기사를 어떻게 수집·분류·비교하는지, 매체 성향을 어떤 기준으로 나눴는지, 그리고 이 방법이 무엇을 보여주지 못하는지 밝힙니다.`,
  alternates: { canonical: "/about" },
  openGraph: { type: "article", url: "/about", title: `소개 및 방법론 — ${SITE_NAME}` },
};

// 헤더 프로필 메뉴가 세션(쿠키)을 읽어 어차피 동적이다.
export const dynamic = "force-dynamic";

/** 성향 5단계와 각 단계에 속한 언론사. `OUTLETS`에서 그려 명단이 코드와 어긋나지 않게 한다. */
function OutletTable() {
  return (
    <div className={styles.outletGroups}>
      {LEANING_ORDER.filter((l) => l !== "unknown").map((leaning) => {
        const names = OUTLETS.filter((o) => o.leaning === leaning).map((o) => o.name);
        if (names.length === 0) return null;
        return (
          <div key={leaning} className={styles.outletRow}>
            <span className={styles.outletLabel}>
              <span
                className={styles.outletDot}
                style={{ background: LEANING_COLORS[leaning] }}
                aria-hidden
              />
              {LEANING_LABELS[leaning]}
            </span>
            <span className={styles.outletNames}>{names.join(" · ")}</span>
          </div>
        );
      })}
    </div>
  );
}

export default async function AboutPage() {
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
        <h1 className={styles.title}>소개 및 방법론</h1>
        <p className={styles.meta}>최종 갱신: {UPDATED_AT}</p>

        <p className={styles.lead}>
          같은 사건을 두고 언론사마다 얼마나 다르게 — 또는 얼마나 다루지 <em>않는</em> 방식으로 —
          보도하는지를 숫자로 보여주는 서비스입니다. 기사를 쓰지 않고, 이미 나온 기사들이 어떤
          분포를 이루는지만 계산합니다. 이 페이지는 <strong>그 계산이 어떻게 이뤄지는지</strong>와{" "}
          <strong>그 계산이 무엇을 보여주지 못하는지</strong>를 밝힙니다.
        </p>

        <section className={styles.section}>
          <h2 className={styles.heading}>어떻게 만들어지나</h2>
          <div className={styles.steps}>
            <div className={styles.step}>
              <span className={styles.stepNum}>1</span>
              <span className={styles.stepBody}>
                <strong className={styles.stepTitle}>수집 — 3시간마다</strong>
                언론사 {OUTLETS.length}곳이 <strong>공개한 RSS 피드</strong>의 정치 섹션을 읽어
                제목·발행 시각·원문 링크를 저장합니다. 기사 본문은 저장하지 않습니다. RSS는 항목이
                빠르게 밀려 나가므로 자주 읽어야 놓치지 않습니다.
              </span>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNum}>2</span>
              <span className={styles.stepBody}>
                <strong className={styles.stepTitle}>의미 벡터로 바꾸기</strong>
                제목과 요약문을 OpenAI <span className={styles.mono}>
                  text-embedding-3-small
                </span>{" "}
                모델로 512차원 벡터로 바꿉니다. 같은 사건을 다룬 기사는 단어가 달라도 벡터가 가까워
                집니다 — &ldquo;특검&rdquo;과 &ldquo;야당 공세&rdquo;처럼 표현이 갈려도 묶이는 건 이
                때문입니다.
              </span>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNum}>3</span>
              <span className={styles.stepBody}>
                <strong className={styles.stepTitle}>묶기 — 하루 1회, 하루치를 통째로</strong>
                한국 시간 기준 하루가 닫히면 그날 기사 전체를 <strong>응집 계층 클러스터링</strong>
                (average linkage)으로 묶습니다. 코사인 유사도 임계값은{" "}
                <span className={styles.mono}>{THRESHOLD}</span> 입니다. 더 낮추면 서로 다른 사건이
                한 덩어리가 되고, 더 높이면 하나여야 할 대형 이슈가 둘로 쪼개집니다. 세 날짜를
                0.54~0.70 구간에서 실측해 고른 값입니다.
              </span>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNum}>4</span>
              <span className={styles.stepBody}>
                <strong className={styles.stepTitle}>비교하고 문장으로 옮기기</strong>
                묶인 사건마다 어느 성향의 매체가 몇 곳 다뤘는지,{" "}
                <strong>어느 진영이 한 곳도 다루지 않았는지</strong>, 누가 먼저 썼고 다른 진영이
                얼마나 뒤에 따라왔는지를 계산해 문장으로 적습니다. 이 문장은{" "}
                <strong>규칙으로 생성</strong>하며 생성형 AI를 쓰지 않습니다.
              </span>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>매체 성향은 어떻게 나눴나</h2>
          <p className={styles.paragraph}>
            진보 · 중도진보 · 중도 · 중도보수 · 보수 <strong>5단계</strong>로 배치했습니다. 화면의
            막대와 비교 수치는 이를 진보 · 중도 · 보수 <strong>3진영</strong>으로 합쳐 계산합니다.
          </p>

          <OutletTable />

          <p className={styles.note}>
            매체별 보도량·단독 보도 비율·최초 보도 횟수는{" "}
            <Link href="/outlets" className={styles.link}>
              언론사별 보도 분석
            </Link>
            에서 볼 수 있습니다.
          </p>

          <h3 className={styles.subheading}>이 분류의 성격</h3>
          <p className={styles.paragraph}>
            이 배치는 <strong>운영자가 정한 상대적 위치</strong>입니다. 국내 언론 지형에 대한 통상적
            인식과 각 매체의 사설·논조 경향을 바탕으로 서로의 <em>상대적</em> 자리를 정한 것이며,
            특정 연구의 측정치를 그대로 옮긴 것이 아닙니다. 출처를 밝힐 수 있는 정량 지표가 아니므로{" "}
            <strong>이견이 있을 수 있고, 그 이견이 타당할 수 있습니다.</strong>
          </p>
          <p className={styles.paragraph}>
            분류는 <strong>보도 품질·신뢰도에 대한 평가가 아닙니다.</strong> 어느 칸에 놓였다는 것이
            그 매체가 더 정확하거나 덜 정확하다는 뜻이 아닙니다. 분류에 대한 의견은 {CONTACT_EMAIL}{" "}
            으로 보내주시면 검토합니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>화면을 읽는 법</h2>
          <p className={styles.paragraph}>
            막대는 <strong>폭이 아니라 위치</strong>로 그립니다. 중도 구간의 중점이 항상 화면 한가운
            데(중심선)에 오도록 막대를 밀어 두었으므로,{" "}
            <strong>막대가 어느 쪽으로 튀어나왔는지가 곧 그 사건의 보도 편중</strong>입니다.
          </p>
          <p className={styles.paragraph}>
            편향 수치는 <strong>진보 매체 비율 − 보수 매체 비율</strong>(%p)입니다. 이 값이 ±
            {TILT_BALANCE_THRESHOLD}%p 이내면 &ldquo;균형&rdquo;으로 봅니다. 이 기준은 디자인이
            아니라 서비스의 주장이므로 목록 화면에도 그대로 적어 둡니다.
          </p>
          <p className={styles.paragraph}>
            검색엔진에 노출되는 사건은{" "}
            <strong>
              기사 {INDEX_MIN_ARTICLES}건 이상, 서로 다른 진영 {INDEX_MIN_LEANING_GROUPS}개 이상
            </strong>
            이 등장한 것으로 한정합니다. 한 매체만 쓴 사건은 비교할 대상이 없어 이 서비스가 더할 수
            있는 게 없기 때문입니다. 그런 사건도 사이트에서는 그대로 볼 수 있습니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>알아 두어야 할 한계</h2>
          <p className={styles.paragraph}>
            이 서비스가 보여주는 것은{" "}
            <strong>&ldquo;우리가 수집한 RSS 피드 안에서 관찰된 분포&rdquo;</strong>이지 한국 언론
            전체의 보도량이 아닙니다. 구체적으로는 이런 한계가 있습니다.
          </p>
          <ul className={styles.list}>
            <li>
              <strong>피드에 없으면 없는 것이 됩니다.</strong> 지면·방송에는 크게 실렸는데 RSS에는
              올라오지 않는 경우가 있습니다. 그래서 요약 문장에 &ldquo;다루지 않았다&rdquo;가 아니라{" "}
              <strong>&ldquo;확인되지 않았다&rdquo;</strong>고 적습니다.
            </li>
            <li>
              <strong>정치 섹션만 봅니다.</strong> 경제·사회면에 실린 같은 사건은 잡히지 않습니다.
            </li>
            <li>
              <strong>매체 수 자체가 고르지 않습니다.</strong> 진영별 매체 수가 다르므로 &ldquo;몇
              곳이 보도했나&rdquo;는 그 진영의 매체 수에 영향을 받습니다. 비율을 함께 보시기
              바랍니다.
            </li>
            <li>
              <strong>묶기는 기계적입니다.</strong> 편집자가 검수하지 않으므로 서로 다른 사건이 한
              덩어리가 되거나, 같은 사건이 둘로 갈릴 수 있습니다.
            </li>
            <li>
              <strong>하루 단위로 끊습니다.</strong> 어제 23시 50분 기사와 오늘 0시 10분 기사는 같은
              사건이어도 다른 묶음이 됩니다. 심야에 터진 사건은 이틀에 걸쳐 나뉘어 보일 수 있습니다.
            </li>
            <li>
              <strong>보도량은 논조가 아닙니다.</strong> 많이 썼다는 것이 우호적이라는 뜻도, 적게
              썼다는 것이 비판적이라는 뜻도 아닙니다. 이 서비스는 <em>얼마나</em>를 셀 뿐{" "}
              <em>어떻게</em>를 읽지 않습니다.
            </li>
          </ul>
          <p className={styles.note}>
            이 한계들을 알고 보시라고 적어 둡니다. 숫자를 결론이 아니라{" "}
            <strong>원문을 읽어볼 출발점</strong>으로 써 주세요. 모든 사건 화면에는 각 기사의 원문
            링크가 있습니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>데이터와 문의</h2>
          <p className={styles.paragraph}>
            표시되는 모든 기사의 저작권은 각 언론사에 있습니다. 서비스는 제목과 짧은 발췌, 언론사명,
            원문 링크만 다루며 전문을 복제하지 않습니다. 자세한 내용은{" "}
            <Link href="/terms" className={styles.link}>
              이용약관
            </Link>
            과{" "}
            <Link href="/privacy" className={styles.link}>
              개인정보처리방침
            </Link>
            을 참고하세요.
          </p>
          <p className={styles.paragraph}>
            기사 표시 중단 요청, 성향 분류에 대한 의견, 그 밖의 문의는 {CONTACT_EMAIL} 으로
            보내주세요.
          </p>
        </section>
      </article>
    </div>
  );
}
