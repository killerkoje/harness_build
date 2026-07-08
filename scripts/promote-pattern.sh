#!/bin/bash
# local 패턴 1건을 team-patterns/에 승격 (source → team)
#
# 사용법:
#   bash scripts/promote-pattern.sh --id api-error-throw --category services \
#     --from /path/to/project/.harness/patterns/local/services.yaml
#
# harness_build 루트에서 실행. --dry-run 으로 diff만 확인.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HARNESS_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TEAM_PATTERNS="$HARNESS_ROOT/team-patterns/patterns"

PATTERN_ID=""
CATEGORY=""
FROM_FILE=""
DRY_RUN=false

while [ $# -gt 0 ]; do
  case "$1" in
    --id) PATTERN_ID="$2"; shift 2 ;;
    --category) CATEGORY="$2"; shift 2 ;;
    --from) FROM_FILE="$2"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    *) echo "알 수 없는 인자: $1"; exit 1 ;;
  esac
done

if [ -z "$PATTERN_ID" ] || [ -z "$CATEGORY" ] || [ -z "$FROM_FILE" ]; then
  echo "사용법: promote-pattern.sh --id <id> --category <name> --from <local.yaml>"
  exit 1
fi

if [ ! -f "$FROM_FILE" ]; then
  echo "오류: local 파일 없음 → $FROM_FILE"
  exit 1
fi

TEAM_FILE="$TEAM_PATTERNS/${CATEGORY}.yaml"
mkdir -p "$TEAM_PATTERNS"

python3 - "$PATTERN_ID" "$FROM_FILE" "$TEAM_FILE" "$DRY_RUN" <<'PY'
import sys
from datetime import date
from pathlib import Path

import yaml

pattern_id, from_file, team_file, dry_run = sys.argv[1:5]
dry = dry_run == "true"

def load(path: Path) -> dict:
    if not path.exists():
        return {"version": 1, "patterns": []}
    with path.open() as f:
        data = yaml.safe_load(f) or {}
    data.setdefault("patterns", [])
    return data

local = load(Path(from_file))
found = next((p for p in local["patterns"] if p.get("id") == pattern_id), None)
if not found:
    sys.exit(f"오류: local에 id '{pattern_id}' 없음")

promoted = {**found, "source": ["team"], "last_seen": date.today().isoformat(), "deprecated": False}

team = load(Path(team_file))
idx = next((i for i, p in enumerate(team["patterns"]) if p.get("id") == pattern_id), -1)
if idx >= 0:
    team["patterns"][idx] = {**team["patterns"][idx], **promoted}
    print(f"업데이트: {pattern_id} in {team_file}")
else:
    team["patterns"].append(promoted)
    print(f"추가: {pattern_id} → {team_file}")

team.setdefault("version", 1)
out = yaml.dump(team, allow_unicode=True, default_flow_style=False, sort_keys=False)

if dry:
    print("--- dry-run ---")
    print(out)
else:
    Path(team_file).write_text(out)
    print(f"저장: {team_file}")
PY

if [ "$DRY_RUN" = false ]; then
  echo ""
  echo "다음: git checkout -b promote/${PATTERN_ID} && git add team-patterns/ && git commit && gh pr create --draft"
fi
