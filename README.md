# harness_build

모든 스택 프로젝트를 위한 **Claude Code** 하네스.  
자연어 명령 한 줄로 **기획 확인 → 스펙 확정 → 테스트 선행 작성 → 레이어 구현 → 테스트 실행 검증 → 패턴 학습 → 커밋**까지 자동 실행된다.

지원 스택: **Next.js · React · Vue · Nuxt · Express · NestJS · FastAPI · Django · Flask · Go · Flutter · Android · iOS · 미지원 스택(fallback)**

> **AX 플랫폼**: 커밋 승인된 코드에서 팀 패턴을 추출해 `.harness/patterns/`에 적재한다.
> 다음 기획 시 `code-analyzer`가 이 데이터를 최우선 참조하고, `01_spec.md`의 `patterns_applied`로 감사 추적한다.

**현재 버전:** `v0.4.0` (`harness_global/VERSION`)

---

## 아키텍처

### 범용 코어 + 스택 플러그인

```
에이전트 → harness.config.yaml 읽기
         → stacks/{stack}/ 있으면 → 해당 에이전트/컨벤션 로드 (고품질)
         → 없으면 → 범용 에이전트로 동작 (fallback)
```

### 전체 구조

```
harness_build/
├── install.sh                            ← 설치 스크립트 (프로젝트 / 글로벌)
├── apps/
│   └── pattern-viewer/                   ← 팀 패턴 웹 뷰어 (Next.js)
│       ├── src/app/                      ← 페이지 & 레이아웃
│       ├── src/components/               ← PatternViewer 컴포넌트
│       ├── src/lib/patterns.ts           ← YAML → 카테고리 파싱
│       └── .env.local.example            ← PATTERNS_DIR 설정 예시
└── harness_global/
    ├── VERSION                           ← 하네스 버전 (현재 v0.3.3)
    ├── CLAUDE.md                         ← 스킬 트리거 정의 (프로젝트 루트에 복사)
    ├── harness.config.yaml               ← 프로젝트별 하네스 설정 (stack: auto)
    ├── cursor/                           ← Cursor IDE 룰 파일 (자동 감지 시 복사)
    │   ├── react-next.mdc
    │   ├── css.mdc
    │   └── mvvm-tdd.mdc
    ├── .claude/                          ← 범용 코어 (모든 스택 fallback)
    │   ├── skills/
    │   │   ├── dev/SKILL.md              ← 개발 파이프라인 오케스트레이터 (범용)
    │   │   ├── code-review/SKILL.md      ← 기획-코드 리뷰어 (범용)
    │   │   └── install-harness/SKILL.md  ← 자연어 설치 스킬 (신규/기존 분기)
    │   └── agents/                       ← 범용 서브 에이전트
    │       ├── code-analyzer.md          ← 코드베이스 분석 + 스펙 초안 (Phase 1)
    │       ├── implementer.md            ← 스택별 레이어 순서 구현 (Phase 2)
    │       ├── test-writer.md            ← 테스트 파일 선행 생성 (Phase 1.5)
    │       ├── qa-validator.md           ← 테스트 실행 + 정적 분석 (Phase 3)
    │       ├── performance-validator.md  ← Lighthouse CLI 성능 측정 (Phase 3.5)
    │       └── pattern-extractor.md      ← 패턴 추출 + 학습 적재 (Phase 4.5)
    ├── scripts/
    │   └── harness-performance-check.mjs ← web-vital-kit Lighthouse CLI 러너
    └── stacks/
        └── next/                         ← Next.js 전용 플러그인 (고품질)
            ├── REACT_NEXT_CONVENTIONS.md ← Next.js 공식 문서 기반 컨벤션
            ├── CSS_CONVENTIONS.md        ← Tailwind/Pure CSS/Modules 스타일 규칙
            └── agents/
                ├── code-analyzer.md      ← Next.js 특화 분석 (범용 에이전트 override)
                └── implementer.md        ← MVVM 구현 (범용 에이전트 override)
```

### 스택 감지 순서

