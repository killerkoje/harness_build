#!/bin/bash
# AX 팀 공통 패턴을 프로젝트 .harness/patterns/team/ 에 동기화
#
# 사용법:
#   bash scripts/sync-team-patterns.sh                  # 현재 디렉토리
#   bash scripts/sync-team-patterns.sh /path/to/project
#   TEAM_PATTERNS_ROOT=/path/to/ax-patterns bash scripts/sync-team-patterns.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HARNESS_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TARGET="${1:-$(pwd)}"

# 별도 중앙 레포를 쓸 때 (향후 ax-patterns 분리 시)
PATTERNS_SRC="${TEAM_PATTERNS_ROOT:-$HARNESS_ROOT/team-patterns}"

if [ ! -d "$PATTERNS_SRC/patterns" ]; then
  echo "오류: 팀 패턴 소스를 찾을 수 없습니다 → $PATTERNS_SRC/patterns"
  exit 1
fi

if [ ! -d "$TARGET" ]; then
  echo "오류: 대상 경로가 없습니다 → $TARGET"
  exit 1
fi

TEAM_DIR="$TARGET/.harness/patterns/team"
LOCAL_DIR="$TARGET/.harness/patterns/local"

mkdir -p "$TEAM_DIR" "$LOCAL_DIR"

echo "→ 팀 패턴 동기화: $PATTERNS_SRC → $TEAM_DIR"
cp -R "$PATTERNS_SRC/patterns/"* "$TEAM_DIR/"

if [ -f "$PATTERNS_SRC/VERSION" ]; then
  cp "$PATTERNS_SRC/VERSION" "$TEAM_DIR/.version"
fi

# local/ git 추적용 placeholder
touch "$LOCAL_DIR/.gitkeep"

VERSION=$(cat "$PATTERNS_SRC/VERSION" 2>/dev/null || echo "unknown")
echo "완료: team-patterns v$VERSION → $TEAM_DIR"
