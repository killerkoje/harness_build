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
