import { cache } from "react";
import { getSessionUser } from "@server/auth";

/**
 * 요청 안에서 세션을 한 번만 읽는다.
 *
 * 셸(`_shell.tsx`)이 헤더의 프로필 메뉴를 그리려고 세션을 읽고, 본문도 같은 것을 본다
 * (관리 화면의 권한 표시·상세의 댓글 입력창). 각자 부르면 인증 서버를 두 번 왕복한다
 * (실측 ~80ms). **세션이 필요한 페이지는 `@server/auth`가 아니라 이걸 부른다.**
 */
export const getUser = cache(getSessionUser);
