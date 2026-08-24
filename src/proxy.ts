import { NextResponse, type NextRequest } from "next/server";
import { AUTH_CONFIGURED, getAuth } from "@server/auth";

// Next.js 16에서 `middleware` 파일 규약이 `proxy`로 이름이 바뀌었다.
// app/ 과 같은 레벨(= src/ 바로 아래)에 있어야 인식된다.
//
// 공개 사이트라 대부분의 경로는 인증이 필요 없다. 관리자 영역만 막고,
// 나머지는 각 페이지가 getSessionUser()로 알아서 처리한다.
export default function proxy(request: NextRequest) {
  // 인증 미설정 환경에서도 사이트는 떠야 한다. /admin은 페이지 자체가 권한을 다시 보므로
  // 여기서 통과시켜도 관리자 기능이 열리지 않는다.
  if (!AUTH_CONFIGURED) return NextResponse.next();
  return getAuth().middleware({ loginUrl: "/auth/sign-in" })(request);
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*"],
};
