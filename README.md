# harness_build

모든 스택 프로젝트를 위한 **Claude Code** 하네스.  
자연어 한 줄로 **기획 확인 → 테스트 선행 → 구현 → QA → 커밋 → (선택) 패턴 저장**까지 실행한다.

지원 스택: **Next.js · React · Vue · Nuxt · Express · NestJS · FastAPI · Django · Flask · Go · Flutter · Android · iOS · fallback**

> **AX 팀 패턴:** 커밋 후 `저장해줘` → `local/`. 팀 공유는 `팀에 올려줘` → `team-patterns/` PR → `install.sh --sync-patterns`.

**현재 버전:** `v0.6.0` (`harness_global/VERSION`)

---

## Quick Start

```bash
git clone https://github.com/LEEHEEWON123/harness_build.git
cd harness_build

bash install.sh /path/to/your-project

# 승격 PR 머지 후 — 팀 패턴만 갱신
bash install.sh --sync-patterns /path/to/your-project
```

프로젝트에서 Claude Code: `로그인 API 만들어줘`

---

## 일상 사용

| 말하면 | 동작 |
|--------|------|
| 기능 만들어줘 / 버그 고쳐줘 | `dev` 파이프라인 |
| 스펙 다시 / 테스트 다시 / 구현 수정 / QA 다시 | 해당 Phase 재실행 |
| 커밋해줘 → `저장해줘` | 커밋 후 `local/` 패턴 저장 |
| `팀에 올려줘` | `team-patterns/` draft PR |
| `팀 패턴 sync 해줘` | `--sync-patterns` |
| `여기서 구현` / `Claude로 구현` | Phase 2를 Claude implementer로 (일회성) |
| 리뷰해줘 | `code-review` 스킬 |

---

## 파이프라인 (dev)

```
Phase 1    code-analyzer → 01_spec.md ── 사용자 확인 ──
Phase 1.5  test-writer (SKIP_TESTS=false)
Phase 2    cursor-agent 자동 (기본) → 02_implementation.md
Phase 3    qa-validator → 03_qa_report.md
Phase 4    커밋 → "로컬 패턴 저장할까요?"
Phase 4.5  pattern-extractor → local/
Phase 5    pattern-promoter (별도: "팀에 올려줘")
```

**Phase 2 (기본):** `HANDOFF.md` → `.harness/scripts/run-phase2-cursor.sh` → Phase 3 (같은 세션)  
**대안:** `harness.config.yaml`에 `phase2: claude` → implementer  
**필요:** `cursor-agent login` (Cursor Pro 포함량 사용)

**패턴 우선순위:** `local/` > `team/` > 스택 컨벤션

### `_workspace/` 산출물

| 파일 | Phase |
|------|-------|
| `01_spec.md` | 1 — 스펙·기획 |
| `01_test_plan.md` | 1.5 |
| `HANDOFF.md` | 2 |
| `02_implementation.md` | 2 — 구현·화면 추적 |
| `03_qa_report.md` | 3 |

---

## AX 팀 패턴

```
team-patterns/ (중앙 Git) ──sync──▶ .harness/patterns/team/  (커밋 X)
저장해줘 ──▶ .harness/patterns/local/                        (커밋 O)
```

상세: [team-patterns/README.md](team-patterns/README.md)

---

## 설치

| 명령 | 용도 |
|------|------|
| `bash install.sh /project` | 프로젝트 설치 |
| `bash install.sh --global` | `~/.claude` 스킬·에이전트 |
| `bash install.sh --sync-patterns .` | 팀 패턴만 갱신 |

설치 산출물: `.claude/`, `CLAUDE.md`, `harness.config.yaml`, `.harness/patterns/`, `.cursor/rules/`, `.harness/scripts/`

---

## harness.config.yaml

```yaml
stack: auto
phase2: cursor-agent   # cursor-agent | claude
patterns:
  team_dir: .harness/patterns/team
  local_dir: .harness/patterns/local
```

전체 스키마: `harness_global/harness.config.yaml`

---

## 앱

### Harness Hub — 프로젝트 대시보드

```bash
cd apps/harness-hub
cp .env.local.example .env.local   # HARNESS_PROJECTS 또는 PROJECTS_ROOT
npm install && npm run dev           # http://localhost:3001
```

1차 프로젝트 선택 → 2차 **패턴 · 기획 · 화면** 탭  
(`.harness/patterns/`, `_workspace/*/01_spec.md`, `02_implementation.md`)

### Pattern Viewer — 단일 프로젝트 패턴

```bash
cd apps/pattern-viewer
cp .env.local.example .env.local
npm install && npm run dev
```

---

## 레포 구조

```
harness_build/
├── install.sh
├── scripts/                    sync-team-patterns, promote-pattern, run-phase2-cursor
├── team-patterns/
├── apps/
│   ├── harness-hub/
│   └── pattern-viewer/
└── harness_global/
    ├── .claude/skills/         dev, code-review
    ├── .claude/agents/
    ├── cursor/                 team-patterns.mdc, phase2-implement.mdc
    └── stacks/{stack}/
```

---

## Cursor IDE

`install.sh` 시 `.cursor/rules/` 복사. `team-patterns.mdc`는 `alwaysApply`.  
풀 파이프라인은 Claude `dev` 스킬; Phase 2는 `cursor-agent` CLI.

---

## 변경 이력

| 버전 | 주요 변경 |
|------|----------|
| v0.5.x | team/local 패턴, Cursor rules, 승격 Phase 5 |
| v0.6.0 | Phase 2 `cursor-agent` 자동, Harness Hub |

이전 버전은 git history 참조.
