// 구조화 데이터(schema.org JSON-LD)를 <script>로 주입하는 서버 컴포넌트.
// data는 서버에서 만든 신뢰된 객체만 넘긴다(사용자 입력 직렬화 아님) → XSS 위험 없음.
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}
