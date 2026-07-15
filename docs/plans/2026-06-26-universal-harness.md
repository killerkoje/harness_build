# 범용 하네스 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Next.js 전용 하네스를 모든 스택에서 동작하는 범용 AX 환경으로 확장한다.

**Architecture:** 범용 코어 에이전트(`.claude/agents/`)가 기본 동작하고, `stacks/{stack}/agents/` 오버라이드가 있으면 교체. `install-harness`가 신규/기존 프로젝트를 분기하고 스택을 자동 감지해 `harness.config.yaml`에 기록.

**Tech Stack:** Claude Code skills/agents (Markdown frontmatter), YAML, bash 스택 감지

---

## 파일 구조 (변경 전 → 후)

```
신규 생성:
  harness_global/.claude/agents/code-analyzer.md   ← 범용 버전 (현재는 stacks/next/에만 있음)
  harness_global/.claude/agents/implementer.md      ← 범용 버전 (현재는 stacks/next/에만 있음)
  harness_global/.claude/skills/dev/SKILL.md        ← frontend-dev에서 이동+수정

수정:
  harness_global/.claude/agents/test-writer.md      ← 테스트 러너 감지 확장
  harness_global/.claude/agents/qa-validator.md     ← 정적 분석 스택별 분기
  harness_global/.claude/skills/install-harness/SKILL.md  ← 신규/기존 분기 + 스택 감지
  harness_global/.claude/skills/code-review/SKILL.md      ← React/Next.js 한정 표현 범용화
  harness_global/harness.config.yaml                ← stack: auto 추가
  harness_global/CLAUDE.md                          ← 트리거 범용화, dev 스킬명 반영

삭제:
  harness_global/.claude/skills/frontend-dev/       ← dev/로 이동 후 삭제

유지:
  harness_global/stacks/next/agents/code-analyzer.md   ← 변경 없음
  harness_global/stacks/next/agents/implementer.md      ← 변경 없음
  harness_global/.claude/agents/pattern-extractor.md    ← 이미 범용
```

---

## Task 1: harness.config.yaml — stack: auto 추가

**Files:**
- Modify: `harness_global/harness.config.yaml`

- [ ] **Step 1: 파일 수정**

`stack: next` → `stack: auto`로 교체하고 주석 추가:

```yaml
# harness.config.yaml
# 프로젝트별 하네스 설정. 비워두면 에이전트가 자동 감지한다.

# ─── 스택 ─────────────────────────────────────────────────
# auto: 프로젝트 파일(package.json, go.mod 등)로 자동 감지
# 명시 가능한 값: next | react | vue | nuxt | express | nestjs |
#                 fastapi | django | flask | go | flutter | android | ios
stack: auto

# ─── 테스트 ──────────────────────────────────────────────
test_runner: auto     # vitest | jest | pytest | go-test | flutter-test | none | auto
test_command: ""      # 커스텀 테스트 명령어. 비워두면 자동 감지.

# ─── 스타일 ──────────────────────────────────────────────
style_mode: auto      # tailwind | pure-css | hybrid | auto (프론트엔드 스택에서만 사용)

# ─── 커밋 / 브랜치 ────────────────────────────────────────
branch_prefix: feat   # feat | feature | dev
commit_style: conventional  # conventional | simple
```

- [ ] **Step 2: 검증**

```bash
cat harness_global/harness.config.yaml | grep "stack: auto"
# 출력: stack: auto
```

- [ ] **Step 3: 커밋**

```bash
git add harness_global/harness.config.yaml
git commit -m "feat: harness.config.yaml stack auto 감지 지원 추가"
```

---

## Task 2: CLAUDE.md — 트리거 범용화

**Files:**
- Modify: `harness_global/CLAUDE.md`

- [ ] **Step 1: 기능 개발 트리거 수정**

`frontend-dev` → `dev` 스킬 참조로 교체, 백엔드/앱 트리거 추가:

```markdown
## 하네스: 기능 개발 (TDD 파이프라인)

**목표:** 기획 확인 → 테스트 선행 작성 → 레이어 구현 → 실제 테스트 실행 검증 → 커밋 파이프라인으로 기능을 일관성 있게 개발한다.

**파이프라인:**
1. **Phase 1** — 기획 레벨 결정 + 코드 분석 + 기획 의도 정리 → **사용자 확인 필수**
2. **Phase 1.5** — 확정 스펙 기준으로 테스트 파일 선행 생성 (TDD Red 단계)
3. **Phase 2** — 스택별 레이어 순서로 구현 (MVVM / MVC / Repository 등)
4. **Phase 3** — 테스트 실제 실행 + 정적 검증 + FAIL 시 자동 재시도(최대 2회)
5. **Phase 4** — 구현 완료 보고 → **커밋 & 푸시 여부 사용자 확인**

**트리거:** 컴포넌트, 페이지, API, 엔드포인트, 훅, 서비스, 모델, 라우터, 컨트롤러 등 코드 작업 요청 시 `dev` 스킬을 사용하라. 단순 질문은 직접 응답 가능.
```

- [ ] **Step 2: 코드 리뷰 트리거 — 유지 (내용 동일, 스킬명 그대로)**

code-review 섹션은 변경 불필요.

- [ ] **Step 3: 파일 구조 섹션 업데이트**

```markdown
## 파일 구조

```
harness_global/
├── CLAUDE.md                          ← 이 파일 (하네스 트리거)
├── REACT_NEXT_CONVENTIONS.md          ← Next.js 스택 컨벤션 (next 스택에서만 참조)
├── CSS_CONVENTIONS.md                 ← CSS/Tailwind 스타일 규칙 (next 스택에서만 참조)
└── .claude/
    ├── skills/
    │   ├── dev/SKILL.md               ← 기능 개발 오케스트레이터 (범용, TDD 파이프라인)
    │   ├── code-review/SKILL.md       ← 기획-코드 리뷰어 (범용)
    │   └── install-harness/SKILL.md   ← 설치 오케스트레이터 (신규/기존 프로젝트 분기)
    └── agents/
        ├── code-analyzer.md           ← 코드베이스 분석 전담 (범용, Phase 1)
        ├── implementer.md             ← 레이어 순서 구현 전담 (범용, Phase 2)
        ├── test-writer.md             ← 테스트 파일 선행 생성 전담 (범용, Phase 1.5)
        ├── qa-validator.md            ← 테스트 실행 + 검증 전담 (범용, Phase 3)
        └── pattern-extractor.md       ← 커밋 후 팀 패턴 학습 전담 (Phase 4.5)
```
```

- [ ] **Step 4: 변경 이력 추가**

```markdown
| 2026-06-26 | 범용 하네스 확장 | 전체 | Next.js 전용 → 모든 스택 지원 (범용 코어 + 스택 플러그인) |
```

