# harness_build

모든 스택 프로젝트를 위한 **Claude Code** 하네스.  
자연어 한 줄로 **기획 확인 → 테스트 선행 → 레이어 구현 → QA → 커밋 → (선택) 패턴 저장**까지 실행한다.

지원 스택: **Next.js · React · Vue · Nuxt · Express · NestJS · FastAPI · Django · Flask · Go · Flutter · Android · iOS · fallback**

> **AX 플랫폼**: 커밋 후 `저장해줘` → `local/`. 팀 공유는 `팀에 올려줘` → `team-patterns/` PR → `install.sh --sync-patterns`.

**현재 버전:** `v0.6.0` (`harness_global/VERSION`)

---

## Quick Start

```bash
git clone https://github.com/LEEHEEWON123/harness_build.git
cd harness_build

# 프로젝트에 하네스 설치 (에이전트 + team 패턴 sync + Cursor rules)
bash install.sh /path/to/your-project

# 승격 PR 머지 후 — 프로젝트에서 팀 패턴만 갱신
cd /path/to/your-project
bash /path/to/harness_build/install.sh --sync-patterns .
```

프로젝트에서 Claude Code:

```
로그인 API 만들어줘
```

---

## 일상 사용

### 개발 (dev)

```
상품 목록 API 만들어줘
유저 카드 컴포넌트 만들어줘
버그 고쳐줘 — UserCard에서 null 터져
```

### 부분 재실행

| 말하면 | Phase |
|--------|-------|
| 스펙 다시 정해줘 | 1 |
| 테스트 다시 만들어줘 | 1.5 |
| 구현 수정해줘 | 2 |
| QA 다시 해줘 | 3 |
| 패턴 저장해줘 | 4.5 |
| 팀에 올려줘 / 승격해줘 | 5 |
| 팀 패턴 sync 해줘 | team/ 동기화 |
| 구현 완료 / QA 돌려줘 | Claude Phase 3 복귀 (Cursor 구현 후) |
| 전체 다시 해줘 | 전체 |

### 리뷰 (code-review)

```
리뷰해줘
PR #42 리뷰해줘
```

### 패턴 자연어

| 시점 | 말하면 | 동작 |
|------|--------|------|
| 구현 후 | `커밋해줘` / `ok` | 커밋 → "로컬 패턴 저장할까요?" |
| 커밋 직후 | `저장해줘` / `패턴 저장` | `local/*.yaml` 등록 |
| 아무때나 | `local 패턴 보여줘` | local + team 조회 |
| local 쌓인 후 | `팀에 올려줘` | `team-patterns/` draft PR |
| 팀 머지 후 | `팀 패턴 sync 해줘` | `--sync-patterns` |

---

## 파이프라인

### dev — 에이전트 흐름

```
사용자 명령
    │
    ▼
[Skill: dev]  ← 오케스트레이터
    │
    ├─ Phase 1   ──▶ [code-analyzer]     스택 감지 → local/team 패턴 → 스펙 초안
    │                        │            (_workspace/01_spec.md)
    │               사용자 확인 (중단점) ← ok 전까지 Phase 2 금지
    │
    ├─ Phase 1.5 ──▶ [test-writer]        SKIP_TESTS=false 일 때만
    │
    ├─ Phase 2   ──▶ [cursor-agent]        HANDOFF.md → 자동 구현 → Phase 3
    │                 (phase2: claude 시 [implementer])
    │
    ├─ Phase 3   ──▶ [qa-validator]       테스트 + 정적 분석 (Claude)
    │                        │            FAIL → implementer 재호출 (≤2회)
    │
    ├─ Phase 4             커밋 & 푸시
    │               Step 4-A  "로컬 패턴 저장할까요?"
    │
    └─ Phase 4.5 ──▶ [pattern-extractor]  → .harness/patterns/local/

[별도 요청]
    Phase 5  ──▶ [pattern-promoter]  "팀에 올려줘" → team-patterns/ draft PR
```

