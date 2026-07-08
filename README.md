# harness_build

모든 스택 프로젝트를 위한 **Claude Code** 하네스.  
자연어 한 줄로 **기획 확인 → 테스트 선행 → 레이어 구현 → QA → 커밋 → (선택) 패턴 저장**까지 실행한다.

지원 스택: **Next.js · React · Vue · Nuxt · Express · NestJS · FastAPI · Django · Flask · Go · Flutter · Android · iOS · fallback**

> **AX 플랫폼**: 커밋 후 `저장해줘` → `local/`. 팀 공유는 `팀에 올려줘` → `team-patterns/` PR → `install.sh --sync-patterns`.

**현재 버전:** `v0.5.3` (`harness_global/VERSION`)

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

```
Phase 1     code-analyzer     스펙 초안 → 사용자 확인 (중단점)
Phase 1.5   test-writer       SKIP_TESTS=false 일 때만
Phase 2     implementer       레이어 구현
Phase 3     qa-validator      테스트 + 정적 분석 (FAIL 시 재시도 ≤2)
Phase 4     커밋 & 푸시
            → "로컬 패턴 저장할까요?"
Phase 4.5   pattern-extractor → .harness/patterns/local/
Phase 5     pattern-promoter  "팀에 올려줘" 시 draft PR (별도 요청)
```

**SKIP_TESTS:** 단순 수정·스타일 → `true` / 신규 파일·API → `false` (`01_spec.md`에서 결정)

**패턴 참조 우선순위:** `local/` > `team/` > 스택 컨벤션 문서

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
| **v0.5.3** | README 슬림화 (중복·구식 내용 정리) |

이전 버전(0.1~0.3.x)은 git history 참조.