- [ ] **Step 5: 검증**

```bash
grep "dev 스킬" harness_global/CLAUDE.md
# 출력: ... `dev` 스킬을 사용하라 ...

grep "frontend-dev" harness_global/CLAUDE.md
# 출력: 없음 (빈 줄)
```

- [ ] **Step 6: 커밋**

```bash
git add harness_global/CLAUDE.md
git commit -m "feat: CLAUDE.md 트리거 범용화 및 dev 스킬명 반영"
```

---

## Task 3: install-harness/SKILL.md — 신규/기존 분기 + 스택 감지

**Files:**
- Modify: `harness_global/.claude/skills/install-harness/SKILL.md`

- [ ] **Step 1: 파일 전체 교체**

```markdown
---
name: install-harness
description: |
  아래 조건 중 하나라도 해당하면 반드시 이 스킬을 사용하라.

  하네스 설치해줘, 하네스 구축해줘, 하네스 적용해줘, 하네스 셋업해줘,
  install harness, setup harness, 하네스 넣어줘, 하네스 복사해줘,
  AX 환경 설정해줘, 개발 환경 설정해줘, 클로드 환경 셋업해줘
---

# 하네스 설치 오케스트레이터

이 스킬은 `harness_build` 레포의 하네스 파일을 대상 프로젝트에 설치한다.
신규 프로젝트와 기존 프로젝트를 분기하여 처리하고, 스택을 자동 감지해 AX 환경을 구성한다.

---

## Step 1: 설치 경로 확인

사용자에게 대상 프로젝트 경로를 묻는다:

```
어느 프로젝트에 설치할까요?
경로를 입력해 주세요. (예: /Users/me/my-project)
현재 디렉토리에 설치하려면 그냥 ok 입력
```

> 사용자가 ok/ㅇㅋ/현재/여기 등으로 응답하면 현재 작업 디렉토리(`pwd`)를 대상 경로로 사용한다.

---

## Step 2: 신규 vs 기존 프로젝트 분기

```bash
ls {TARGET_PATH}
```

**빈 디렉토리 (신규 프로젝트):** → Step 3-A 진행
**파일이 있는 디렉토리 (기존 프로젝트):** → Step 3-B 진행

---

## Step 3-A: 신규 프로젝트 셋업

### A-1: 프로젝트 타입 질문

```
어떤 프로젝트인가요?

1) 웹 프론트엔드 (React, Next.js, Vue 등)
2) 백엔드 API (FastAPI, Express, Django, Go 등)
3) 풀스택 (프론트 + 백엔드)
4) 모바일 앱 (Flutter, React Native 등)
```

### A-2: 스택 질문

타입별 후속 질문:

| 타입 | 질문 |
|------|------|
| 웹 프론트엔드 | Next.js / React(Vite) / Vue / Nuxt / 기타? |
| 백엔드 API | FastAPI / Express / NestJS / Django / Go / 기타? |
| 풀스택 | 프론트: Next.js / 기타? + 백: FastAPI / Express / 기타? |
| 모바일 앱 | Flutter / React Native / Swift(iOS) / Kotlin(Android) / 기타? |

### A-3: 공식 CLI 안내

```bash
# 감지된 스택에 맞는 CLI 명령어 출력
# 예시:
echo "먼저 아래 명령어로 프로젝트를 생성하세요:"
echo ""
echo "  [Next.js]    npx create-next-app@latest {name} --typescript --tailwind --app"
echo "  [FastAPI]    pip install fastapi && mkdir {name} && cd {name}"
echo "  [Express]    npx express-generator {name} --no-view"
echo "  [NestJS]     npx @nestjs/cli new {name}"
echo "  [Django]     pip install django && django-admin startproject {name}"
echo "  [Go]         mkdir {name} && cd {name} && go mod init {name}"
echo "  [Flutter]    flutter create {name}"
echo "  [React Native] npx react-native@latest init {name}"
```

완료 후 진행 여부를 묻는다:

```
프로젝트 생성이 완료되면 "완료" 또는 "계속"을 입력해 주세요.
```

> 사용자가 완료/계속/ok 입력 시 → Step 3-B로 이동 (스택은 A-2에서 이미 파악됨)

---

## Step 3-B: 기존 프로젝트 스택 감지

### B-1: 자동 감지

```bash
# package.json 감지
if [ -f "{TARGET_PATH}/package.json" ]; then
  cat {TARGET_PATH}/package.json | grep -E '"next"|"react"|"vue"|"nuxt"|"express"|"fastify"|"@nestjs/core"'
fi

# Python 감지
if [ -f "{TARGET_PATH}/requirements.txt" ]; then
  cat {TARGET_PATH}/requirements.txt | grep -iE "fastapi|django|flask"
fi
if [ -f "{TARGET_PATH}/pyproject.toml" ]; then
  cat {TARGET_PATH}/pyproject.toml | grep -iE "fastapi|django|flask"
fi

# Go 감지
ls {TARGET_PATH}/go.mod 2>/dev/null

# Flutter 감지
ls {TARGET_PATH}/pubspec.yaml 2>/dev/null

# Android 감지
ls {TARGET_PATH}/build.gradle 2>/dev/null

