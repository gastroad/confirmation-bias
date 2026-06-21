#!/usr/bin/env bash
# Stop 훅: 코드 변경이 있을 때만 tsc/lint/test/build 검증.
# 변경이 docs/ 또는 *.md 뿐이면 건너뛴다. 실패 시 Claude에 피드백(차단).
set -uo pipefail

cd "${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}" 2>/dev/null || exit 0

# 변경 파일(스테이지/언스테이지/untracked) 경로만 추출 (porcelain은 3칸 접두 후 경로)
changed=$(git status --porcelain 2>/dev/null | cut -c4-)
[ -z "$changed" ] && exit 0 # 변경 없음 → skip

# docs/*·*.md 외 변경이 하나라도 있으면 코드 변경으로 간주
code_changed=false
while IFS= read -r f; do
  [ -z "$f" ] && continue
  case "$f" in
    docs/* | *.md) ;;
    *)
      code_changed=true
      break
      ;;
  esac
done <<<"$changed"

[ "$code_changed" = false ] && exit 0 # 문서만 변경 → skip

# 싸게 → 비싸게, fail-fast
out=$({ npx tsc --noEmit && npm run lint && npm run test:unit -- --run && npm run build; } 2>&1)
if [ $? -ne 0 ]; then
  reason=$(printf '검증 실패 (tsc/lint/test/build). 마지막 출력:\n%s' "$(printf '%s' "$out" | tail -c 3000)")
  jq -cn --arg r "$reason" '{decision:"block", reason:$r}'
fi
exit 0
