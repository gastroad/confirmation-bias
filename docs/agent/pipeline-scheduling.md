# 파이프라인 스케줄링 설계

`launch-todo.md` P0 **"RSS 수집 스케줄링"** 의 실행 설계.
RSS 수집 + 임베딩/클러스터 적재(`collect + ingest`)를 **배치로 자동 실행**한다.

## 결정 사항

| 항목        | 결정                                                                 |
| ----------- | -------------------------------------------------------------------- |
| 실행 방식   | **GitHub Actions scheduled workflow** (배치)                         |
| 주기        | 매시간 시작 → **6시간마다로 완화(2026-07-08, Supabase egress 초과)** |
| 실행처      | GitHub Actions (웹 호스팅과 분리)                                    |
| 수동 트리거 | **런칭 후** 회원가입/인증 기능과 함께 추가 (P2)                      |

## 왜 GitHub Actions 배치인가

- 파이프라인은 OpenAI를 다수 호출하는 **길고 무거운 작업** → serverless 함수 타임아웃에 부적합.
- GitHub Actions로 분리하면 **웹 호스트는 Next.js 서빙만** 담당 → 호스트(Vercel)와 완전 분리.
  무거운 배치가 Vercel serverless 타임아웃에 닿을 일이 없음.
- 레포에 이미 `.github/workflows/ci.yml`이 있어 동일한 패턴으로 확장 가능.

## 아키텍처: 워크플로우 1개 + 트리거 2개

```
워크플로우 (collect + ingest)
├─ schedule:          ← cron (6시간마다 자동) — 지금 구현
└─ workflow_dispatch: ← UI "지금 수집" 버튼 (관리자) — 런칭 후 구현
```

- 자동·수동 어느 쪽이든 무거운 작업은 **항상 GitHub Actions에서** 실행 → 웹 요청 안에서
  장시간 작업을 돌리는 문제가 원천 차단됨.

## 1차 구현 범위 (지금) — 자동 스케줄만

워크플로우가 6시간마다 다음을 수행:

1. checkout + Node setup + `npm ci`
2. `npm run db:generate`
3. `npm run collect`
4. `npm run ingest`

### 필요한 GitHub Secrets

- `OPENAI_API_KEY`
- `DATABASE_URL` — Supabase 연결 문자열 (pooler 6543). 마이그레이션 완료(2026-06-29).
  - `DIRECT_URL`은 불필요(ingest는 데이터 upsert만, DDL 없음).

> **env 로딩:** npm 스크립트는 `tsx --env-file-if-exists=.env`라 로컬은 `.env`를 읽고,
> CI는 파일이 없어도 에러 없이 워크플로우 `env:`(Secrets 주입)를 사용한다.
> 워크플로우 파일: `.github/workflows/pipeline.yml`

### cron 설정 메모

- 현재 `cron: "17 */6 * * *"` (UTC, 6시간마다). **정각(:00)은 GitHub 부하로 지연·드롭이 잦아** 피한다(공식 권장).
  - 실제로 `"0 * * * *"`로 두니 매시 실행이 통째로 스킵됨 → `:17`로 오프셋 후 해소.
  - **2026-07-08 매시간→6시간마다 완화**: Supabase egress 5GB/월 한도를 크게 초과(28GB).
    ingest centroid 인메모리 로딩 리팩터로 건당 egress를 크게 줄였으니, RSS 드롭이 우려되면
    주기를 다시 좁혀도 됨(1~3시간). 트레이드오프: 주기가 길수록 빠르게 밀려나는 RSS 항목을 놓칠 수 있음.
- 실제 작성은 Next.js/Prisma 버전 주의와 별개로 Actions YAML 표준 문법 사용.

## 알아둘 GitHub Actions 제약

- **cron 지연**: 정시에 안 돌 수 있음 (부하 시 수 분~십수 분 지연). 배치라 영향 적음.
- **자동 비활성화**: 레포에 60일간 활동 없으면 scheduled workflow가 꺼짐. 실서비스면 보통 무관.
- **무료 분**: **레포가 public(`gastroad/confirmation-bias`)이므로 무제한** → 매시간 배치에
  Actions 실행 비용·한도 제약 없음. 주기는 OpenAI 토큰 사용량만 보고 결정하면 됨.

## 비용 관점 (매시간 운영 시)

- 임베딩은 **신규 기사에만** 발생(URL 기준 upsert로 중복 차단) → 매시간 돌아도 새 기사 없으면 비용 거의 0.
- 그래도 매시간 배치이므로 **OpenAI 사용량 대시보드로 추적**하며 주기/상한을 조정한다.
  (launch-todo "OpenAI 비용 모니터링 / 상한" 항목과 연결)

## 2차 (런칭 후) — 수동 UI 트리거

> 회원가입/인증 기능 도입 이후 진행. 단독으로 하지 않는다.

- UI "지금 수집" 버튼 → Next.js API route → GitHub `workflow_dispatch` API 호출(토큰 사용)
  → 동일 워크플로우 실행.
- **반드시 관리자 전용 게이팅.** 공개 버튼은 OpenAI 비용 어뷰징 경로가 됨.
- UI는 "수집 요청됨" 표시 후 새로고침 또는 Actions run 상태 폴링.

---

## 체크리스트

### 1차 (지금)

- [x] Supabase 마이그레이션 선행 완료 (`DATABASE_URL` 확보) — 2026-06-29
- [x] 레포 visibility 확인 → **public이라 Actions 무료 분 무제한**, 주기 제약 없음
- [x] `.github/workflows/pipeline.yml` 작성 (schedule + workflow_dispatch, concurrency 가드)
- [x] GitHub Secrets에 `OPENAI_API_KEY`, `DATABASE_URL` 등록
- [x] workflow_dispatch로 수동 1회 실행해 적재 동작 확인 → 이후 매시간 자동 (2026-06-29)
- [ ] OpenAI 사용량 추적 시작 → 주기 재조정 판단 (운영 후)
- [ ] OpenAI 사용량 추적 시작 → 주기 재조정 판단

### 2차 (런칭 후, 회원가입과 함께)

- [ ] 관리자 인증 게이팅
- [ ] `workflow_dispatch` 호출 API route
- [ ] UI "지금 수집" 버튼 + 상태 표시