# iOS 감지
ls {TARGET_PATH}/*.xcodeproj 2>/dev/null
```

### B-2: 감지 결과 → stack 값 결정

| 감지 파일/의존성 | stack 값 |
|----------------|---------|
| package.json → "next" | `next` |
| package.json → "react" (next 없음) | `react` |
| package.json → "vue" 또는 "nuxt" | `vue` / `nuxt` |
| package.json → "express" 또는 "fastify" | `express` |
| package.json → "@nestjs/core" | `nestjs` |
| requirements.txt → "fastapi" | `fastapi` |
| requirements.txt → "django" | `django` |
| requirements.txt → "flask" | `flask` |
| go.mod | `go` |
| pubspec.yaml | `flutter` |
| build.gradle | `android` |
| *.xcodeproj | `ios` |
| 감지 실패 | 사용자에게 직접 질문 |

### B-3: 감지 결과 confirm

```
[감지 결과] {stack} 프로젝트로 감지됐습니다.
맞나요? (yes / 아니면 직접 입력: next | react | fastapi | go | flutter | ...)
```

---

## Step 4: 파일 설치

### 4-1: harness_build 루트 확인

이 스킬 파일의 위치에서 `harness_global/` 디렉토리가 있는 곳이 루트다.

### 4-2: 기본 .claude/ 설치

```bash
# 범용 에이전트 + 스킬 복사
cp -r {HARNESS_ROOT}/harness_global/.claude {TARGET_PATH}/
```

### 4-3: 스택 플러그인 설치 (있는 경우만)

```bash
STACK_DIR="{HARNESS_ROOT}/harness_global/stacks/{DETECTED_STACK}"

if [ -d "$STACK_DIR" ]; then
  echo "스택 플러그인 발견: stacks/{DETECTED_STACK}/"

  # 스택 전용 에이전트 복사 (범용 에이전트 override)
  if [ -d "$STACK_DIR/agents" ]; then
    cp $STACK_DIR/agents/* {TARGET_PATH}/.claude/agents/
  fi

  # 스택 전용 컨벤션 문서 복사
  for doc in $STACK_DIR/*.md; do
    [ -f "$doc" ] && cp "$doc" {TARGET_PATH}/
  done
else
  echo "스택 플러그인 없음 → 범용 에이전트로 동작합니다."
fi
```

### 4-4: CLAUDE.md 처리

```bash
if [ -f "{TARGET_PATH}/CLAUDE.md" ]; then
  echo "" >> {TARGET_PATH}/CLAUDE.md
  echo "---" >> {TARGET_PATH}/CLAUDE.md
  cat {HARNESS_ROOT}/harness_global/CLAUDE.md >> {TARGET_PATH}/CLAUDE.md
else
  cp {HARNESS_ROOT}/harness_global/CLAUDE.md {TARGET_PATH}/
fi
```

### 4-5: harness.config.yaml 생성

```bash
if [ ! -f "{TARGET_PATH}/harness.config.yaml" ]; then
  cp {HARNESS_ROOT}/harness_global/harness.config.yaml {TARGET_PATH}/
fi

# 감지된 스택을 config에 기록 (auto → 실제 값으로 교체)
sed -i '' "s/^stack: auto/stack: {DETECTED_STACK}/" {TARGET_PATH}/harness.config.yaml
```

### 4-6: 버전 기록

```bash
cat {HARNESS_ROOT}/harness_global/VERSION > {TARGET_PATH}/.harness-version
```

### 4-7: Cursor 룰 복사 (.cursor/ 있는 경우만)

```bash
if [ -d "{TARGET_PATH}/.cursor" ]; then
  mkdir -p {TARGET_PATH}/.cursor/rules/
  if [ -d "{HARNESS_ROOT}/harness_global/stacks/{DETECTED_STACK}/cursor" ]; then
    cp -r {HARNESS_ROOT}/harness_global/stacks/{DETECTED_STACK}/cursor/* {TARGET_PATH}/.cursor/rules/
  elif [ -d "{HARNESS_ROOT}/harness_global/cursor" ]; then
    cp -r {HARNESS_ROOT}/harness_global/cursor/* {TARGET_PATH}/.cursor/rules/
  fi
fi
```

---

## Step 5: 설치 완료 보고

```
## 하네스 설치 완료

설치 경로: {TARGET_PATH}
감지된 스택: {DETECTED_STACK}
스택 플러그인: 있음 / 없음 (범용 에이전트로 동작)

설치된 파일:
[core — 범용]
- .claude/agents/code-analyzer.md    ← 코드 분석 에이전트 (Phase 1)
- .claude/agents/implementer.md      ← 구현 에이전트 (Phase 2)
- .claude/agents/test-writer.md      ← 테스트 생성 에이전트 (Phase 1.5)
- .claude/agents/qa-validator.md     ← QA 에이전트 (Phase 3)
- .claude/agents/pattern-extractor.md ← 패턴 학습 에이전트 (Phase 4.5)
- .claude/skills/dev/                ← 개발 파이프라인 스킬
- .claude/skills/code-review/        ← 리뷰 스킬
- CLAUDE.md                          ← 트리거 정의

[stack: {DETECTED_STACK} 플러그인 — 있을 때만]
- .claude/agents/code-analyzer.md    ← {스택} 전용 분석 에이전트 (override)
- .claude/agents/implementer.md      ← {스택} 전용 구현 에이전트 (override)
- {STACK_CONVENTIONS}.md             ← 스택 컨벤션 문서

이제 이 프로젝트에서 Claude Code를 열고:
  low/mid/high: [기능 설명]    ← 개발 파이프라인
  리뷰해줘                     ← 코드 리뷰
```

---

## 에러 핸들링

| 상황 | 처리 |
|------|------|
| 경로 없음 | 다시 입력 요청 |
| 권한 없음 | `sudo cp` 또는 수동 복사 안내 |
| 이미 .claude/ 존재 | 덮어쓸지 사용자에게 confirm 후 진행 |
| 스택 감지 실패 | 사용자에게 직접 질문 후 진행 |
| 신규 프로젝트 CLI 완료 미확인 | "완료" 입력 전까지 Step 4 진행 안 함 |
```

- [ ] **Step 2: 검증**

```bash
grep "신규 vs 기존" harness_global/.claude/skills/install-harness/SKILL.md
# 출력: ## Step 2: 신규 vs 기존 프로젝트 분기

grep "DETECTED_STACK" harness_global/.claude/skills/install-harness/SKILL.md | wc -l
# 출력: 10 이상
```

- [ ] **Step 3: 커밋**

```bash
git add harness_global/.claude/skills/install-harness/SKILL.md
git commit -m "feat: install-harness 신규/기존 분기 + 범용 스택 감지 추가"
```

---

## Task 4: .claude/agents/code-analyzer.md — 범용 신규 작성

**Files:**
- Create: `harness_global/.claude/agents/code-analyzer.md`

> 현재 이 경로에 파일이 없음. `stacks/next/agents/code-analyzer.md`는 그대로 유지.

- [ ] **Step 1: 범용 code-analyzer.md 작성**

```markdown
---
name: code-analyzer
type: Explore
model: opus
description: 기존 코드 패턴을 분석하고 TDD 스펙 초안을 생성하는 에이전트. 스택을 자동 감지하고 stacks/{stack}/에 오버라이드가 있으면 해당 에이전트 정의를 따른다. Phase 1에서 실행되며 스펙 초안을 _workspace/01_spec.md에 저장한다.
---

# Code Analyzer (범용)

## Step 0: 스택 확인 + 오버라이드 분기

```bash
cat harness.config.yaml 2>/dev/null
```

`stack` 값을 읽는다.

**스택 오버라이드 확인:**

```bash
# 스택 전용 code-analyzer가 있으면 해당 에이전트 정의를 읽고 그 지시를 따른다
cat .claude/agents/code-analyzer.md 2>/dev/null | head -5
ls stacks/{stack}/agents/code-analyzer.md 2>/dev/null
```

> stacks/{stack}/agents/code-analyzer.md가 존재하고 harness.config.yaml의 stack이 명시되어 있으면,
> 해당 파일의 지시를 따른다. 이 범용 에이전트의 나머지 단계는 건너뛴다.
> (install-harness가 설치 시 .claude/agents/에 복사했으므로 현재 파일이 이미 교체된 상태일 수 있다.)

오버라이드 없으면 → 아래 범용 로직 계속.

---

## Step 1: 스택별 탐색 순서 결정

`harness.config.yaml`의 stack 또는 자동 감지로 탐색 순서를 결정한다.

### 스택 자동 감지 (config에 없을 때)

```bash
ls package.json go.mod pubspec.yaml requirements.txt pyproject.toml build.gradle 2>/dev/null
cat package.json 2>/dev/null | grep -E '"next"|"react"|"vue"|"express"|"@nestjs"' | head -3
cat requirements.txt 2>/dev/null | head -5
```

### 스택별 레이어 탐색 순서

| stack | 탐색 순서 |
|-------|---------|
| `next` | `.harness/patterns/` → `app/` → `components/` → `hooks/` → `services/` → `types/` |
| `react` | `.harness/patterns/` → `src/pages/` → `src/components/` → `src/hooks/` → `src/services/` → `src/types/` |
| `vue` / `nuxt` | `.harness/patterns/` → `pages/` → `components/` → `composables/` → `services/` → `types/` |
| `express` / `nestjs` | `.harness/patterns/` → `src/routes/` → `src/controllers/` → `src/services/` → `src/models/` → `src/types/` |
| `fastapi` | `.harness/patterns/` → `routers/` → `services/` → `schemas/` → `models/` |
| `django` | `.harness/patterns/` → `*/views.py` → `*/serializers.py` → `*/models.py` → `*/urls.py` |
| `go` | `.harness/patterns/` → `handlers/` → `services/` → `repository/` → `models/` |
| `flutter` | `.harness/patterns/` → `lib/screens/` → `lib/widgets/` → `lib/providers/` → `lib/repository/` → `lib/models/` |
| 미감지 | `.harness/patterns/` → `src/` → `lib/` → `app/` → 발견되는 구조 탐색 |

---

## Step 2: .harness/patterns/ 읽기 (팀 학습 데이터)

```bash
ls .harness/patterns/ 2>/dev/null
cat .harness/patterns/*.yaml 2>/dev/null
```

`deprecated: true`인 패턴은 제외. `superseded_by`가 있으면 대체 패턴 참조.

**활성 패턴 선택 우선순위** (동일 관심사에 여러 패턴):
1. `user_approved` source 있음
2. `observed` 높은 순
3. `confidence: high`
4. `last_seen` 최신 순

---

## Step 3: 코드 탐색

Step 1에서 결정한 탐색 순서로 기존 코드를 읽는다.

- 신규 기능이 따라야 할 패턴 파악
- 파일명 규칙, 레이어 간 의존 방향 파악
- API 엔드포인트 패턴 파악 (백엔드면 라우터, 프론트면 fetch URL)
- 테스트 파일 위치 패턴 파악

---

## Step 4: TDD 스펙 초안 생성

분석 결과를 `_workspace/01_spec.md`에 저장한다.
추론 가능한 항목은 모두 채우고, 불확실한 항목만 `[확인 필요]`로 표시한다.

```markdown
# TDD 스펙 초안

## 감지된 스택
- stack: {감지값}
- 레이어 순서: {스택별 레이어 순서}
- 테스트 프레임워크: {감지값 또는 확인 필요}

## patterns_applied
| id | 적용 내용 |
|----|----------|
| {패턴 id} | {적용 내용} |
(없으면: 없음)

## 기능
- **무엇을 만드는가:** [추론: 한 문장]
- **성공 조건:**
  1. [추론]
  2. [추론]
- **예외/엣지케이스:** [추론 또는 확인 필요]

## 데이터
- **API 엔드포인트:** [추론 또는 확인 필요]
- **HTTP 메서드:** [추론: GET | POST | PUT | DELETE]
- **핵심 타입/스키마:** [추론 또는 확인 필요]
- **데이터 페칭 전략:** [추론: React Query | fetch | axios | httpx | net/http 등]

## 구현 범위
### 신규 생성
- `{레이어별 파일 경로}` — [설명]

### 수정
- `{경로/파일}` — [변경 내용]

## 기존 패턴
- 레이어 구조: {감지된 구조}
- 파일명 규칙: {감지된 규칙}
- 에러 처리 방식: {감지된 방식}

## 주의사항
- [타입 경계면 불일치 위험]
- [기타 감지된 위험]
```

---

## 에러 핸들링

| 상황 | 처리 |
|------|------|
| 스택 감지 실패 | 코드베이스 탐색 후 발견된 구조 기반으로 추론, `[확인 필요]` 표시 |
| .harness/patterns/ 없음 | 건너뜀 (첫 기능 개발 시 정상) |
| 기존 코드 없음 (빈 프로젝트) | 스택 기본 레이어 순서 기반으로 스펙 초안 작성 |
```

- [ ] **Step 2: 검증**

```bash
ls harness_global/.claude/agents/code-analyzer.md
# 출력: harness_global/.claude/agents/code-analyzer.md

grep "오버라이드" harness_global/.claude/agents/code-analyzer.md
# 출력: ... 스택 오버라이드 확인 ...

grep "스택별 레이어 탐색 순서" harness_global/.claude/agents/code-analyzer.md
# 출력: ### 스택별 레이어 탐색 순서
```

- [ ] **Step 3: 커밋**

```bash
git add harness_global/.claude/agents/code-analyzer.md
git commit -m "feat: 범용 code-analyzer 에이전트 신규 작성 (스택 감지 + 레이어 탐색)"
```

---

## Task 5: .claude/agents/implementer.md — 범용 신규 작성

**Files:**
- Create: `harness_global/.claude/agents/implementer.md`

> 현재 이 경로에 파일이 없음. `stacks/next/agents/implementer.md`는 그대로 유지.

- [ ] **Step 1: 범용 implementer.md 작성**

```markdown
---
name: implementer
type: general-purpose
model: opus
description: TDD 스펙 기준으로 스택별 레이어 순서에 맞춰 실제 코드를 구현하는 에이전트. harness.config.yaml의 stack으로 레이어 순서를 결정하고, stacks/{stack}/에 오버라이드가 있으면 그 에이전트 정의를 따른다.
---

# Implementer (범용)

## Step 0: 스택 확인 + 오버라이드 분기

```bash
cat harness.config.yaml 2>/dev/null
```

stacks/{stack}/agents/implementer.md가 설치되어 현재 파일이 이미 스택 전용 버전으로 교체된 경우,
이 범용 에이전트는 동작하지 않는다. (install-harness가 override 설치 시 해당 파일로 덮어씀)

현재 파일이 범용 버전이면 → 아래 로직 계속.

---

## Step 1: 스펙 + 테스트 계획 읽기

```bash
cat _workspace/01_spec.md
cat _workspace/01_test_plan.md 2>/dev/null
cat .harness/patterns/*.yaml 2>/dev/null
```

`01_test_plan.md`가 있으면 생성된 테스트 파일을 직접 열어 assertion 기준을 파악한다.
구현 목표는 "해당 테스트가 모두 PASS가 되는 코드"다.

---

## Step 2: 레이어 순서 결정

`harness.config.yaml`의 stack 기준으로 구현 순서를 결정한다.

| stack | 구현 레이어 순서 |
|-------|--------------|
| `next` / `react` | types → services → hooks (React Query) → components → pages |
| `vue` / `nuxt` | types → services → composables → components → pages |
| `express` | types → models → services → controllers → routes |
| `nestjs` | dto → entities → services → controllers → modules |
| `fastapi` | schemas (Pydantic) → services → routers |
| `django` | models → serializers → views → urls |
| `go` | models → repository → services → handlers → routes |
| `flutter` | models → repository → providers/bloc → screens → widgets |
| 미감지 | 기존 코드베이스 구조 탐색 후 동일 패턴 적용 |

---

## Step 3: 레이어별 구현

결정된 레이어 순서대로 구현한다.

**공통 원칙:**
- 상위 레이어가 완성되기 전에 하위 레이어를 구현하지 않는다
- 기존 파일이 있으면 패턴을 파악하고 일관성을 유지한다
- 타입/스키마가 최우선 — 구현 전에 데이터 모델을 확정한다
- 에러는 하위 레이어(서비스/레포지토리)에서 throw, 상위(컨트롤러/뷰)에서 처리
- `any` 타입 사용 금지, 모든 타입 명시
- 요청되지 않은 기능 추가 금지

**스택별 주의사항:**

*next/react:*
- `'use client'` 최소 범위에만 적용 (leaf 컴포넌트)
- Server Component 기본, 클라이언트 상태 필요 시만 Client로 전환
- TanStack Query: queryKey는 기존 패턴 준수

*fastapi:*
- Pydantic BaseModel로 입출력 타입 명시
- 의존성 주입(Depends) 사용
- 비동기 함수(async def) 기본

*go:*
- 에러는 마지막 반환값으로 (`return nil, err`)
- interface 기반 레이어 분리
- 구조체 임베딩 최소화

*flutter:*
- Provider/Riverpod/Bloc 중 기존 프로젝트 패턴 따름
- 비동기는 Future/Stream 기반
- null safety 엄격 적용

---

## Step 4: 출력 프로토콜

구현 완료 후 `_workspace/02_implementation.md`에 저장:

```markdown
## 구현 완료 목록

### 신규 생성
- `{레이어/파일.ext}` — {설명}

### 수정
- `{경로/파일.ext}` — {변경 내용}

## 테스트 파일과 구현 일치 여부
| 테스트 케이스 | 대응 구현 | 예상 결과 |
|-------------|---------|---------|
| {케이스} | {구현 파일:라인} | PASS |

## 미구현 항목
[완료하지 못한 항목과 이유]

## QA 검증 요청 사항
[타입 경계면, 에러 처리, 비동기 처리 등 QA가 특별히 확인할 항목]
```

---

## 에러 핸들링

| 상황 | 처리 |
|------|------|
| 스펙 파일 없음 | 실행 중단, 오케스트레이터에 보고 |
| 스택 미감지 | 기존 코드 구조 탐색 후 추론하여 진행 |
| 패턴 충돌 | 기존 코드 패턴 우선, `02_implementation.md`에 결정 이유 기록 |
| 구현 불가 블로커 | 중단 + `02_implementation.md`에 블로커 기록 |
```

- [ ] **Step 2: 검증**

```bash
ls harness_global/.claude/agents/implementer.md
# 출력: harness_global/.claude/agents/implementer.md

grep "레이어 순서 결정" harness_global/.claude/agents/implementer.md
# 출력: ## Step 2: 레이어 순서 결정

grep "fastapi" harness_global/.claude/agents/implementer.md
# 출력: ... fastapi ... schemas (Pydantic) → services → routers ...
```

- [ ] **Step 3: 커밋**

```bash
git add harness_global/.claude/agents/implementer.md
git commit -m "feat: 범용 implementer 에이전트 신규 작성 (스택별 레이어 순서 추상화)"
```

---

## Task 6: test-writer.md — 테스트 러너 감지 확장

**Files:**
- Modify: `harness_global/.claude/agents/test-writer.md`

- [ ] **Step 1: frontmatter description 수정**

```markdown
---
name: test-writer
type: general-purpose
model: sonnet
description: TDD 스펙(01_spec.md)을 기준으로 구현 전에 실행 가능한 테스트 파일을 생성하는 에이전트. 스택별 테스트 프레임워크를 자동 감지하고 성공 조건을 테스트 케이스로 1:1 변환한다.
---
```

- [ ] **Step 2: Step 0 수정 — 스택 감지 추가**

기존 Step 0 (harness.config.yaml 읽기) 다음에 스택 감지 로직 추가:

```markdown
## Step 0: harness.config.yaml 읽기

```bash
cat harness.config.yaml 2>/dev/null
```

- `test_runner`가 명시되어 있으면 → Step 1 감지 생략, 해당 값 사용
- `test_runner: auto` 또는 파일 없음 → Step 1 감지 실행
- `test_command`가 명시되어 있으면 → 01_test_plan.md의 명령어 섹션에 사용
- `stack` 값을 읽어 Step 1 감지 우선순위 결정에 활용
```

- [ ] **Step 3: Step 1 감지 로직 교체**

기존 vitest/jest 중심 감지를 다중 스택 감지로 교체:

```markdown
## Step 1: 스택별 테스트 환경 감지

harness.config.yaml의 stack 또는 자동 감지 결과 기준으로 테스트 러너를 탐색한다.

### 프론트엔드 (next / react / vue / nuxt)

```bash
ls vitest.config.ts vitest.config.js vitest.config.mts 2>/dev/null
ls jest.config.ts jest.config.js jest.config.mjs 2>/dev/null
cat package.json | grep -E '"vitest"|"jest"|"@testing-library|"msw"|"@playwright"' 2>/dev/null
```

| 감지 | 테스트 러너 |
|------|-----------|
| vitest.config.* | vitest |
| jest.config.* | jest |
| playwright.config.* | playwright (e2e) |
| 없음 | 감지 안 됨 |

### Python 백엔드 (fastapi / django / flask)

```bash
ls pytest.ini setup.cfg pyproject.toml 2>/dev/null
cat pyproject.toml 2>/dev/null | grep -E "\[tool.pytest\]|\[tool.pytest.ini_options\]"
cat requirements.txt 2>/dev/null | grep -iE "pytest|unittest"
```

| 감지 | 테스트 러너 |
|------|-----------|
| pytest.ini 또는 [tool.pytest] | pytest |
| unittest (표준 라이브러리) | unittest |
| 없음 | 감지 안 됨 |

### Go

```bash
ls go.mod 2>/dev/null
# go test는 표준 라이브러리 — go.mod가 있으면 go test 사용 가능
```

| 감지 | 테스트 러너 |
|------|-----------|
| go.mod 존재 | go test |

### Flutter

```bash
ls pubspec.yaml 2>/dev/null
cat pubspec.yaml 2>/dev/null | grep -E "flutter_test|mockito|mocktail"
```

| 감지 | 테스트 러너 |
|------|-----------|
| pubspec.yaml 존재 | flutter test |

### Android

```bash
ls build.gradle 2>/dev/null
cat build.gradle 2>/dev/null | grep -E "junit|espresso|robolectric"
```

| 감지 | 테스트 러너 |
|------|-----------|
| build.gradle + junit | JUnit (./gradlew test) |

---

**감지 안 됨 처리:** 테스트 파일은 생성하되 `01_test_plan.md`에 `RUN: false` 기록.
```

- [ ] **Step 4: Step 3~4 — 스택별 테스트 템플릿 분기 추가**

기존 프론트엔드 템플릿(A, B) 뒤에 백엔드 템플릿 섹션 추가:

```markdown
### Python 테스트 템플릿 (pytest / FastAPI)

```python
# tests/test_{name}.py
import pytest
from httpx import AsyncClient
from app.main import app   # FastAPI 앱 진입점 (실제 경로 확인 필요)

# 성공 조건 기반 테스트 케이스
@pytest.mark.asyncio
async def test_{feature}_success():
    """[성공 조건 1 원문]"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.{method}("/{endpoint}", json={
            # 스펙 Request 스키마 기반 최소 payload
        })
    assert response.status_code == 200
    data = response.json()
    assert data is not None  # 스펙 기준 구체적 assertion으로 교체

@pytest.mark.asyncio
async def test_{feature}_not_found():
    """존재하지 않는 리소스 요청 시 404 반환"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.{method}("/{endpoint}/nonexistent")
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_{feature}_validation_error():
    """잘못된 입력 시 422 반환"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post("/{endpoint}", json={})  # 빈 payload
    assert response.status_code == 422
```

### Go 테스트 템플릿

```go
// {package}/{name}_test.go
package {package}

import (
    "net/http"
    "net/http/httptest"
    "testing"
)

func Test{Feature}Success(t *testing.T) {
    // 성공 조건 1: [스펙 성공 조건 원문]
    req := httptest.NewRequest(http.Method{METHOD}, "/{endpoint}", nil)
    w := httptest.NewRecorder()

    // handler 호출 (실제 핸들러로 교체)
    // handler.{FeatureHandler}(w, req)

    resp := w.Result()
    if resp.StatusCode != http.StatusOK {
        t.Errorf("expected 200, got %d", resp.StatusCode)
    }
}

func Test{Feature}NotFound(t *testing.T) {
    req := httptest.NewRequest(http.Method{METHOD}, "/{endpoint}/nonexistent", nil)
    w := httptest.NewRecorder()

    // handler.{FeatureHandler}(w, req)

    resp := w.Result()
    if resp.StatusCode != http.StatusNotFound {
        t.Errorf("expected 404, got %d", resp.StatusCode)
    }
}
```

### Flutter 테스트 템플릿

```dart
// test/{name}_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';

// Mock 클래스 (스펙 Repository 인터페이스 기반)
// class Mock{Repository} extends Mock implements {Repository} {}

void main() {
  group('{FeatureName}', () {
    test('[성공 조건 1 원문]', () async {
      // Arrange
      // final mockRepo = Mock{Repository}();
      // when(mockRepo.{method}()).thenAnswer((_) async => {/* mock data */});

      // Act
      // final result = await {useCase}.execute();

      // Assert
      // expect(result, isNotNull);
    });

    test('에러 시 예외를 throw한다', () async {
      // when(mockRepo.{method}()).thenThrow(Exception('error'));
      // expect(() => {useCase}.execute(), throwsException);
    });
  });
}
```
```