### dev — Phase 상세

```
기획
  Phase 1    local/ > team/ 패턴 참조 → 코드 분석 → 01_spec.md
           ── 사용자 확인 대기 ──

테스트 (SKIP_TESTS=false)
  Phase 1.5  테스트 파일 선행 작성 (TDD Red)

구현 — cursor-agent (기본)
  Phase 2    HANDOFF.md → run-phase2-cursor.sh → 02_implementation.md → Phase 3
           (harness.config.yaml phase2: claude → implementer)

검증 — Claude
  Phase 3    테스트 실행 + 정적 분석 → 03_qa_report.md

완료
  Phase 4    커밋 & 푸시 → "로컬 패턴 저장할까요?"
  Phase 4.5  저장 승인 시 local/*.yaml 등록

승격 (별도)
  Phase 5    team-patterns/ draft PR
```

**SKIP_TESTS:** 단순 수정·스타일 → `true` / 신규 파일·API → `false` (`01_spec.md`)

**패턴 참조:** `local/` > `team/` > 스택 컨벤션 문서

### Phase 2 — cursor-agent 자동

`harness.config.yaml`:

```yaml
phase2: cursor-agent   # 기본 — HANDOFF 후 cursor-agent CLI 자동 실행
# phase2: claude      # Claude implementer (같은 세션)
```

```
Claude  Phase 1 → 1.5 → HANDOFF.md
       → bash .harness/scripts/run-phase2-cursor.sh
       → Phase 3 (같은 세션, 앱 전환 없음)
```

**요구사항:** `cursor-agent` 설치 + `cursor-agent login` (또는 `CURSOR_API_KEY`)

**오버라이드:** 요청에 `여기서 구현` / `Claude로 구현` → 이번만 `implementer`

### 스택별 레이어 순서 (Phase 2)

| 스택 | 구현 순서 |
|------|----------|
| Next.js / React | types → services → hooks → components → app |
| Vue / Nuxt | types → services → composables → components → pages |
| Express | types → models → services → controllers → routes |
| NestJS | dto → entities → services → controllers → modules |
| FastAPI / Django / Flask | schemas → services → routers (views) |
| Go | models → repository → services → handlers |
| Flutter | models → repository → providers → screens |
| 미지원 | 코드베이스 탐색 후 추론 |

### 정적 분석 (Phase 3)

| 스택 | 실행 명령 |
|------|---------|
| next / react | `tsc --noEmit`, `eslint` |
| fastapi / django / flask | `mypy`, `ruff check` |
| go | `go vet ./...`, `go build ./...` |
| flutter | `flutter analyze` |
| android | `./gradlew lint` |
| 미지원 | 린터 자동 탐색 |

### `_workspace/` 산출물

| 파일 | Phase | 용도 |
|------|-------|------|
| `01_spec.md` | 1 | TDD 스펙, `SKIP_TESTS`, `patterns_applied` |
| `01_test_plan.md` | 1.5 | 테스트 계획 |
| `HANDOFF.md` | 2 | Cursor 핸드오프 (`status: pending` → `done`) |
| `02_implementation.md` | 2 | 구현 보고 |
| `03_qa_report.md` | 3 | QA 결과 |
| `04_pattern_reason.md` | 4-B | 패턴 저장 이유 (선택) |

### code-review (리뷰)

```
Phase 0  파일 리뷰 vs PR diff 자동 판별
Phase 1  기획 의도 (동작 / 데이터 흐름 / 엣지케이스)
Phase 2  코드 절충 (일치 / 불일치 / 코드에만 존재)
Phase 3  연결 도메인 나열 (영향 판단은 사용자)
Phase 4  잠재 에러 [치명 / 주의 / 확인]
```

---

## AX 팀 패턴

```
team-patterns/ (중앙 Git)
      │ install / --sync-patterns
      ▼
.harness/patterns/team/     읽기 전용 (git 커밋 X)
.harness/patterns/local/    저장해줘 시 축적 (git 커밋 O)
```

