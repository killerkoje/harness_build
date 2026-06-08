#!/bin/bash

# harness_build 설치 스크립트
# 사용법:
#   bash install.sh                  ← 현재 디렉토리에 설치
#   bash install.sh /path/to/project ← 지정 경로에 설치

set -e

HARNESS_ROOT="$(cd "$(dirname "$0")" && pwd)"
TARGET="${1:-$(pwd)}"

echo ""
echo "harness_build 설치 시작"
echo "─────────────────────────────────"
echo "하네스 경로: $HARNESS_ROOT"
echo "대상 프로젝트: $TARGET"
echo ""

# 대상 경로 존재 확인
if [ ! -d "$TARGET" ]; then
  echo "오류: 대상 경로가 존재하지 않습니다 → $TARGET"
  exit 1
fi

# .claude/ 폴더가 이미 있으면 확인
if [ -d "$TARGET/.claude" ]; then
  echo ".claude/ 폴더가 이미 존재합니다. 덮어쓰시겠습니까? (y/n)"
  read -r confirm
  if [ "$confirm" != "y" ]; then
    echo "설치를 취소했습니다."
    exit 0
  fi
fi

# 1. .claude/ 복사
echo "→ .claude/ 복사 중..."
cp -r "$HARNESS_ROOT/harness_global/.claude" "$TARGET/"

# 2. 컨벤션 문서 복사
echo "→ REACT_NEXT_CONVENTIONS.md 복사 중..."
cp "$HARNESS_ROOT/harness_global/REACT_NEXT_CONVENTIONS.md" "$TARGET/"

# 3. CLAUDE.md 처리
if [ -f "$TARGET/CLAUDE.md" ]; then
  echo "→ CLAUDE.md 기존 파일에 append 중..."
  echo "" >> "$TARGET/CLAUDE.md"
  echo "---" >> "$TARGET/CLAUDE.md"
  cat "$HARNESS_ROOT/harness_global/CLAUDE.md" >> "$TARGET/CLAUDE.md"
else
  echo "→ CLAUDE.md 생성 중..."
  cp "$HARNESS_ROOT/harness_global/CLAUDE.md" "$TARGET/CLAUDE.md"
fi

echo ""
echo "─────────────────────────────────"
echo "설치 완료! → $TARGET"
echo ""
echo "이제 해당 프로젝트에서 Claude Code를 열고:"
echo "  low/mid/high: [기능 설명]  ← 개발 파이프라인"
echo "  리뷰해줘                   ← 코드 리뷰"
echo ""