- [ ] **Step 5: Step 5 출력 프로토콜 — 스택별 명령어 업데이트**

```markdown
## 테스트 파일 명령어 (스택별)

| stack | 실행 명령어 |
|-------|-----------|
| next/react (vitest) | `npx vitest run {test_files}` |
| next/react (jest) | `npx jest {test_files}` |
| fastapi | `pytest {test_files} -v` |
| django | `python manage.py test {app}` |
| go | `go test ./{package}/...` |
| flutter | `flutter test {test_files}` |
| android | `./gradlew test` |
```

- [ ] **Step 6: 검증**

```bash
grep "pytest" harness_global/.claude/agents/test-writer.md
# 출력: pytest 관련 내용 여러 줄

grep "go test" harness_global/.claude/agents/test-writer.md
# 출력: go test 관련 내용

grep "flutter test" harness_global/.claude/agents/test-writer.md
# 출력: flutter test 관련 내용
```

- [ ] **Step 7: 커밋**

```bash
git add harness_global/.claude/agents/test-writer.md
git commit -m "feat: test-writer 다중 스택 테스트 러너 감지 + 템플릿 확장"
```

---

## Task 7: qa-validator.md — 정적 분석 스택별 분기

**Files:**
- Modify: `harness_global/.claude/agents/qa-validator.md`

