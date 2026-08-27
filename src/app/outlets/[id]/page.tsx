import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUser } from "@server/auth";
import { ProfileMenu } from "@/features/profile-menu";
import { signOutAction } from "../../auth/actions";
import { AdSenseLoader, Logo } from "@/shared/ui";
import { OUTLET_MAP, buildOutletSummary } from "@/entities/outlet";
import { OutletProfileView } from "@/widgets/outlet-profile";
import { SITE_NAME } from "@/shared/config/site";
import { getOutletProfile, TREND_DAYS } from "../_data";
import * as layout from "@/shared/styles/layout.css";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const outlet = OUTLET_MAP[id];
  if (!outlet) return { title: "찾을 수 없는 언론사", robots: { index: false, follow: false } };

  const profile = await getOutletProfile(id);
  const title = `${outlet.name} 보도 분석`;
  const description = profile
    ? buildOutletSummary(profile)
    : `${outlet.name}의 보도량과 단독 보도 비율을 봅니다.`;

  return {
    title,
    description,
    alternates: { canonical: `/outlets/${id}` },
    openGraph: { type: "profile", url: `/outlets/${id}`, title, description },
    twitter: { card: "summary_large_image", title, description },
    // 기사가 한 건도 없는 매체는 보여줄 집계가 없다. 페이지는 열되 색인에서만 뺀다.
    ...(profile && profile.stats.articleCount > 0
      ? {}
      : { robots: { index: false, follow: true } }),
  };
}

// 헤더 프로필 메뉴가 세션(쿠키)을 읽어 어차피 동적이다.
export const dynamic = "force-dynamic";

export default async function OutletDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  if (!OUTLET_MAP[id]) notFound();

  const [sessionUser, profile] = await Promise.all([getSessionUser(), getOutletProfile(id)]);
  if (!profile) notFound();

  const hasContent = profile.stats.articleCount > 0;

  return (
    <div className={layout.page}>
      {hasContent && <AdSenseLoader />}

      <header className={layout.header}>
        <div className={layout.headerInner}>
          <Link href="/outlets" className={layout.backLink}>
            ← 언론사
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
        <OutletProfileView profile={profile} trendDays={TREND_DAYS} />
      </main>
    </div>
  );
}