```bash
# 팀원 일상 (승격 PR 머지 후)
cd harness_build && git pull
cd your-project && bash ../harness_build/install.sh --sync-patterns .
```

승격: `팀에 올려줘` 또는 `scripts/promote-pattern.sh` → PR → 머지 → sync  
상세: [team-patterns/README.md](team-patterns/README.md)

---

## 아키텍처

**범용 코어 + 스택 플러그인**

```
harness.config.yaml stack
  → stacks/{stack}/ 있으면 전용 에이전트·컨벤션
  → 없으면 범용 에이전트 fallback
```

```
harness_build/
├── install.sh
├── scripts/sync-team-patterns.sh
├── scripts/promote-pattern.sh
├── team-patterns/
├── apps/pattern-viewer/
└── harness_global/
    ├── .claude/skills/     dev, code-review, install-harness
    ├── .claude/agents/     code-analyzer, implementer, test-writer,
    │                       qa-validator, pattern-extractor, pattern-promoter
    ├── cursor/             team-patterns.mdc (+ 스택별 룰)
    └── stacks/{stack}/     {STACK}_CONVENTIONS.md, agents/
```

---

## 설치

| 방법 | 명령 |
|------|------|
| 스크립트 | `bash install.sh [/path/to/project]` |
| curl | `curl -fsSL .../install.sh \| bash` |
| 자연어 | harness_build에서 `하네스 설치해줘` |
| 글로벌 | `bash install.sh --global` (스킬·에이전트만; 프로젝트는 별도 install) |
| 팀 패턴만 | `bash install.sh --sync-patterns .` |

**업데이트:** `git pull` → `bash install.sh --global` + `bash install.sh /your-project`

**설치 후 (프로젝트):** `.claude/`, `CLAUDE.md`, `harness.config.yaml`, `.harness/patterns/{team,local}/`, `.cursor/rules/`

---

## harness.config.yaml

프로젝트 루트 설정. 전체 스키마는 `harness_global/harness.config.yaml` 참조.

```yaml
stack: auto
patterns:
  team_dir: .harness/patterns/team
  local_dir: .harness/patterns/local
  max_active_per_file: 30
```

---

## 패턴 뷰어

```bash
cd apps/pattern-viewer
cp .env.local.example .env.local   # PATTERNS_DIR 설정
npm install && npm run dev
```

`team/` + `local/` 병합 표시. 카테고리 탭, 검색, source 배지 (`team` / `user_approved`).

---

## Cursor IDE

`install.sh` 시 `.cursor/rules/` 항상 복사.

| 룰 | 역할 |
|----|------|
| `team-patterns.mdc` | team + local 패턴 **필수 참조** (`alwaysApply`) |
| `phase2-implement.mdc` | Phase 2 구현 규칙 (`cursor-agent`·IDE 공통) |
| `react-next.mdc` | Next.js App Router |
| `css.mdc` | Tailwind / CSS |
| `mvvm-tdd.mdc` | MVVM + TDD |

풀 dev 파이프라인(Phase 1~5)은 Claude Code `dev` 스킬. Cursor는 룰 + 패턴 참조.

---

## 변경 이력

| 버전 | 주요 변경 |
|------|----------|
| **v0.4.0** | low/mid/high 제거 → `SKIP_TESTS` |
| **v0.4.1** | Lighthouse CLI 제거 |
| **v0.5.0** | `team-patterns/` + team/local 분리, `--sync-patterns` |
| **v0.5.1** | 커밋→로컬저장 분리, Phase 5 승격 |
| **v0.5.2** | Cursor `team-patterns.mdc` alwaysApply |
| **v0.6.0** | Phase 2 `cursor-agent` 자동 (`HANDOFF.md`, `run-phase2-cursor.sh`) |

이전 버전(0.1~0.3.x)은 git history 참조.
