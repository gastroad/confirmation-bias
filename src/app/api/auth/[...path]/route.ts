import { auth } from "@server/auth";

// 로그인·가입·OAuth 콜백·세션 갱신·이메일 인증이 전부 이 경로로 들어온다.
export const { GET, POST } = auth.handler();
