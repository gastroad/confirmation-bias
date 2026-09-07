import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OUTLET_MAP, buildOutletSummary } from "@/entities/outlet";
import { OutletProfileView } from "@/widgets/outlet-profile";
import { AppShell } from "../../_shell";
import { getOutletProfile, TREND_DAYS } from "../_data";

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

// 셸이 세션 쿠키를 읽어 어차피 동적이다 → app/_shell.tsx
export const dynamic = "force-dynamic";

export default async function OutletDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  if (!OUTLET_MAP[id]) notFound();

  const profile = await getOutletProfile(id);
  if (!profile) notFound();

  return (
    <AppShell back={{ href: "/outlets", label: "언론사" }} ads={profile.stats.articleCount > 0}>
      <OutletProfileView profile={profile} trendDays={TREND_DAYS} />
    </AppShell>
  );
}
