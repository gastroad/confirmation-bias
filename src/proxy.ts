import { auth } from "@server/auth";

// Next.js 16에서 `middleware` 파일 규약이 `proxy`로 이름이 바뀌었다.
// app/ 과 같은 레벨(= src/ 바로 아래)에 있어야 인식된다.
//
// 공개 사이트라 대부분의 경로는 인증이 필요 없다. 관리자 영역만 막고,
// 나머지는 각 페이지가 getSessionUser()로 알아서 처리한다.
export default auth.middleware({ loginUrl: "/auth/sign-in" });

export const config = {
  matcher: ["/admin/:path*"],
};
