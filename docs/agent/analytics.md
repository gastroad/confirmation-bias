# Analytics — GTM → GA4 (2026-10-23)

## 왜 지금, 왜 GA4인가

AdSense 2차 재심사의 남은 통보 항목이 "가치가 별로 없는 콘텐츠"이고, 그 체크포인트 셋 중
**"실제적인 사용자 관심"에 대한 측정 수단이 없었다**(analytics 의존성 0, Search Console 클릭
0.25회/일 하락). 이후 모든 개선(검색·품질신고·UI)의 판단 근거가 없어 이걸 먼저 넣는다.
→ [adsense-compliance.md](./adsense-compliance.md)의 P2-1

- **GA4를 고른 이유.** (1) AdSense·Search Console과 같은 Google 계정에서 묶여 **심사 쪽에 보일
  지표**가 된다 — 측정 도구 선택이 아니라 재심사 근거를 만드는 일이다. (2) 재려는 지표가 전부
  세션 기반이다(아래 표). (3) 동의 처리는 AdSense 로더의 Google CMP가 이미 서 있다.
- **Vercel Web Analytics는 넣지 않는다.** Hobby 이벤트 한도가 있고 AdSense와 연결되지 않는다.
  둘을 같이 넣지도 않는다. (2026-10-22의 "Vercel Analytics 먼저" 판단을 이걸로 뒤집었다.)
- **GTM을 거친다.** 코드에는 컨테이너 로더만 있고 GA4 태그·트리거는 GTM 콘솔에서 관리한다.
  측정 설정을 바꾸려고 배포할 일이 없다.

## 배선

| 요소        | 위치                                       | 비고                                                           |
| ----------- | ------------------------------------------ | -------------------------------------------------------------- |
| 컨테이너 ID | `shared/config/site.ts`의 `GTM_ID`         | `GTM-MSS2QKH9` (공개값)                                        |
| 부트스트랩  | `shared/lib/gtm.ts`의 `gtmBootstrapScript` | dataLayer → 동의 기본값 → gtm.js. **순서를 테스트가 못박는다** |
| 로더        | `shared/ui/TagManager.tsx`                 | `TagManager`(script) · `TagManagerNoScript`(iframe)            |
| 렌더 위치   | `app/layout.tsx` — **루트**                | `VERCEL_ENV === "production"`에서만 렌더                       |

- **AdSense 로더와 반대로 루트에 둔다.** 광고는 읽을 것이 없는 화면에 붙는 것 자체가 정책
  위반이라 콘텐츠 페이지에만 걸지만, 측정은 동선 전체가 이어져야 진입률·재방문을 잴 수 있다.
  AdSense 규칙을 GA에 그대로 옮기지 않는다.
- **프리뷰·로컬은 아무것도 렌더하지 않는다.** 하루 클릭이 1회 미만인 지금은 운영자의 프리뷰
  방문 몇 번이 지표를 통째로 바꾼다. 로컬에서 확인하려면 `VERCEL_ENV=production npm run dev`.
- **클라이언트 내비게이션의 page_view는 GA4 향상된 측정이 잡는다**("브라우저 기록 이벤트 기반
  페이지 변경" — 기본 켜짐). 코드에서 page_view를 따로 쏘지 않는다. 다만 history 변경 시점에
  Next가 아직 `<title>`을 갈지 않았을 수 있어 **page_title이 이전 페이지 것으로 찍힐 수 있다** —
  지표는 전부 경로(`page_location`) 기준으로 잡는다.

## 동의 (Consent Mode v2)

`gtmBootstrapScript`가 GTM보다 먼저 기본값을 넣는다.

| 지역             | 기본값                                                                        |
| ---------------- | ----------------------------------------------------------------------------- |
| EEA·영국·스위스  | `ad_storage`·`ad_user_data`·`ad_personalization`·`analytics_storage` = denied |
| 그 밖(한국 포함) | 네 항목 granted                                                               |

- 동의를 받는 쪽은 **AdSense 로더가 띄우는 Google CMP**다(별도 CMP 없음). CMP가 동의를 받으면
  consent update를 보낸다. `wait_for_update: 500`은 그 업데이트를 기다리는 여유다.
- CMP는 콘텐츠 페이지에만 뜬다. 그래서 동의 지역 방문자는 `/auth` 같은 화면에서 **쿠키 없는
  핑만** 남긴다 — 의도한 결과다.
- 개인정보처리방침(`app/privacy`)의 "분석 도구"·"제3자 서비스"·"국외 이전"에 GA를 고지했다.
  **측정 범위를 넓히면(예: User-ID, 광고 신호) 방침부터 고친다.**

## 재려는 지표 — 전부 page_view 경로로 나온다

맞춤 이벤트를 두지 않는다. 아래는 GA4 탐색 분석에서 경로 조건으로 만든다.

| 지표                   | 정의                                                              |
| ---------------------- | ----------------------------------------------------------------- |
| 이슈 상세 진입률       | 세션 중 `/clusters/` page_view가 1회 이상인 세션 비율             |
| 주간 리포트 → 상세 CTR | `/weekly` 세션 중 다음 page_view가 `/clusters/`인 비율(경로 탐색) |
| 평균 탐색 이슈 수      | 세션당 `/clusters/` page_view 수                                  |
| 재방문율               | 기본 측정기준 "신규/재사용자"                                     |
| 언론사 원문 이탈       | 향상된 측정의 `click`(outbound) 이벤트                            |

## GTM·GA 콘솔에서 할 일 (코드 밖)

- [ ] GA4 속성 생성 → 웹 데이터 스트림(향상된 측정 켬, 페이지 변경 = 브라우저 기록 이벤트 포함)
- [ ] GTM 컨테이너에 **Google 태그**(측정 ID `G-…`) + 트리거 "Initialization - All Pages" → 게시
- [ ] GA4 ↔ AdSense · GA4 ↔ Search Console 연결
- [ ] **운영자 트래픽 제외** — GA4 "내부 트래픽" 정의(IP) + 데이터 필터 활성화.
      트래픽이 이만큼 적으면 운영자 방문이 지표를 지배한다.
- [ ] `/auth`·`/admin`·`/account` 제외 — 보고서·탐색의 비교/세그먼트에서 `page_location` 조건으로.
      GA4 데이터 필터는 경로 조건을 지원하지 않는다.
- [ ] 데이터 보관 기간 14개월로 상향(기본 2개월이면 탐색 분석이 두 달치만 본다)
