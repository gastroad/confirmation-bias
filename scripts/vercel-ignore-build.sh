#!/usr/bin/env bash
# Vercel Ignored Build Step: 검증할 내용이 없는 커밋의 프리뷰 배포를 건너뛴다.
#
# 종료 코드가 뒤집혀 있다 — Vercel 규약이다. 0 = 빌드 취소, 1 = 빌드 진행.
#
# 워크트리를 만들 때마다 draft PR 이 자동으로 열리는데(로컬 Orca 훅), PR 에는
# base 보다 앞선 커밋이 최소 하나 필요해서 빈 커밋을 하나 심는다. 트리가
# base 와 같으니 빌드해봐야 나올 게 없다. 그 한 번만 거른다.
#
# 마커는 GitHub Actions 가 공식 인식하는 것과 같은 문자열이다. 씨앗 커밋에
# 이것만 달아 두면 CI 와 프리뷰가 함께 조용해진다.
#
# draft 상태로는 판정하지 않는다. Vercel 은 PR 상태 변화에 반응하지 않아서
# (배포 트리거는 오직 push 다) draft 를 벗겨도 프리뷰가 생기지 않는다.
#
# 판정에 실패하면 빌드한다(fail-open). 배포가 조용히 빠지는 것보다 불필요한
# 배포 하나가 낫다.

set -uo pipefail

build() {
  echo "vercel-ignore: $* → 빌드합니다"
  exit 1
}
skip() {
  echo "vercel-ignore: $* → 건너뜁니다"
  exit 0
}

[ "${VERCEL_ENV:-}" = "production" ] && build "프로덕션 배포"

MSG="${VERCEL_GIT_COMMIT_MESSAGE:-}"
[ -n "$MSG" ] || build "커밋 메시지를 읽지 못했습니다"

case "$MSG" in
  *"[skip ci]"* | *"[ci skip]"* | *"[no ci]"*) skip "빌드 스킵 마커가 붙은 커밋" ;;
esac

build "일반 커밋"
