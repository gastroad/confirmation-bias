// article 전용 공개 API. 기사는 언론사를 **표시하기만** 하므로 메타데이터 타입 하나면 된다.
// 성향 계산·레지스트리·UI는 열지 않는다. → docs/agent/conventions.md "cross-entity"
export type { OutletMetadata } from "../model";
