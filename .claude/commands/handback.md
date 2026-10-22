---
description: 머지가 끝난 워크트리의 결과를 /handoff 했던 원래 세션에 돌려보냅니다.
---

# Handback

`/handoff`의 반대 방향입니다. 넘겨받은 작업이 **머지까지 끝났을 때**, 이 워크트리를 띄운
원래 세션(보통 main 워크트리)에 결과를 돌려보내 다음 판단을 이어가게 합니다.

**워크트리를 여기서 지우지 않습니다.** 지우면 이 세션이 서 있는 디렉토리가 사라지고, 보고가
닿기 전에 세션이 끊길 수 있습니다. `git pull`은 어차피 main 워크트리에서 해야 하므로 정리는
받는 쪽이 합니다.

## 절차

### 1. 머지를 확인한다

```bash
gh pr view --json number,url,state,mergedAt,title
```

`state`가 `MERGED`가 아니면 **여기서 멈추고** 사용자에게 알립니다. 머지 전에 돌려보내면
받는 쪽이 머지되지 않은 브랜치를 정리하려다 실패합니다(`worktree rm`은 머지가 증명된 브랜치만 지운다).

### 2. 원래 세션을 찾는다

`/handoff`가 쓰는 `orca worktree create`는 **어느 터미널이 이 워크트리를 만들었는지** 기록해 둔다.

```bash
orca worktree current --json
```

- `result.worktree.lineage.createdByTerminalHandle` — 넘긴 세션의 터미널 핸들
- `result.worktree.lineage.parentWorktreeId` — 그 세션의 워크트리(`<repoId>::<path>`)
- `result.worktree.branch` — 받는 쪽이 정리할 브랜치(`refs/heads/` 접두어는 뗀다)

그 터미널이 아직 살아 있는지 본다.

```bash
orca terminal list --worktree "id:<parentWorktreeId>" --json
```

- 목록에 그 핸들이 있으면 그것이 받는 곳이다.
- **없으면 추측하지 않는다.** Orca를 재시작하면 핸들이 바뀐다. 부모 워크트리의 터미널 목록(제목 포함)을
  사용자에게 보여주고 어디로 보낼지 묻는다.
- lineage 자체가 없으면(`/handoff` 없이 만든 워크트리) 돌려보낼 곳이 없다. 그 사실을 알리고 멈춘다.

### 3. 보고를 쓴다

받는 쪽은 **"무엇을 할지"를 정하는 세션**이다. 그쪽에 필요한 것은 작업 일지가 아니라 다음 판단의 재료다.
자세한 내용은 이미 PR 본문에 있으므로 PR을 가리키고, 거기 없는 것만 적는다.

- 쓸 것: PR 번호·URL, 무엇이 바뀌었는지 한 줄, **코드 밖에서 직접 한 일**(운영 DB 쓰기·백필·외부 설정),
  **남은 판단**(하지 않기로 한 것 중 다시 볼 것, 측정하다 나온 의외의 사실), 정리 명령
- 쓰지 않을 것: 변경 파일 목록, 구현 세부, 테스트 개수 — PR에 있다

**한 줄로 쓴다(줄바꿈 금지).** `terminal send`는 받는 쪽 TUI에 글자를 타이핑하는 것이라 줄바꿈이
중간에 입력을 끊을 수 있다. 항목은 ` / `로 나눈다. 형식:

```
[handback] <브랜치> 작업이 머지됐습니다(PR #<번호> <URL>). <바뀐 것 한 줄> / 직접 한 일: <…> / 남은 판단: <…> / 정리: main 워크트리에서 git pull 후 orca worktree rm --worktree branch:<브랜치>
```

### 4. 사용자에게 확인받는다

받을 터미널(핸들·제목)과 보낼 문장을 그대로 보여주고 승인을 받습니다.
다른 세션에 입력을 넣는 일이므로 **승인 없이 보내지 않습니다.**

### 5. 보낸다

받는 쪽이 지금 무엇을 하는지 먼저 본다(입력 중인 글자가 있으면 거기에 이어 붙는다).

```bash
orca terminal read --terminal <handle> --json
```

입력창이 비어 있지 않거나 사용자가 그 세션에 무언가 쓰는 중이면 보내지 말고 사용자에게 알린다.
턴이 돌고 있는 중이면 보내도 된다(Claude Code가 다음 입력으로 받아 둔다).

```bash
orca terminal send --terminal <handle> --text "<보고 한 줄>" --enter --wait-submit 10 --json
```

- `accepted: true`면 전달된 것이다. 응답이 없다고 **다시 보내지 않는다** — 같은 보고가 두 번 들어간다.
  전송 자체가 모호하게 실패했으면 결과에 나온 `--retry-request <id>`를 붙여 같은 명령을 다시 낸다.

### 6. 보고하고 끝낸다

어느 터미널로 보냈는지와 receipt 상태를 알리고 멈춥니다. 받는 쪽의 진행을
`terminal read`·`terminal wait`로 지켜보지 않습니다 — 소유권은 이제 그쪽에 있습니다.