```
1순위: harness.config.yaml의 stack 필드 (명시 시 즉시 사용)

2순위: 프로젝트 파일 자동 감지
  package.json
    → "next"                    → stack: next
    → "react" (next 없음)       → stack: react
    → "vue" / "nuxt"            → stack: vue / nuxt
    → "express" / "fastify"     → stack: express
    → "@nestjs/core"            → stack: nestjs

  requirements.txt / pyproject.toml
    → "fastapi"                 → stack: fastapi
    → "django"                  → stack: django
    → "flask"                   → stack: flask

  go.mod                        → stack: go
  pubspec.yaml                  → stack: flutter
  build.gradle                  → stack: android
  *.xcodeproj                   → stack: ios

3순위: 감지 실패 → 사용자에게 직접 질문
```

### 스택별 레이어 순서

| 스택 | 구현 레이어 순서 |
|------|----------------|
| Next.js / React | types → services → hooks → components → app |
| Vue / Nuxt | types → services → composables → components → pages |
| Express | types → models → services → controllers → routes |
| NestJS | dto → entities → services → controllers → modules |
| FastAPI / Django / Flask | schemas → services → routers (views) |
| Go | models → repository → services → handlers |
| Flutter | models → repository → providers → screens |
| 미지원 스택 | 코드베이스 탐색 후 기존 패턴 추론 |

### 에이전트 역할 분리

```
사용자 명령
    │
    ▼
[Skill: dev]  ← 오케스트레이터. 에이전트를 순서대로 호출하고 사용자와 소통
    │
    ├─ Phase 1   ──▶ [Agent: code-analyzer]     스택 감지 → 패턴 탐색 → TDD 스펙 초안 생성
    │                        │                  (_workspace/01_spec.md)
    │               사용자 확인 대기 (중단점) ← 기획/디자인/성공조건 확인
    │                        │ (ok)
    │
    ├─ Phase 1.5 ──▶ [Agent: test-writer]        확정 스펙 → 테스트 선행 생성  ← SKIP_TESTS=false
    │                                            (_workspace/01_test_plan.md)
    │
    ├─ Phase 2   ──▶ [Agent: implementer]        테스트 assertion 기준으로 레이어 구현
    │
    ├─ Phase 3   ──▶ [Agent: qa-validator]       테스트 실행 + 정적 분석
    │                        │                  FAIL → implementer 재호출 (최대 2회)
    │
    ├─ Phase 3.5 ──▶ [Agent: performance-validator]  Lighthouse CLI  ← 프론트 + SKIP_TESTS=false
    │
    ├─ Phase 4             완료 보고 → 커밋 확인
    │               ok        → 커밋만
    │               ok + 저장 → 커밋 + 패턴 이유 → Phase 4.5
    │
    └─ Phase 4.5 ──▶ [Agent: pattern-extractor]  ok + 저장 시에만 .harness/patterns/ 등록
```

### 정적 분석 (Phase 3, 스택별)

| 스택 | 실행 명령 |
|------|---------|
| next / react | `tsc --noEmit`, `eslint` |
| fastapi / django / flask | `mypy`, `ruff check` |
| go | `go vet ./...`, `go build ./...` |
| flutter | `flutter analyze` |
| android | `./gradlew lint` |
| 미지원 | 린터 자동 탐색 후 실행 |

### AX 학습 루프 (명시 저장형)

```
[구현 완료 + 커밋 확인]
          │
          ├── ok          → 커밋만 (패턴 X)
          │
          └── ok + 저장   → Step 4-B 이유(선택) → pattern-extractor
                    │
                    ▼
          [.harness/patterns/*.yaml]
            hooks / components / services / naming   ← 프론트
            schemas / routers / services / naming    ← 백엔드
            candidates.md                            ← 충돌 기록만
                    │
                    ▼
          [다음 기획 시 code-analyzer가 우선 참조]
            - deprecated: true 제외
            - 파일당 max_active_per_file(기본 30)개, observed 내림차순
            - 01_spec.md patterns_applied 감사 추적
```

#### 패턴 등록 기준

| 조건 | 동작 |
|------|------|
| `ok + 저장` / `패턴 저장` | `source: [user_approved]`로 YAML 등록 |
| `ok`만 | 패턴 추출 **실행 안 함** |
| 충돌 감지 | YAML 등록 안 함 → `candidates.md` |

