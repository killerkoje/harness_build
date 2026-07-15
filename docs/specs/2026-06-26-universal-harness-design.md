# 범용 하네스 설계 스펙

**날짜:** 2026-06-26
**상태:** 승인됨

---

## 목표

현재 Next.js 전용으로 고정된 하네스를 **모든 스택에서 동작하는 범용 AX 환경**으로 확장한다.
기존 Next.js 품질은 유지하면서, 지원되지 않는 스택도 범용 fallback으로 즉시 동작한다.

---

## 접근 방식: 범용 코어 + 스택 플러그인

에이전트는 범용으로 동작하되, `stacks/{stack}/` 폴더가 있으면 해당 스택 전용 설정으로 교체한다.

```
범용 에이전트 → harness.config.yaml 읽기
             → stacks/{stack}/ 있으면 → 해당 에이전트/컨벤션 로드 (고품질)
             → 없으면 → 자체 추론으로 동작 (범용 fallback)
```

---

## 디렉토리 구조 (변경 후)

```
harness_global/
├── .claude/
│   ├── agents/
│   │   ├── code-analyzer.md       ← 범용 (신규 작성)
│   │   ├── implementer.md         ← 범용 (레이어 추상화)
│   │   ├── test-writer.md         ← 범용 (테스트 러너 감지 확장)
│   │   ├── qa-validator.md        ← 범용 (정적 분석 스택별 분기)
│   │   └── pattern-extractor.md   ← 유지 (이미 범용)
│   └── skills/
│       ├── dev/SKILL.md           ← frontend-dev → dev (범용화)
│       ├── code-review/SKILL.md   ← 마이너 수정
│       └── install-harness/SKILL.md ← 신규/기존 분기 + 스택 감지
├── harness.config.yaml            ← stack: auto 추가
├── CLAUDE.md                      ← 트리거 범용화
└── stacks/
    ├── next/                      ← 기존 그대로 유지 (고품질 플러그인)
    │   ├── agents/
    │   │   ├── code-analyzer.md
    │   │   └── implementer.md
    │   ├── REACT_NEXT_CONVENTIONS.md
    │   └── CSS_CONVENTIONS.md
    └── {stack}/                   ← 추후 추가 가능한 플러그인 슬롯
        ├── agents/                ← 선택적 override
        └── CONVENTIONS.md        ← 선택적
```

---

## 스택 감지 로직

에이전트와 install-harness가 공통으로 사용하는 감지 순서.

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

---

## install-harness 개편

### 기존 프로젝트 플로우

```
설치 요청
  → 프로젝트 파일 스캔
  → 스택 감지
  → 감지 결과 출력 + confirm ("Next.js 프로젝트로 감지됐습니다. 맞나요?")
  → harness.config.yaml 생성 (stack 기록)
  → stacks/{stack}/ 있으면 해당 파일 복사
  → 범용 에이전트 + 스킬 복사
  → AX 환경 구성 완료
```

### 신규 프로젝트 플로우

```
설치 요청 + 빈 디렉토리 감지
  → 프로젝트 타입 질문 (웹 프론트 / 백엔드 API / 풀스택 / 모바일 앱)
  → 스택 질문
  → 공식 CLI 명령어 안내
      예) "flutter create {name} 을 먼저 실행하세요"
  → 사용자가 완료 후 "설치 계속" 입력
  → 기존 프로젝트 플로우와 동일하게 진행
```

---

## 에이전트 범용화

### 레이어 추상화

MVVM을 스택 공통 "레이어 순서" 개념으로 추상화한다.

| 스택 | 레이어 순서 |
|------|-----------|
| Next.js | types → services → hooks → components → app |
| FastAPI | schemas → services → routers |
| Express | types → models → services → controllers → routes |
| NestJS | dto → entities → services → controllers → modules |
| Django | models → serializers → views → urls |
| Go | models → repository → services → handlers |
| Flutter | models → repository → providers → screens |
| 미지원 스택 | 코드베이스 탐색 후 기존 패턴 추론 |

### code-analyzer (범용)

```
1. harness.config.yaml → stack 읽기
2. stacks/{stack}/agents/code-analyzer.md 있으면 → 해당 파일 사용 (기존 방식)
3. 없으면
   → 스택별 레이어 순서 테이블 참조
   → 해당 폴더 순서로 탐색
   → .harness/patterns/ 읽기 (공통)
   → 스펙 초안 생성
```

### implementer (범용)

```
1. harness.config.yaml → stack 읽기
2. stacks/{stack}/agents/implementer.md 있으면 → 해당 파일 사용
3. 없으면
   → 레이어 순서 테이블 참조
   → 해당 순서로 구현
   → 기존 코드 패턴 최대한 추론하여 일관성 유지
```

### test-writer (범용)

