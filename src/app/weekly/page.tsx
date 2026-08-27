import type { Metadata } from "next";
import Link from "next/link";
import { getSessionUser } from "@server/auth";
import { ProfileMenu } from "@/features/profile-menu";
import { signOutAction } from "../auth/actions";
import { AdSenseLoader, Logo } from "@/shared/ui";
import {
  LeaningBar,
  LEANING_GROUP_LABELS,
  TILT_BALANCE_THRESHOLD,
  TILT_COLORS,
  tiltSide,
} from "@/entities/outlet";
import { INDEX_MIN_ARTICLES } from "@/entities/cluster";
import type { ClusterSummary } from "@/entities/cluster";
import { formatBucketDateShort } from "@/shared/lib/bucket-date";
import { SITE_NAME } from "@/shared/config/site";
import { getWeeklyReport, WEEK_DAYS, TOP_SPLIT, TOP_SHARED, SPLIT_MIN_ARTICLES } from "./_data";
import * as layout from "@/shared/styles/layout.css";
import * as styles from "./weekly.css";

export const metadata: Metadata = {
  title: "주간 리포트",
  description: `최근 ${WEEK_DAYS}일 동안 진보·보수 매체의 보도량이 가장 크게 갈린 이슈 ${TOP_SPLIT}건과, 세 진영이 모두 다룬 이슈 ${TOP_SHARED}건을 골랐습니다. 선별 기준을 함께 밝힙니다.`,
  alternates: { canonical: "/weekly" },
  openGraph: { type: "article", url: "/weekly", title: `주간 리포트 — ${SITE_NAME}` },
};

// 헤더 프로필 메뉴가 세션(쿠키)을 읽어 어차피 동적이다.
export const dynamic = "force-dynamic";

function TiltText({ tilt }: { tilt: number }) {
  const side = tiltSide(tilt);
  if (side === "balanced") return <span>균형</span>;
  const name =
    side === "progressive" ? LEANING_GROUP_LABELS.progressive : LEANING_GROUP_LABELS.conservative;
  return (
    <span style={{ color: TILT_COLORS[side] }}>
      {name} +{Math.round(Math.abs(tilt))}%p
    </span>
  );
}

function IssueList({ items }: { items: ClusterSummary[] }) {
  if (items.length === 0) {
    return <p className={styles.empty}>이 기간에는 기준을 넘긴 이슈가 없습니다.</p>;
  }
  return (
    <div className={styles.list}>
      {items.map((c, i) => (
        <Link key={c.id} href={`/clusters/${c.id}`} className={styles.item}>
          <span className={styles.rank}>{String(i + 1).padStart(2, "0")}</span>
          <span>
            <span className={styles.itemTitle}>{c.representativeTitle}</span>
            <span className={styles.itemBar}>
              <LeaningBar distribution={c.leaningDistribution} />
            </span>
            <span className={styles.itemMeta}>
              <span>
                {formatBucketDateShort(c.bucketDate)} ·{" "}
                <span className={styles.itemNum}>{c.articleCount}</span>건 ·{" "}
                <span className={styles.itemNum}>{c.outletCount}</span>개사
              </span>
              <TiltText tilt={c.tilt} />
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}

export default async function WeeklyPage() {
  const [sessionUser, report] = await Promise.all([getSessionUser(), getWeeklyReport()]);

  return (
    <div className={layout.page}>
      {report && report.clusterCount > 0 && <AdSenseLoader />}

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

      <main className={layout.container}>
        <section className={styles.intro}>
          {report && (
            <p className={styles.period}>
              {report.from} — {report.to}
            </p>
          )}
          <h2 className={styles.title}>주간 리포트</h2>
          {report ? (
            <>
              <p className={styles.lead}>
                최근 {WEEK_DAYS}일 동안 비교가 성립한 이슈{" "}
                <strong>{report.clusterCount.toLocaleString()}건</strong>(기사{" "}
                {report.articleCount.toLocaleString()}건) 가운데,{" "}
                <strong>진영 간 보도량이 가장 크게 갈린 이슈</strong>와{" "}
                <strong>세 진영이 모두 다룬 이슈</strong>를 골랐습니다.
              </p>
              <p className={styles.criteria}>
                <strong>선별 기준</strong> — 기사 {INDEX_MIN_ARTICLES}건 이상이면서 서로 다른 진영이
                2개 이상 등장한 이슈만 후보로 둡니다. 편중 목록은 여기에 더해{" "}
                <strong>기사 {SPLIT_MIN_ARTICLES}건 이상</strong>만 봅니다 — 3~4건짜리는 한 건만
                갈려도 ±75%p가 나와 수치가 과장됩니다. 그중 진보 비율 − 보수 비율(%p)이 ±
                {TILT_BALANCE_THRESHOLD}%p를 넘는 것을 절댓값이 큰 순, 동률이면 보도량이 많은 순으로
                놓습니다. 사람이 고르지 않고 이 규칙만으로 뽑습니다.
              </p>
            </>
          ) : (
            <p className={styles.lead}>아직 수집된 기사가 없습니다.</p>
          )}
        </section>

        {report && (
          <>
            <section className={styles.section}>
              <h3 className={styles.heading}>진영 간 보도량이 갈린 이슈</h3>
              <p className={styles.sectionNote}>
                한쪽이 크게 앞선 순서입니다. 막대가 중심선에서 벗어난 만큼이 그 차이입니다.
              </p>
              <IssueList items={report.split} />
            </section>

            <section className={styles.section}>
              <h3 className={styles.heading}>세 진영이 모두 다룬 이슈</h3>
              <p className={styles.sectionNote}>
                진보·중도·보수가 함께 보도한 이슈를 보도량 순으로 놓았습니다. 성향과 무관하게 무게가
                실린 사건입니다.
              </p>
              <IssueList items={report.shared} />
            </section>
          </>
        )}
      </main>
    </div>
  );
}
