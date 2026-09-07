import type { ReactNode } from "react";

import { SiteHeader, type SiteHeaderProps } from "@/widgets/site-header";
import { AdSenseLoader } from "@/shared/ui";
import * as layout from "@/shared/styles/layout.css";
import { getUser } from "./_session";
import { signOutAction } from "./auth/actions";

type ShellProps = Pick<SiteHeaderProps, "back" | "title" | "hero"> & {
  /** 읽는 글(소개·약관·방침)은 한 줄이 길어지지 않게 본문 열을 좁힌다. */
  prose?: boolean;
  /**
   * 광고를 띄울지. **콘텐츠 페이지에서, 색인 기준을 넘겼을 때만** true를 준다
   * (읽을 것이 없는 화면의 자동광고는 그 자체가 정책 위반) → shared/ui/AdSenseLoader
   */
  ads?: boolean;
  children: ReactNode;
};

/**
 * 모든 페이지가 공유하는 셸 — 세션 조회 · 헤더 · 본문 컨테이너.
 *
 * 페이지는 본문만 넘긴다. 이걸 각자 복붙하던 동안 드리프트가 났다(회원 탈퇴 화면은 헤더가
 * 통째로 빠졌고, 약관·방침·소개는 자체 컨테이너를 써 헤더·푸터와 세로줄이 어긋났다).
 *
 * `server/` 접근을 app 레이어에 가두려고 셸은 위젯이 아니라 여기 있다. 위젯은 세션을 직접
 * 읽지 않고 props로 받는다(→ widgets/site-header).
 *
 * 푸터는 여기 없다. 셸을 쓰지 않는 상태 화면(error·not-found·loading)에도 떠야 해서
 * 루트 레이아웃이 세운다 → widgets/site-footer.
 *
 * ⚠️ 이 셸은 세션 쿠키를 읽으므로 **셸을 쓰는 페이지는 전부 동적**이다. 정적 렌더를
 * 시도하다 실패하는 페이지(다른 동적 API를 쓰지 않는 화면)는 `dynamic = "force-dynamic"`을
 * 스스로 선언해야 한다 — 라우트 세그먼트 설정은 page/layout 파일에서만 읽힌다.
 */
export async function AppShell({ back, title, hero, prose, ads, children }: ShellProps) {
  const user = await getUser();

  return (
    <div className={layout.page}>
      {ads && <AdSenseLoader />}

      <SiteHeader user={user} signOut={signOutAction} back={back} title={title} hero={hero} />

      <main className={layout.container}>
        {prose ? <div className={layout.prose}>{children}</div> : children}
      </main>
    </div>
  );
}
