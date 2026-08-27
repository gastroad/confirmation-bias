import type { Metadata } from "next";
import Link from "next/link";
import { getSessionUser } from "@server/auth";
import { ProfileMenu } from "@/features/profile-menu";
import { signOutAction } from "../auth/actions";
import { AdSenseLoader, Logo } from "@/shared/ui";
import { OUTLET_MAP, LEANING_COLORS, sortOutletsByVolume, ratioPercent } from "@/entities/outlet";
import { SITE_NAME } from "@/shared/config/site";
import { getOutletStats } from "./_data";
import * as layout from "@/shared/styles/layout.css";
import * as styles from "./outlets.css";

export const metadata: Metadata = {
  title: "언론사별 보도 분석",
  description: `${SITE_NAME}이 수집하는 언론사별 보도량, 단독 보도 비율, 최초 보도 횟수를 비교합니다. 어느 매체가 얼마나 쓰고 무엇을 혼자 쓰는지 한눈에 보세요.`,
  alternates: { canonical: "/outlets" },
  openGraph: { type: "website", url: "/outlets", title: `언론사별 보도 분석 — ${SITE_NAME}` },
};

// 헤더 프로필 메뉴가 세션(쿠키)을 읽어 어차피 동적이다.
export const dynamic = "force-dynamic";

export default async function OutletsPage() {
  const [sessionUser, stats] = await Promise.all([getSessionUser(), getOutletStats()]);
  const rows = sortOutletsByVolume(stats);
  const active = rows.filter((s) => s.articleCount > 0);

  return (
    <div className={layout.page}>
      {active.length > 0 && <AdSenseLoader />}

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
          <h2 className={styles.title}>언론사별 보도 분석</h2>
          <p className={styles.lead}>
            수집 대상 {rows.length}곳의 보도량과 <strong>단독 보도 비율</strong>, 그리고{" "}
            <strong>이슈를 가장 먼저 꺼낸 횟수</strong>를 비교합니다. 많이 쓴다고 의제를 이끄는 것은
            아니고, 적게 써도 남들이 안 쓰는 걸 쓰는 매체가 있습니다. 분류 기준은{" "}
            <Link href="/about" className={styles.link}>
              방법론
            </Link>
            에 밝혀 두었습니다.
          </p>
        </section>

        <div className={styles.list}>
          {rows.map((s) => {
            const outlet = OUTLET_MAP[s.outletId];
            if (!outlet) return null;
            return (
              <Link key={s.outletId} href={`/outlets/${s.outletId}`} className={styles.row}>
                <span>
                  <span className={styles.nameLine}>
                    <span
                      className={styles.dot}
                      style={{ background: LEANING_COLORS[outlet.leaning] }}
                      aria-hidden
                    />
                    <span className={styles.name}>{outlet.name}</span>
                    <span className={styles.leaningLabel}>{outlet.leaningLabel}</span>
                  </span>
                  {s.articleCount === 0 ? (
                    <span className={styles.inactive}>수집된 기사 없음</span>
                  ) : (
                    <span className={styles.rowMeta}>
                      기사 <span className={styles.rowNum}>{s.articleCount.toLocaleString()}</span>
                      건 · 이슈{" "}
                      <span className={styles.rowNum}>{s.clusterCount.toLocaleString()}</span>개 ·
                      단독{" "}
                      <span className={styles.rowNum}>
                        {ratioPercent(s.soloCount, s.clusterCount)}
                      </span>
                      % · 최초{" "}
                      <span className={styles.rowNum}>{s.firstMoverCount.toLocaleString()}</span>건
                    </span>
                  )}
                </span>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