패턴 YAML 필드: `id`, `description`, `example`, `reason`, `observed`, `source`, `confidence`, `deprecated`, `superseded_by`

### `_workspace/` 산출물 (세션 작업 로그)

| 파일 | Phase | 용도 |
|------|-------|------|
| `01_spec.md` | 1 | TDD 스펙. `SKIP_TESTS`, `patterns_applied` 포함 |
| `01_test_plan.md` | 1.5 | 테스트 계획 (`SKIP_TESTS: false`일 때) |
| `02_implementation.md` | 2 | 구현 보고 |
| `03_qa_report.md` | 3 | QA 결과 |
| `03b_performance_report.md` | 3.5 | Lighthouse (프론트, 비사소 작업) |
| `04_pattern_reason.md` | 4-B | 패턴 저장 시 이유 (`ok + 저장`) |

---

## 파이프라인

### dev (개발)

```
기획
  Phase 1    스택 감지 → .harness/patterns/ 우선 참조 → 코드 패턴 분석 → 스펙 초안 자동 생성
           ── 사용자 확인 대기 ──  ← 수정 가능, ok 전까지 절대 진행 안 함

확정 후 테스트 (SKIP_TESTS=false)
  Phase 1.5  테스트 파일 선행 생성 (TDD Red)
             SKIP_TESTS=true → 스킵 (단순 수정)

구현
  Phase 2    스택별 레이어 순서로 구현

검증
  Phase 3    테스트 실행 + 정적 분석 (FAIL → implementer 재시도 최대 2회)

성능 (프론트 + SKIP_TESTS=false)
  Phase 3.5  Lighthouse CLI

구현 완료
  Phase 4    커밋 확인
           ok        → 커밋만
           ok + 저장 → 이유(선택) + 패턴 YAML 등록 (Phase 4.5)
```

#### 커밋 응답 가이드

| 사용자 입력 | 동작 |
|------------|------|
| `ok` / `yes` | 커밋 & 푸시만 (**패턴 추출 안 함**) |
| `ok + 저장` / `패턴 저장` | 이유 한 줄(선택) → 커밋 → `.harness/patterns/` 등록 |
| `no` | 종료 |

### code-review (리뷰)

```
Phase 0  타입 분기 — 파일 리뷰 vs PR diff 리뷰 자동 판별
Phase 1  기획 의도 파악 (핵심 동작 / 데이터 흐름 / 엣지케이스)
Phase 2  코드 절충 검토 (일치 / 불일치 / 코드에만 존재)
           스택별 레이어 계층 추적 (프론트/백엔드/풀스택 자동 분기)
Phase 3  연결 도메인 나열 (영향 판단은 사용자 몫)
Phase 4  잠재적 에러 진단 [치명 / 주의 / 확인]
```

---

## harness.config.yaml

프로젝트 루트에 설치되는 설정 파일. 하네스 동작을 프로젝트별로 오버라이드한다.

```yaml
# harness.config.yaml
# stack: auto = 자동 감지 (기본값)
# 지원: next | react | vue | nuxt | express | nestjs | fastapi | django | flask | go | flutter | android | ios
stack: auto

# 테스트 러너 (auto = 자동 감지)
# 지원: auto | vitest | jest | mocha | pytest | go-test | flutter-test
test_runner: auto
test_command: ""     # 빈 문자열이면 자동 감지

# 스타일 (프론트엔드 스택에서만 사용)
style_mode: auto     # auto | tailwind | pure-css | hybrid

# 커밋
branch_prefix: feat
commit_style: conventional

# 성능 (Phase 3.5 — web-vital-kit Lighthouse CLI)
performance:
  enabled: true
  profiles: slow4g, fast4g
  port: 3000
  measure_path: /
  gate_mode: warn      # warn | block
  auto_init: false

# 패턴 학습 (ok + 저장 시에만)
patterns:
  max_active_per_file: 30   # YAML당 활성 패턴 상한
```

- `performance.enabled` → 프론트 스택 + `SKIP_TESTS: false`일 때 Phase 3.5
- `patterns.max_active_per_file` → code-analyzer 참조 상한, 초과 시 deprecated 처리

