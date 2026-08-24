import { AUTH_CONFIGURED, getAuth } from "@server/auth";

// 로그인·가입·OAuth 콜백·세션 갱신·이메일 인증이 전부 이 경로로 들어온다.
// 핸들러를 모듈 최상위에서 만들면 환경변수가 없는 환경의 빌드가 실패하므로 요청 시점에 만든다.
type RouteContext = { params: Promise<{ path: string[] }> };

async function handle(req: Request, ctx: RouteContext): Promise<Response> {
  if (!AUTH_CONFIGURED) {
    return Response.json({ error: "인증이 설정되지 않았습니다." }, { status: 503 });
  }
  const handler = getAuth().handler();
  return req.method === "GET" ? handler.GET(req, ctx) : handler.POST(req, ctx);
}

export { handle as GET, handle as POST };
