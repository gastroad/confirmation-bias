#!/usr/bin/env bash
# main 워크트리에서 프로젝트 파일을 고치는 것을 막는다.
#
# main 워크트리는 "무엇을 할지"를 정하는 자리고 작업은 /handoff 로 넘긴 워크트리가 한다
# (→ docs/agent/workflows.md). auto 모드에는 권한 프롬프트라는 멈춤 지점이 없어 판단에
# 맡기면 그냥 지나치므로, 타이밍이 아니라 **위치**로 막는다.
#
# 두 갈래로 건다. auto 모드는 파일 변경을 Bash 히어독·sed 로 하므로 Edit/Write만 막으면
# 정작 실제 경로가 통째로 새어 나간다.
#   PreToolUse (Edit|Write|NotebookEdit) — 호출 자체를 차단(exit 2)
#   PostToolUse (Bash)                   — 지면이 더러워졌으면 즉시 알린다(세션당 1회)
#
# 예외: CB_ALLOW_MAIN_EDIT=1 (사용자가 의도적으로 켤 때만)
set -uo pipefail

[ "${CB_ALLOW_MAIN_EDIT:-}" = "1" ] && exit 0

payload=$(cat)
project_dir="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}"
[ -z "$project_dir" ] && exit 0

git_dir=$(git -C "$project_dir" rev-parse --git-dir 2>/dev/null) || exit 0
case "$git_dir" in
  */worktrees/*) exit 0 ;; # 링크된 워크트리 = 작업하는 자리다. 통과
esac
case "$git_dir" in
  /*) abs_git_dir="$git_dir" ;;
  *) abs_git_dir="$project_dir/$git_dir" ;;
esac

event=$(printf '%s' "$payload" | jq -r '.hook_event_name // ""')

if [ "$event" = "PreToolUse" ]; then
  file_path=$(printf '%s' "$payload" | jq -r '.tool_input.file_path // ""')
  # 프로젝트 밖(메모리·스크래치패드)은 이 규칙과 무관하다
  case "$file_path" in
    "$project_dir"/*) ;;
    *) exit 0 ;;
  esac

  cat >&2 <<MSG
main 워크트리에서는 프로젝트 파일을 고치지 않는다 (막힌 파일: ${file_path#"$project_dir"/}).
여기는 "무엇을 할지"를 정하는 자리다. 방향이 정해졌으면 /handoff 로 워크트리에 넘기고,
이 편집은 그쪽 세션이 한다. 예외가 필요하면 사용자가 CB_ALLOW_MAIN_EDIT=1 을 켜야 한다.
MSG
  exit 2
fi

# PostToolUse(Bash): 히어독·sed·python 으로 새어 나간 변경을 뒤늦게라도 잡는다.
stamp="$abs_git_dir/claude-main-dirty-warned"
if [ -z "$(git -C "$project_dir" status --porcelain 2>/dev/null | head -1)" ]; then
  rm -f "$stamp"
  exit 0
fi
[ -f "$stamp" ] && exit 0 # 이미 알렸다. 매 호출마다 반복하지 않는다
touch "$stamp"

cat >&2 <<'MSG'
main 워크트리가 더러워졌다 — 방금 Bash로 프로젝트 파일을 고쳤을 수 있다.
여기서 작업을 이어가지 말고 멈춰라. 이어서 할 일이 코드 변경이면 /handoff 로 넘긴다.
(이미 쓴 변경은 git stash / git diff 로 확인한 뒤 사용자와 정한다.)
MSG
exit 2