---

## 설치

### 방법 A — 자연어 (Claude Code에서)

`harness_build` 디렉토리에서 Claude Code를 열고 입력:

```
하네스 설치해줘
하네스 구축해줘
하네스 적용해줘
```

신규 프로젝트면 빈 디렉토리를 감지해 스택 타입(웹 프론트 / 백엔드 API / 풀스택 / 모바일 앱)을 먼저 질문한다.
기존 프로젝트면 파일을 스캔해 스택을 자동 감지하고 확인만 받는다.

---

### 방법 B — 스크립트 직접 실행

```bash
# 1. 레포 클론
git clone https://github.com/LEEHEEWON123/harness_build.git
cd harness_build

# 2-a. 현재 디렉토리에 설치
bash install.sh

# 2-b. 특정 프로젝트에 설치
bash install.sh /path/to/your-project
```

---

### 방법 C — curl (원라인)

```bash
# 현재 디렉토리에 설치
curl -fsSL https://raw.githubusercontent.com/LEEHEEWON123/harness_build/main/install.sh | bash
```

---

### 방법 D — 글로벌 설치 (모든 프로젝트에서 사용)

`~/.claude/` 에 설치하면 어느 프로젝트에서든 스킬/에이전트가 동작한다.

```bash
bash install.sh --global
```

> 스킬과 에이전트만 글로벌로 설치된다.
> `CLAUDE.md`, `harness.config.yaml`은 프로젝트별로 별도 설치 필요:
> ```bash
> bash install.sh /path/to/your-project
> ```

---

### 하네스 업데이트 (최신 반영)

```bash
cd harness_build
git pull origin main

# 글로벌 업데이트
bash install.sh --global

# 특정 프로젝트 업데이트
bash install.sh /path/to/your-project
```

---

### 설치 후 생성되는 파일

```
your-project/
├── .claude/
│   ├── skills/
│   │   ├── dev/SKILL.md              ← 개발 파이프라인 (범용)
│   │   ├── code-review/SKILL.md
│   │   └── install-harness/SKILL.md
│   └── agents/
│       ├── code-analyzer.md          ← 범용 (next 스택이면 stacks/next/ override)
│       ├── implementer.md            ← 범용 (next 스택이면 stacks/next/ override)
│       ├── test-writer.md
│       ├── qa-validator.md
│       └── pattern-extractor.md
├── CLAUDE.md
├── harness.config.yaml               ← stack: auto (감지 후 자동 기록)
├── .harness-version                  ← 설치된 버전 기록
└── .harness/                         ← 런타임 생성 (첫 mid/high 커밋 후)
    └── patterns/
        ├── hooks.yaml
        ├── naming.yaml
        ├── components.yaml
        ├── services.yaml
        └── candidates.md
```

Next.js 스택 추가 파일:
```
your-project/
├── REACT_NEXT_CONVENTIONS.md
└── CSS_CONVENTIONS.md
```

Cursor IDE 사용 시 `.cursor/` 디렉토리가 있으면 자동으로 룰 파일도 복사된다:
```
your-project/.cursor/rules/
├── react-next.mdc
├── css.mdc
└── mvvm-tdd.mdc
```

### 설치 확인

프로젝트에서 Claude Code 실행 후:

```
로그인 기능 만들어줘
```

스택 감지 → TDD 스펙 질문 → ok → 구현 → QA 순으로 진행되면 정상.

---

## 사용법

### 개발 명령 (dev 트리거)

```
상품 목록 API 만들어줘
장바구니 기능 추가해줘 — POST /api/cart, CartIcon 뱃지
유저 카드 컴포넌트 만들어줘
버그 고쳐줘 — UserCard에서 null 터져
```

#### 부분 재실행

```
스펙 다시 정해줘           ← Phase 1부터 재실행
테스트 다시 만들어줘        ← Phase 1.5만 재실행
구현 수정해줘              ← Phase 2만 재실행
QA 다시 해줘               ← Phase 3만 재실행
성능 다시 측정해줘          ← Phase 3.5만 재실행
전체 다시 해줘             ← 전체 파이프라인
```

### 리뷰 명령 (code-review 트리거)

