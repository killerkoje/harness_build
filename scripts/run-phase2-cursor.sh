#!/bin/bash
# Phase 2: cursor-agent 자동 구현
#
# 사용법:
#   bash scripts/run-phase2-cursor.sh --workspace _workspace/2026-07-09_user-login
#   bash scripts/run-phase2-cursor.sh --workspace ... --retry-reason "테스트 X 실패"
#
# 프로젝트 루트에서 실행. install.sh 가 .harness/scripts/ 에도 복사한다.

set -euo pipefail

WORKSPACE_DIR=""
PROJECT_ROOT=""
RETRY_REASON=""

while [ $# -gt 0 ]; do
  case "$1" in
    --workspace) WORKSPACE_DIR="$2"; shift 2 ;;
    --project) PROJECT_ROOT="$2"; shift 2 ;;
    --retry-reason) RETRY_REASON="$2"; shift 2 ;;
    *) echo "알 수 없는 인자: $1"; exit 1 ;;
  esac
done

if [ -z "$WORKSPACE_DIR" ]; then
  echo "사용법: run-phase2-cursor.sh --workspace <dir> [--project <root>] [--retry-reason <text>]"
  exit 1
fi

PROJECT_ROOT="${PROJECT_ROOT:-$(pwd)}"
cd "$PROJECT_ROOT"

HANDOFF="$WORKSPACE_DIR/HANDOFF.md"
if [ ! -f "$HANDOFF" ]; then
  echo "오류: HANDOFF.md 없음 → $HANDOFF"
  exit 1
fi

if [ ! -f "$WORKSPACE_DIR/01_spec.md" ]; then
  echo "오류: 01_spec.md 없음 → $WORKSPACE_DIR/01_spec.md"
  exit 1
fi

CURSOR_AGENT="${CURSOR_AGENT:-$(command -v cursor-agent 2>/dev/null || true)}"
if [ -z "$CURSOR_AGENT" ]; then
  echo "오류: cursor-agent 없음. Cursor CLI 설치 또는 CURSOR_AGENT 환경변수 설정."
  echo "  cursor-agent login"
  exit 1
fi

PROMPT="하네스 Phase 2 구현. phase2-implement.mdc 규칙을 따른다.
${WORKSPACE_DIR}/HANDOFF.md 의 workspace_dir 기준으로 01_spec.md 와 01_test_plan.md(있으면)를 읽고 구현하라.
완료 시 ${WORKSPACE_DIR}/02_implementation.md 를 작성하고 ${HANDOFF} 의 status 를 done 으로 변경하라."

if [ -n "$RETRY_REASON" ]; then
  PROMPT="${PROMPT}

QA FAIL — 아래 사유를 반영해 수정 후 다시 완료하라:
${RETRY_REASON}"
fi

echo "→ cursor-agent 실행 (project: $PROJECT_ROOT, workspace: $WORKSPACE_DIR)"
"$CURSOR_AGENT" -p --trust --force --workspace "$PROJECT_ROOT" "$PROMPT"

if [ ! -f "$WORKSPACE_DIR/02_implementation.md" ]; then
  echo "오류: 02_implementation.md 가 생성되지 않았습니다."
  exit 1
fi

if ! grep -qE '^status:[[:space:]]*done' "$HANDOFF" 2>/dev/null; then
  if grep -qE '^status:[[:space:]]*pending' "$HANDOFF" 2>/dev/null; then
    if sed --version >/dev/null 2>&1; then
      sed -i 's/^status:[[:space:]]*pending/status: done/' "$HANDOFF"
    else
      sed -i '' 's/^status:[[:space:]]*pending/status: done/' "$HANDOFF"
    fi
    echo "→ HANDOFF status 를 done 으로 갱신함"
  else
    echo "경고: HANDOFF status 가 done 이 아닙니다. cursor-agent 가 갱신했는지 확인하세요."
  fi
fi

echo "✓ Phase 2 완료: $WORKSPACE_DIR"