- [ ] **Step 1: frontmatter description 수정**

```markdown
---
name: qa-validator
type: general-purpose
model: opus
description: Phase 2 구현 완료 후 스택별 테스트 실행 → 스펙 달성 여부 → 타입 경계면 → 컨벤션 위반 → 런타임 위험 순으로 검증하는 QA 에이전트. 스택을 감지해 적절한 정적 분석 도구를 실행한다. FAIL 시 오케스트레이터가 Implementer를 재호출한다.
---
```

- [ ] **Step 2: Step 00 — 스택 감지 추가**

기존 Step 00 (harness.config.yaml 읽기) 에 스택 감지 로직 추가:

```markdown
## Step 00: harness.config.yaml 읽기

```bash
cat harness.config.yaml 2>/dev/null
```

- `stack` 값을 읽어 Step 2 정적 분석 명령어 결정에 사용
- `test_command`가 명시되어 있으면 → Step 0-C에서 해당 명령어 사용
- `test_runner: none` → 테스트 실행 건너뜀
```

- [ ] **Step 3: 사전 참조 섹션 교체 — 스택별 분기**

기존 `REACT_NEXT_CONVENTIONS.md` 고정 참조 → 스택별 조건부 참조로 교체:

```markdown
## 사전 참조 (스택별 조건부)

```bash
# 스택 전용 컨벤션 문서가 있으면 읽는다
cat REACT_NEXT_CONVENTIONS.md 2>/dev/null   # next/react 스택
cat CSS_CONVENTIONS.md 2>/dev/null           # next/react 스택
# 다른 스택의 컨벤션 문서는 각 stacks/{stack}/ 설치 시 함께 복사됨
```

컨벤션 문서가 있으면 해당 문서의 QA 체크리스트 기준으로 검증한다.
없으면 → 아래 범용 체크리스트 사용.
```

