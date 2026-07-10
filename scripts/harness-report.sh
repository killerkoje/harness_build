#!/bin/bash
# _workspace 산출물 → .harness/issues/{id}.yaml 동기화
#
# 사용법:
#   bash scripts/harness-report.sh              # 프로젝트 루트에서 전체 sync
#   bash scripts/harness-report.sh --project /path/to/project

set -euo pipefail

PROJECT_ROOT="$(pwd)"

while [ $# -gt 0 ]; do
  case "$1" in
    --project) PROJECT_ROOT="$2"; shift 2 ;;
    *) echo "알 수 없는 인자: $1"; exit 1 ;;
  esac
done

cd "$PROJECT_ROOT"

python3 - "$PROJECT_ROOT" <<'PY'
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    import yaml
except ImportError:
    sys.exit("오류: PyYAML 필요 (pip install pyyaml)")

root = Path(sys.argv[1])
workspace = root / "_workspace"
issues_dir = root / ".harness" / "issues"
issues_dir.mkdir(parents=True, exist_ok=True)

FM_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)


def parse_frontmatter(text: str) -> tuple[dict, str]:
    m = FM_RE.match(text)
    if not m:
        return {}, text
    try:
        fm = yaml.safe_load(m.group(1)) or {}
    except yaml.YAMLError:
        fm = {}
    body = text[m.end() :]
    return fm if isinstance(fm, dict) else {}, body


def extract_title(fm: dict, body: str, fallback: str) -> str:
    if fm.get("title"):
        return str(fm["title"]).strip()
    h1 = re.search(r"^#\s+(.+)$", body, re.M)
    return h1.group(1).strip() if h1 else fallback


def parse_files_from_impl(content: str) -> list[str]:
    files: list[str] = []
    in_section = False
    for line in content.splitlines():
        if line.strip().startswith("## 변경 파일"):
            in_section = True
            continue
        if in_section and line.startswith("## "):
            break
        if not in_section:
            continue
        m = re.match(r"^-\s+([^\s—\-]+)", line.strip())
        if m:
            files.append(m.group(1).strip())
    if files:
        return files
    for m in re.finditer(
        r"(?:^|\s|`|/)(?:app/|pages/|src/|lib/|components/|services/)[^\s`]+\.(tsx?|jsx|vue|py|go)",
        content,
        re.I,
    ):
        files.append(m.group(0).lstrip("`/ "))
    return list(dict.fromkeys(files))


def load_issue(path: Path) -> dict:
    if not path.exists():
        return {
            "version": 1,
            "id": int(path.stem),
            "title": "",
            "status": "active",
            "created_at": None,
            "updated_at": None,
            "runs": [],
            "files": [],
        }
    with path.open() as f:
        data = yaml.safe_load(f) or {}
    data.setdefault("version", 1)
    data.setdefault("runs", [])
    data.setdefault("files", [])
    return data


def next_issue_id() -> int:
    ids = []
    for p in issues_dir.glob("*.yaml"):
        if p.stem.isdigit():
            ids.append(int(p.stem))
    return max(ids, default=0) + 1


def iso_now() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


def save_issue(issue_id: int, data: dict) -> None:
    data["id"] = issue_id
    data["version"] = 1
    path = issues_dir / f"{issue_id}.yaml"
    path.write_text(
        yaml.dump(data, allow_unicode=True, default_flow_style=False, sort_keys=False)
    )
    print(f"→ .harness/issues/{issue_id}.yaml")


if not workspace.exists():
    print("워크스페이스 없음 — skip")
    sys.exit(0)

run_dirs = sorted([p for p in workspace.iterdir() if p.is_dir()])

for run_dir in run_dirs:
    spec_path = run_dir / "01_spec.md"
    if not spec_path.exists():
        continue

    spec_text = spec_path.read_text(encoding="utf-8")
    fm, body = parse_frontmatter(spec_text)
    run_id = run_dir.name
    title = extract_title(fm, body, run_id)

    issue_id = fm.get("issue_id")
    if issue_id is None:
        m = re.search(r"issue-(\d+)", run_id)
        if m:
            issue_id = int(m.group(1))
    if issue_id is None:
        issue_id = next_issue_id()
        fm["issue_id"] = issue_id
        fm.setdefault("title", title)
        new_fm = yaml.dump(fm, allow_unicode=True, sort_keys=False)
        spec_path.write_text(f"---\n{new_fm}---\n{body}", encoding="utf-8")
        print(f"→ {spec_path}: issue_id={issue_id} 부여")

    issue_id = int(issue_id)
    issue_path = issues_dir / f"{issue_id}.yaml"
    issue = load_issue(issue_path)

    if not issue.get("title"):
        issue["title"] = title
    if not issue.get("created_at"):
        issue["created_at"] = iso_now()
    issue["updated_at"] = iso_now()

    parent_run_id = fm.get("parent_run_id")
    kind = "amendment" if parent_run_id else "initial"
    if fm.get("kind") in ("initial", "amendment"):
        kind = fm["kind"]

    run_entry = {
        "run_id": run_id,
        "workspace_dir": f"_workspace/{run_id}",
        "kind": kind,
        "parent_run_id": parent_run_id,
        "at": datetime.fromtimestamp(spec_path.stat().st_mtime).astimezone().isoformat(
            timespec="seconds"
        ),
    }

    runs = issue.get("runs", [])
    idx = next((i for i, r in enumerate(runs) if r.get("run_id") == run_id), -1)
    if idx >= 0:
        runs[idx] = {**runs[idx], **run_entry}
    else:
        runs.append(run_entry)
    issue["runs"] = sorted(runs, key=lambda r: r.get("at", ""))

    impl_path = run_dir / "02_implementation.md"
    if impl_path.exists():
        impl_files = parse_files_from_impl(impl_path.read_text(encoding="utf-8"))
        files = issue.get("files", [])
        by_path = {f["path"]: f for f in files if isinstance(f, dict) and f.get("path")}
        for fp in impl_files:
            if fp not in by_path:
                by_path[fp] = {"path": fp, "first_run_id": run_id}
        issue["files"] = sorted(by_path.values(), key=lambda f: f["path"])

    qa_path = run_dir / "03_qa_report.md"
    if qa_path.exists():
        qa_text = qa_path.read_text(encoding="utf-8")
        if re.search(r"QA\s*결과:\s*PASS", qa_text):
            issue["status"] = "active"

    save_issue(issue_id, issue)

print("harness-report 완료")
PY
