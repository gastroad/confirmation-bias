---
name: sync-docs
description: 코드·인프라·설정 변경을 문서에 반영합니다. 마이그레이션·의존성 교체·스크립트/환경변수 변경 등으로 README나 docs/agent/* 또는 CLAUDE.md가 현실과 어긋날 때 사용합니다.
---

# Sync Docs

코드·인프라·설정 변경 후, 그 변경과 어긋난 프로젝트 문서를 **최우선으로** 갱신합니다.
문서가 코드와 어긋나면 에이전트·사람 모두 잘못된 전제로 작업하므로, 작업 마무리에 미루지 말고
변경과 같은 흐름에서 즉시 동기화합니다.

## TRIGGER

- DB/인프라 마이그레이션, 의존성 추가·제거·교체, npm 스크립트·환경변수·설정 변경 직후.
- 사용자가 "문서 갱신", "문서 동기화", "docs 업데이트"를 요청할 때.
- 코드를 바꿨는데 README·`docs/agent/*`·`CLAUDE.md`의 서술이 더 이상 사실이 아닐 때.

## SKIP

- 순수 리팩터링·버그 수정 등 문서에 기술된 사실이 바뀌지 않는 변경.
- 새 문서를 처음 작성하는 경우(이건 일반 작성 작업).

## 절차

1. **영향 범위 탐색** — 바뀐 개념·이름·명령을 `grep`으로 찾는다. **`.claude/`를 빠뜨리지 않는다.**

   ```bash
   grep -rn "<옛 이름>" --include="*.md" --exclude-dir=node_modules .
   ```

   **코드에는 있는데 문서에 없는 것**도 찾는다(반대 방향 누락):

   ```bash
   # 예: 새 슬라이스·서비스·스크립트가 문서에 반영됐는지
   for kw in profile-menu BlockedUrl ImprovMX postinstall; do
     echo "$kw: 문서 $(grep -rl "$kw" --include='*.md' . | wc -l)곳 · 코드 $(grep -rl "$kw" src server scripts package.json 2>/dev/null | wc -l)곳"
   done
   ```

2. **갱신 대상** — 다음을 빠짐없이 점검한다.

   **상시 점검**

   - `README.md` — 기술 스택 표, 아키텍처 다이어그램, `.env` 예시, 셋업/스크립트 섹션, 언론사 목록
   - `docs/agent/architecture.md` — 데이터 흐름, 디렉토리 역할 표, **FSD 트리**(슬라이스 추가·삭제)
   - `docs/agent/infrastructure.md` — 현재 상태 표, 환경변수, Vercel 시크릿, SEO 표
   - `docs/agent/external-services.md` — **외부 서비스가 늘거나 줄면**. 시크릿 매트릭스·장애 점검 표
   - `docs/agent/workflows.md` — 명령어·셋업 절차
   - `docs/agent/conventions.md` — import 규칙·파일 위치 기준이 바뀐 경우
   - `docs/agent/launch-todo.md` — 완료 항목 `[x]` + 날짜
   - `CLAUDE.md` — Quick Rules가 바뀐 경우만 (대부분 하위 문서로 위임)

   **주제별 문서** (해당 영역을 건드렸을 때만)

   - `daily-clustering.md` — 클러스터링 알고리즘·임계값
   - `auth.md` — 인증. **SDK 의존은 `server/auth.ts` 한 파일**이라는 규칙 포함
   - `comments.md` — 댓글·승계 로직
   - `caching.md` — 캐시 위치·TTL
   - `rss-feeds.md` — 피드 목록·점검법·발췌 정책
   - `db-migration-*.md` — 이력 문서. 새로 쓰되 기존 것은 이력으로 남긴다

   **`.claude/` 도 문서다** ⚠️

   - `.claude/commands/*.md` — 명령·판단 기준이 바뀌면 (예: `run-pipeline`)
   - `.claude/skills/*/skill.md` — **아키텍처 규칙이 바뀌면 반드시.**
     스킬이 낡으면 잘못된 코드를 *생성*하므로 문서가 낡은 것보다 해롭다.
   - `.claude/settings.json` · `hooks/` — 검증 절차가 바뀌면

3. **현실과 일치시킨다** — "예정/계획"이던 항목이 실제 적용됐으면 현재형으로 바꾸고,
   완료 날짜를 남긴다. 더 이상 유효하지 않은 "향후 계획" 섹션은 제거한다.
4. **진행 문서 체크오프** — TODO/마이그레이션 체크리스트의 해당 항목을 `[x]`로,
   문서가 못 잡았던 추가 작업이 있었다면 짧게 메모로 남긴다.

## 완료 확인

- 1번의 `grep`을 **양방향으로** 다시 돌린다. stale 키워드가 남았는지 + 새 개념이 문서에 들어갔는지.
  (의도적 잔존 = 마이그레이션 문서의 롤백/이력 서술은 예외)
- **삭제된 것**을 특히 조심한다. 슬라이스를 지우면 문서 여러 곳에 이름이 남는다.
- 코드 변경과 문서가 같은 커밋에 함께 들어가는지 확인한다.