- [ ] **Step 4: 정적 분석 섹션 추가 — 스택별 명령어**

기존 컨벤션 체크리스트 뒤에 범용 정적 분석 섹션 추가:

```markdown
## Step 2: 정적 분석 (스택별)

`harness.config.yaml`의 stack 기준으로 실행:

```bash
# next / react
npx tsc --noEmit 2>&1 | head -30
npx eslint src/ --max-warnings 0 2>&1 | head -20

# fastapi / django / flask
python -m mypy . 2>&1 | head -30
python -m ruff check . 2>&1 | head -20

# go
go vet ./... 2>&1
go build ./... 2>&1

# flutter
flutter analyze 2>&1 | head -30

# android
./gradlew lint 2>&1 | tail -20

# 스택 미감지 / 기타
# 존재하는 린터 자동 탐색:
ls .eslintrc* .pylintrc mypy.ini .golangci.yml analysis_options.yaml 2>/dev/null
```

정적 분석 결과에서:
- **에러(error)**: [치명] 분류
- **경고(warning)**: [주의] 분류  
- **정보(info/hint)**: [확인] 분류
```

- [ ] **Step 5: 범용 검증 체크리스트 추가**

기존 React/Next.js 전용 체크리스트를 범용 체크리스트로 보완:

```markdown
## 범용 검증 체크리스트 (스택 무관)

```
□ 타입/스키마가 레이어 간 일관성 있게 사용되는가?
□ 에러가 적절한 레이어에서 처리되는가? (하위에서 throw, 상위에서 catch)
□ null/nil/None/undefined 접근 가능한 경우 처리되는가?
□ 비동기 처리(async/await, goroutine, Future 등)가 올바르게 처리되는가?
□ API 응답 타입과 클라이언트 기대 타입이 일치하는가?
□ 성공 조건별로 대응하는 코드가 존재하는가?
□ 로딩/에러/빈 상태가 처리되는가? (해당되는 레이어에서)
□ 하드코딩된 값이 없는가? (URL, 포트, 시크릿 등)
□ any/interface{}/ 타입 캐스팅이 남발되지 않는가?
```
```