```
테스트 러너 감지 우선순위:
1. harness.config.yaml의 test_runner 필드
2. 파일 감지
   package.json         → vitest / jest / mocha
   pytest.ini / pyproject.toml → pytest
   go.mod               → go test
   pubspec.yaml         → flutter test
   build.gradle         → JUnit
3. 없으면 사용자에게 직접 질문
```

### qa-validator (범용)

```
스택별 정적 분석 명령어:
  next / react:  tsc --noEmit, eslint
  fastapi:       mypy, ruff
  go:            go vet, go build
  flutter:       flutter analyze
  django:        mypy, ruff
  android:       ./gradlew lint
  미지원:        감지된 린터 자동 실행 시도
```

---

## dev 스킬 (frontend-dev → dev)

### 변경 내용

- 스킬 폴더명: `frontend-dev/` → `dev/`
- description: 프론트엔드 한정 동사/명사 → 범용 (API, 서버, 모델, 엔드포인트 등 추가)
- Phase 0: 레벨 키워드 감지 + **스택 감지** 추가
- Phase 1~4: MVVM 고정 문구 → 레이어 순서 동적 결정

### description 범용화

```yaml
description: |
  아래 조건 중 하나라도 해당하면 반드시 이 스킬을 사용하라.

  [코드 생성/수정 동사]
  만들어줘, 추가해줘, 구현해줘, 작성해줘, 수정해줘, 고쳐줘,
  바꿔줘, 변경해줘, 연결해줘, 붙여줘, 넣어줘, 달아줘

  [대상 명사 — 프론트엔드]
  컴포넌트, 페이지, 훅, hook, 폼, 버튼, 모달, 레이아웃

  [대상 명사 — 백엔드]
  API, 엔드포인트, 라우터, 서비스, 모델, 스키마, 컨트롤러,
  미들웨어, 핸들러, 리포지토리

  [대상 명사 — 공통]
  기능, 타입, 테스트, 인증, 로그인

  [버그/에러]
  버그, 에러, 오류, 고쳐, 고쳐줘, 왜 이래, 뭐가 문제야

  [레벨 키워드]
  low:, mid:, high:, [low], [mid], [high]
```

---

## harness.config.yaml 확장

```yaml
# stack: auto = 자동 감지 (기본값)
# 감지 후 자동으로 실제 스택 이름으로 업데이트됨
stack: auto

# 테스트
test_runner: auto
test_command: ""

# 스타일 (프론트엔드 스택에서만 사용)
style_mode: auto

# 커밋
branch_prefix: feat
commit_style: conventional
```

---

## 변경 파일 목록

| 파일 | 변경 유형 | 내용 |
|------|---------|------|
| `.claude/agents/code-analyzer.md` | **신규 작성** | 범용 버전 (현재는 stacks/next/에만 존재) |
| `.claude/agents/implementer.md` | **신규 작성** | 범용 버전 (현재는 stacks/next/에만 존재) |
| `.claude/agents/test-writer.md` | 수정 | 테스트 러너 감지 확장 |
| `.claude/agents/qa-validator.md` | 수정 | 정적 분석 스택별 분기 |
| `.claude/skills/frontend-dev/` | 이동+수정 | → `dev/`, 범용화 |
| `.claude/skills/code-review/SKILL.md` | 수정 | React/Next.js 한정 표현 범용화 |
| `.claude/skills/install-harness/SKILL.md` | 수정 | 신규/기존 분기, 스택 감지 |
| `harness.config.yaml` | 수정 | `stack: auto` 추가 |
| `CLAUDE.md` | 수정 | 트리거 문구 범용화, `dev` 스킬명 반영 |
| `stacks/next/agents/` | 유지 | 변경 없음 (고품질 유지) |
| `.claude/agents/pattern-extractor.md` | 유지 | 이미 범용 |

---

## 동작 예시

### Next.js 기존 프로젝트 (변경 없음)
```
install-harness → package.json → next 감지 → stack: next
               → stacks/next/ 로드 → 기존 고품질 동작 유지
```

### FastAPI 기존 프로젝트
```
install-harness → requirements.txt → fastapi 감지 → stack: fastapi
               → stacks/fastapi/ 없음 → 범용 에이전트 사용
               → implementer: schemas → services → routers 순 구현
```

### 신규 Flutter 프로젝트
```
install-harness → 빈 디렉토리 감지
               → "모바일 앱 / 웹 / 백엔드?" → 모바일
               → "Flutter / React Native / 기타?" → Flutter
               → "flutter create {name} 실행하세요" 안내
               → 완료 후 → stack: flutter 기록 → 범용 에이전트 구성
```

---

## 제외 범위

- 스택별 convention 문서 신규 작성 (FastAPI용, Go용 등) — 추후 추가
- 스캐폴딩 (폴더/파일 자동 생성) — 공식 CLI 위임
- Cursor rules 스택별 확장 — 추후