```
리뷰해줘
코드 검토해줘
기획이랑 맞는지 봐줘
기획 의도랑 어긋난 거 있어?

PR 리뷰해줘            ← 현재 브랜치 diff 전체 리뷰
PR #42 리뷰해줘        ← 특정 PR 번호 리뷰
```

### 테스트·패턴 동작

| 항목 | 조건 |
|------|------|
| 테스트 생성 (Phase 1.5) | `01_spec.md`의 `SKIP_TESTS: false` (신규 파일·API 등) |
| 테스트 스킵 | `SKIP_TESTS: true` (단일 파일·스타일·텍스트 수정) |
| 패턴 저장 (Phase 4.5) | 커밋 시 `ok + 저장` / `패턴 저장`만 |
| 패턴 미저장 | `ok`만 → 커밋만 |

---

## 패턴 뷰어 (apps/pattern-viewer)

`.harness/patterns/` 에 쌓인 팀 패턴을 웹으로 시각화한다.

### 실행

```bash
cd apps/pattern-viewer

# .env.local 에 패턴 경로 설정
cp .env.local.example .env.local
# PATTERNS_DIR=/path/to/your/project/.harness/patterns 로 수정

npm install
npm run dev   # http://localhost:3000
```

### 기능

- **카테고리 탭**: Hooks · Components · Services · Naming
- **코드 예시 펼치기**: 클릭으로 example / reason / 메타데이터 확인
- **전체 검색**: id·설명·이유 텍스트 검색
- **신뢰도 배지**: high · medium · low (색상 구분)
- **source 배지**: user_approved · qa_pass

### 환경 변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `PATTERNS_DIR` | `../../.harness/patterns` | 패턴 YAML 폴더 절대 경로 |

---

## Cursor IDE 지원

`.cursor/` 디렉토리가 있는 프로젝트에 설치하면 Cursor 룰 파일이 자동으로 복사된다.

| 파일 | 역할 |
|------|------|
| `react-next.mdc` | Next.js App Router 규칙 (Server/Client Component, 라우팅) |
| `css.mdc` | CSS/Tailwind 스타일 규칙 |
| `mvvm-tdd.mdc` | MVVM 계층 구조 + TDD 원칙 |

> Cursor에서는 컨벤션 룰 적용만 지원한다.
> 풀 파이프라인(Phase 1~4.5)은 Claude Code에서만 동작한다.

---

## 변경 이력 (하네스)

| 버전 | 주요 변경 |
|------|----------|
| 0.1.0 | 초기 구성 (Next.js 전용) |
| 0.2.0 | TDD 실제 실행, core/stacks 분리, pattern-extractor, harness.config.yaml |
| 0.2.0+ | Step 4-B 선택 이유, `patterns_applied` 감사 추적, 패턴 `deprecated` 스키마 |
| **v0.3.0** | **범용 하네스 확장**: 모든 스택 지원 (Next.js·FastAPI·Go·Flutter 등 13개+), 범용 code-analyzer/implementer 신규 작성, frontend-dev → dev 스킬 범용화, 스택별 정적 분석, 신규/기존 프로젝트 설치 분기 |
| **v0.3.1** | **레벨 자동 추론**: 키워드 없이 요청 텍스트만으로 레벨 자동 결정, Phase 1 code-analyzer 코드 스캔 후 보정, 애매한 경우만 질문 |
| **v0.3.2** | **패턴 뷰어**: `.harness/patterns/` 웹 시각화 (`apps/pattern-viewer`) — 카테고리 탭, 코드 예시, 검색 기능 |
| **v0.3.3** | **Lighthouse CLI 성능 게이트**: Phase 3.5 `performance-validator` + `harness-performance-check.mjs` (web-vital-kit CLI 연동) |
| **v0.3.4** | **백엔드 컨벤션 문서**: FastAPI·NestJS·Express·Django·Flask·Go `{STACK}_CONVENTIONS.md` + 에이전트 override |
| **v0.4.0** | **파이프라인 단순화**: low/mid/high 제거 → `SKIP_TESTS`. 패턴은 `ok + 저장` 시에만 YAML 등록. 백엔드 패턴 카테고리(schemas/routers) |