- [ ] **Step 6: 검증**

```bash
grep "go vet" harness_global/.claude/agents/qa-validator.md
# 출력: go vet ./... 2>&1

grep "flutter analyze" harness_global/.claude/agents/qa-validator.md
# 출력: flutter analyze 2>&1 | head -30

grep "범용 검증 체크리스트" harness_global/.claude/agents/qa-validator.md
# 출력: ## 범용 검증 체크리스트 (스택 무관)
```

- [ ] **Step 7: 커밋**

```bash
git add harness_global/.claude/agents/qa-validator.md
git commit -m "feat: qa-validator 스택별 정적 분석 + 범용 검증 체크리스트 추가"
```

---

## Task 8: frontend-dev → dev 스킬 이동 + 범용화

**Files:**
- Create: `harness_global/.claude/skills/dev/SKILL.md` (frontend-dev에서 내용 이동 + 수정)
- Delete: `harness_global/.claude/skills/frontend-dev/` (이동 후 삭제)

- [ ] **Step 1: dev/ 디렉토리 생성 + SKILL.md 복사**

```bash
mkdir -p harness_global/.claude/skills/dev
cp harness_global/.claude/skills/frontend-dev/SKILL.md harness_global/.claude/skills/dev/SKILL.md
```

- [ ] **Step 2: frontmatter description 범용화**

`dev/SKILL.md`의 description 섹션 교체:

```yaml
---
name: dev
description: |
  아래 조건 중 하나라도 해당하면 반드시 이 스킬을 사용하라. 예외 없음.

  [코드 생성/수정 동사]
  만들어줘, 만들어, 추가해줘, 추가해, 구현해줘, 구현해, 작성해줘, 작성해,
  수정해줘, 수정해, 고쳐줘, 고쳐, 바꿔줘, 바꿔, 변경해줘, 변경해,
  연결해줘, 연결해, 붙여줘, 붙여, 넣어줘, 넣어, 달아줘, 달아

  [대상 명사 — 프론트엔드]
  컴포넌트, 페이지, 훅, hook, 폼, form, 버튼, 모달, 다이얼로그,
  레이아웃, 헤더, 푸터, 사이드바, 리스트, 카드, 테이블, 차트,
  필터, 검색, 대시보드, 마이페이지, 상세 페이지

  [대상 명사 — 백엔드/API]
  API, 엔드포인트, 라우터, 서비스, 모델, 스키마, 컨트롤러,
  미들웨어, 핸들러, 리포지토리, 데이터베이스, DB, 쿼리

  [대상 명사 — 공통]
  기능, 타입, 타입스크립트, 테스트, 인증, 로그인, 회원가입,
  설정 페이지, 화면, 뷰

  [버그/에러 수정]
  버그, 에러, 오류, 안 돼, 안돼, 작동 안 해, 깨져, 터져,
  안 나와, 안나와, 고쳐, 고쳐줘, 수정해줘, 왜 이래, 뭐가 문제야

  [재실행/반복 요청]
  다시 해줘, 다시 실행해줘, 다시 만들어줘, 이전 결과 수정해줘,
  아까 거 수정해줘, 방금 거 바꿔줘

  [레벨 키워드 — 단독으로도 이 스킬 트리거]
  low:, mid:, high:, [low], [mid], [high], (low), (mid), (high)

  [제외 — 이 스킬을 쓰지 않는 경우]
  파일 읽어줘 / 코드 설명해줘 / 이게 뭐야 / 어떻게 동작해
  → 단순 질문·설명 요청은 직접 응답한다.
---
```

- [ ] **Step 3: 스킬 본문 제목 + 설명 수정**

```markdown
# 기능 개발 오케스트레이터

프로젝트의 스택(Next.js, FastAPI, Go, Flutter 등)에 맞는 레이어 순서로 기능을 개발한다.
**기획 확인 → 스펙 확정 → 테스트 선행 작성 → 레이어 구현 → 테스트 실행 검증 → 커밋 확인** 파이프라인.
```

- [ ] **Step 4: Phase 0 — 스택 감지 추가**

기존 Phase 0 (컨텍스트 확인)에 스택 감지 스텝 추가:

