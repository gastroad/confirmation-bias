# 파이프라인 스케줄링 설계

`launch-todo.md` P0 **"RSS 수집 스케줄링"** 의 실행 설계.
RSS 수집 + 임베딩/클러스터 적재(`collect + ingest`)를 **배치로 자동 실행**한다.

## 결정 사항

| 항목        | 결정                                                       |
| ----------- | ---------------------------------------------------------- |
| 실행 방식   | **GitHub Actions scheduled workflow** (배치)               |
| 주기        | **매시간** 시작 → **토큰 사용량 보고 2~3시간 등으로 조정** |
| 실행처      | GitHub Actions (웹 호스팅과 분리)                          |
| 수동 트리거 | **런칭 후** 회원가입/인증 기능과 함께 추가 (P2)            |

## 왜 GitHub Actions 배치인가

- 파이프라인은 OpenAI를 다수 호출하는 **길고 무거운 작업** → serverless 함수 타임아웃에 부적합.
- GitHub Actions로 분리하면 **웹 호스트는 Next.js 서빙만** 담당 → 호스트 선택이 자유로움
  (Vercel 제외, Railway/Render/Netlify 등 무엇이든).
- 레포에 이미 `.github/workflows/ci.yml`이 있어 동일한 패턴으로 확장 가능.

## 아키텍처: 워크플로우 1개 + 트리거 2개

```
워크플로우 (collect + ingest)
├─ schedule:          ← cron (매시간 자동) — 지금 구현
└─ workflow_dispatch: ← UI "지금 수집" 버튼 (관리자) — 런칭 후 구현
```

- 자동·수동 어느 쪽이든 무거운 작업은 **항상 GitHub Actions에서** 실행 → 웹 요청 안에서
  장시간 작업을 돌리는 문제가 원천 차단됨.

## 1차 구현 범위 (지금) — 자동 스케줄만

워크플로우가 매시간 다음을 수행:

1. checkout + Node setup + `npm ci`
2. `npm run db:generate`
3. `npm run collect`
4. `npm run ingest`

### 필요한 GitHub Secrets

- `OPENAI_API_KEY`
- `DATABASE_URL` — Supabase 연결 문자열 (마이그레이션 완료 후)
  - 마이그레이션은 [db-migration-supabase.md](./db-migration-supabase.md) 참조.

### cron 설정 메모

- 매시간: `cron: "0 * * * *"` (UTC 기준 — KST 표기와 무관, 매시간이라 영향 적음)
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

- [ ] Supabase 마이그레이션 선행 완료 (`DATABASE_URL` 확보)
- [x] 레포 visibility 확인 → **public이라 Actions 무료 분 무제한**, 주기 제약 없음
- [ ] `.github/workflows/`에 scheduled 워크플로우 작성 (schedule + workflow_dispatch 둘 다 선언)
- [ ] GitHub Secrets에 `OPENAI_API_KEY`, `DATABASE_URL` 등록
- [ ] 매시간 자동 실행 + 적재 동작 확인
- [ ] OpenAI 사용량 추적 시작 → 주기 재조정 판단

### 2차 (런칭 후, 회원가입과 함께)

- [ ] 관리자 인증 게이팅
- [ ] `workflow_dispatch` 호출 API route
- [ ] UI "지금 수집" 버튼 + 상태 표시
