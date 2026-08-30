// 시각 표기는 **KST로 고정한다.** 이 서비스의 단위가 KST 하루이고 독자도 한국에 있다.
//
// 실행 환경의 타임존을 따르면 렌더 위치에 따라 값이 갈린다 — Vercel 함수는 UTC라
// 서버 컴포넌트(기사 시각)가 9시간 이르게 나오고, 클라이언트 컴포넌트(댓글 시각)는
// 사용자 로컬로 나와 **한 페이지 안에서 기준이 둘**이 된다. 날짜 머리(2026.08.26)와
// 기사 시각(8/25 20:00)이 어긋나 보이던 것도 같은 원인이다.
//
// bucket-date.ts와 같은 방식으로, 오프셋을 더한 뒤 UTC 메서드로 읽어 환경에 의존하지 않는다.
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

const toKst = (iso: string) => new Date(new Date(iso).getTime() + KST_OFFSET_MS);

export function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "방금 전";
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

/** "2026-08-26T00:30:00Z" → "8/26 09:30" (KST). */
export function formatDate(iso: string): string {
  const d = toKst(iso);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${hh}:${mm}`;
}