```markdown
### Phase 0: 컨텍스트 확인

1. 레벨 키워드 감지 → `DEPTH_MODEL` 설정
2. **스택 감지**
   ```bash
   cat harness.config.yaml 2>/dev/null | grep "^stack:"
   ```
   `DETECTED_STACK` 설정. `auto`이거나 없으면 code-analyzer가 Step 0에서 감지.
3. `_workspace/` 상태 확인
   - **존재 + 부분 수정** → 해당 에이전트만 재호출
   - **존재 + 새 기능** → `_workspace/`를 `_workspace_prev/`로 이동
   - **미존재** → 초기 실행
```

- [ ] **Step 5: 에이전트 팀 테이블 수정**

```markdown
## 에이전트 팀

| 에이전트 | Phase | 역할 |
|---------|-------|------|
| Code Analyzer | 1 | 스택 감지 + 코드 패턴 탐색 + TDD 스펙 초안 생성 |
| Test Writer | 1.5 | 확정 스펙 기준 테스트 파일 선행 생성 (TDD Red) |
| Implementer | 2 | 스택별 레이어 순서로 구현 (TDD Green) |
| QA Validator | 3 | 테스트 실행 + 스펙 달성 검증 + 위험 진단 |
```

- [ ] **Step 6: frontend-dev/ 삭제**

```bash
rm -rf harness_global/.claude/skills/frontend-dev/
```

- [ ] **Step 7: 검증**

```bash
ls harness_global/.claude/skills/dev/SKILL.md
# 출력: harness_global/.claude/skills/dev/SKILL.md

ls harness_global/.claude/skills/frontend-dev/ 2>/dev/null
# 출력: 없음 (ls: cannot access ...)

grep "백엔드/API" harness_global/.claude/skills/dev/SKILL.md
# 출력: [대상 명사 — 백엔드/API]

grep "DETECTED_STACK" harness_global/.claude/skills/dev/SKILL.md
# 출력: `DETECTED_STACK` 설정 ...
```

- [ ] **Step 8: 커밋**

```bash
git add harness_global/.claude/skills/dev/
git rm -r harness_global/.claude/skills/frontend-dev/
git commit -m "feat: frontend-dev → dev 스킬 범용화 (백엔드/앱 트리거 + 스택 감지 추가)"
```

---

## Task 9: code-review/SKILL.md — React/Next.js 한정 표현 범용화

**Files:**
- Modify: `harness_global/.claude/skills/code-review/SKILL.md`

- [ ] **Step 1: Phase 2 코드 절충 검토 — 탐색 순서 범용화**

기존 "훅 → 서비스 → 타입 계층 추적" → 스택별 레이어 추적으로 교체:

```markdown
**탐색 순서:**
1. 사용자가 언급한 파일/컴포넌트 직접 읽기
2. 해당 파일을 import하거나 사용하는 상위 파일 탐색 (Grep)
3. 스택별 레이어 계층 추적
   - 프론트엔드: 훅 → 서비스 → 타입
   - 백엔드: 컨트롤러/핸들러 → 서비스 → 레포지토리/모델
   - 풀스택: 양방향 추적
```

- [ ] **Step 2: Phase 4 잠재적 에러 진단 — React Query 항목 조건부로 변경**

```markdown
**진단 항목:**
- 런타임 에러 가능성 (null/nil/None 접근, 비동기 처리 누락, any 타입 남용)
- 기획 엣지케이스의 조건 로직이 의도와 다르게 동작하는 경우
- 타입/스키마 경계면 불일치 (API 응답 ↔ 레이어 간)
- 로딩/에러/빈 상태 처리 누락 (프론트엔드)
- 에러 처리 누락 (백엔드 — status code, 예외 전파 등)
- [next/react만] React Query queryKey 충돌 또는 잘못된 invalidateQueries 대상
- [next/react만] Server/Client Component 경계 위반
```

- [ ] **Step 3: 검증**

```bash
grep "백엔드" harness_global/.claude/skills/code-review/SKILL.md
# 출력: 백엔드 관련 내용

grep "null/nil/None" harness_global/.claude/skills/code-review/SKILL.md
# 출력: - 런타임 에러 가능성 (null/nil/None 접근 ...
```

- [ ] **Step 4: 커밋**

```bash
git add harness_global/.claude/skills/code-review/SKILL.md
git commit -m "feat: code-review 스킬 React/Next.js 한정 표현 범용화"
```

---

## Task 10: install.sh + 버전 업데이트

**Files:**
- Modify: `harness_global/VERSION` (버전 bump)

- [ ] **Step 1: VERSION 파일 업데이트**

```bash
cat harness_global/VERSION
# 현재 버전 확인 후 minor bump
echo "v0.3.0" > harness_global/VERSION
```

- [ ] **Step 2: 최종 구조 검증**

```bash
# 모든 범용 에이전트 존재 확인
ls harness_global/.claude/agents/
# 출력에 code-analyzer.md, implementer.md, test-writer.md, qa-validator.md, pattern-extractor.md 있어야 함

# dev 스킬 존재, frontend-dev 없어야 함
ls harness_global/.claude/skills/
# 출력: code-review/ dev/ install-harness/

# stacks/next/ 유지 확인
ls harness_global/stacks/next/agents/
# 출력: code-analyzer.md implementer.md
```

- [ ] **Step 3: CLAUDE.md 변경 이력 최종 확인**

```bash
grep "2026-06-26" harness_global/CLAUDE.md
# 출력: | 2026-06-26 | 범용 하네스 확장 | ...
```

- [ ] **Step 4: 최종 커밋 + 푸시**

```bash
git add harness_global/VERSION
git commit -m "feat: v0.3.0 — 범용 하네스 (모든 스택 지원, 스택 플러그인 아키텍처)"
git push
```

---

## 검증 시나리오

### 시나리오 1: Next.js 기존 프로젝트 (기존 동작 유지 확인)

```
"하네스 설치해줘" 입력
→ install-harness 트리거 확인
→ 경로 입력 → package.json 감지 → stack: next 확인
→ stacks/next/ 로드 → 고품질 에이전트 설치 확인
```

### 시나리오 2: FastAPI 기존 프로젝트 (범용 동작 확인)

```
"하네스 설치해줘" 입력
→ install-harness 트리거
→ requirements.txt → fastapi 감지 → stack: fastapi 확인
→ stacks/fastapi/ 없음 → 범용 에이전트 설치
→ "mid: 상품 조회 API 만들어줘" 입력
→ dev 스킬 트리거
→ code-analyzer: schemas/ → services/ → routers/ 탐색
→ implementer: schemas → services → routers 순 구현
→ test-writer: pytest 템플릿 생성
→ qa-validator: mypy + ruff 실행
```

### 시나리오 3: 신규 Flutter 프로젝트

```
"하네스 설치해줘" 입력 (빈 디렉토리)
→ 신규 프로젝트 분기
→ "모바일 앱 → Flutter" 선택
→ "flutter create {name}" 안내
→ 완료 후 → stack: flutter 기록 → 범용 에이전트 구성
```
