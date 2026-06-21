import { OUTLET_MAP } from "@/entities/outlet";

export const OUTLETS_PARAM = "outlets";

/**
 * `?outlets=chosun,hani` 값을 유효한 언론사 id 배열로 파싱한다.
 * 서버(page)와 클라이언트(OutletFilter) 양쪽에서 같은 규칙을 쓰기 위한 순수 함수.
 * - 콤마 분리, 공백 제거
 * - OUTLET_MAP에 없는 id는 버린다
 * - 중복 제거, 입력 순서 유지
 */
export function parseOutletParam(value: string | undefined | null): string[] {
  if (!value) return [];
  const seen = new Set<string>();
  for (const raw of value.split(",")) {
    const id = raw.trim();
    if (id && OUTLET_MAP[id] && !seen.has(id)) {
      seen.add(id);
    }
  }
  return [...seen];
}
