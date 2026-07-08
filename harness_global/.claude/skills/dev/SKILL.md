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

  [제외 — 이 스킬을 쓰지 않는 경우]
  파일 읽어줘 / 코드 설명해줘 / 이게 뭐야 / 어떻게 동작해
  → 단순 질문·설명 요청은 직접 응답한다.
---

# 기능 개발 오케스트레이터

프로젝트 스택에 맞는 레이어 순서로 기능을 개발한다.
**기획 확인 → 스펙 확정 → 테스트 선행 작성 → 레이어 구현 → 테스트 실행 검증 → 커밋 확인** 파이프라인.

---

## 에이전트 모델 (고정)

| 에이전트 | model |
|---------|-------|
| Code Analyzer | opus |
| Test Writer | sonnet |
| Implementer | opus |
| QA Validator | sonnet |
| Pattern Extractor | sonnet |

---

## 에이전트 팀

| 에이전트 | Phase | 역할 |
|---------|-------|------|
| Code Analyzer | 1 | 스택 감지 + 코드 패턴 탐색 + TDD 스펙 초안 생성 |
| Test Writer | 1.5 | 확정 스펙 기준 테스트 파일 선행 생성 (TDD Red) |
| Implementer | 2 | 스택별 레이어 순서로 구현 (TDD Green) |
| QA Validator | 3 | 테스트 실행 + 스펙 달성 검증 + 위험 진단 |
| Pattern Extractor | 4.5 | **사용자가 `ok + 저장` 시에만** 팀 패턴 YAML 등록 |

---

## 워크플로우

### Phase 0: 컨텍스트 확인

1. **스택 감지**
   ```bash
   cat harness.config.yaml 2>/dev/null | grep "^stack:"
   ```
   `DETECTED_STACK` 설정. `auto`이거나 없으면 code-analyzer가 Step 0에서 감지.
2. `WORKSPACE_DIR` 결정
   - 오늘 날짜(YYYY-MM-DD) + 요청에서 추출한 영문 슬러그(최대 20자, kebab-case)
   - 예) `_workspace/2026-07-08_user-login`
   - 해당 폴더 이미 존재 → 부분 재실행, 기존 파일 재사용
   - 이후 모든 파일 경로는 `{WORKSPACE_DIR}/` prefix

---

### Phase 1: TDD 스펙 정의 (사용자 확인 필수 중단점)

#### Step 1-A: 코드 분석 + 스펙 초안 생성

```
Agent(
  subagent_type: "Explore",
  agents_file: ".claude/agents/code-analyzer.md",
  model: "opus",
  prompt: """
    기능 요청: [사용자 요청 원문]
    기존 코드 패턴을 분석하고 TDD 스펙 초안을 {WORKSPACE_DIR}/01_spec.md에 저장하라.
    SKIP_TESTS 판단을 반드시 포함하라.
  """
)
```

#### Step 1-B: TDD 스펙 질문 출력 (필수 중단점)

스펙 초안을 바탕으로 기획 확인을 출력한다.
**사용자가 ok/ㅇㅋ/yes/진행 등으로 확인하기 전까지 Phase 2를 절대 시작하지 않는다.**

`01_spec.md`의 `SKIP_TESTS` 값을 한 줄로 표시:
```
[테스트: 생성함 | 스킵 — 단순 수정]
```

> 사용자 수정 반영 후 `{WORKSPACE_DIR}/01_spec.md`에 확정 저장.

---

### Phase 1.5: 테스트 파일 생성

`{WORKSPACE_DIR}/01_spec.md`에서 `SKIP_TESTS: true`이면 **이 Phase 전체를 건너뛰고** Phase 2로 진행한다.

`SKIP_TESTS: false`일 때:

```
Agent(
  subagent_type: "general-purpose",
  agents_file: ".claude/agents/test-writer.md",
  model: "sonnet",
  prompt: """
    {WORKSPACE_DIR}/01_spec.md를 읽고 성공 조건을 기준으로 테스트 파일을 생성하라.
    생성 결과와 실행 명령어를 {WORKSPACE_DIR}/01_test_plan.md에 저장하라.
  """
)
```

---

### Phase 2: 레이어 순서 구현

```
Agent(
  subagent_type: "general-purpose",
  agents_file: ".claude/agents/implementer.md",
  model: "opus",
  prompt: """
    {WORKSPACE_DIR}/01_spec.md 를 읽고 스택별 레이어 순서로 구현하라.
    {WORKSPACE_DIR}/01_test_plan.md 가 있으면 테스트 assertion 기준으로 구현하라.
    구현 결과를 {WORKSPACE_DIR}/02_implementation.md 에 저장하라.
  """
)
```

**스택별 레이어 순서:**

| 스택 | 레이어 순서 |
|------|------------|
| next / react | types → services → hooks → components → app |
| fastapi / django / flask | schemas → services → routers(views) |
| express | types → models → services → controllers → routes |
| nestjs | dto → entities → services → controllers → modules |
| go | models → repository → services → handlers |
| flutter | models → repository → providers → screens |
| 미지원 | 코드베이스 탐색 후 기존 패턴 추론 |

---

### Phase 3: 테스트 실행 + 스펙 기준 검증 (retry loop)

`RETRY_COUNT = 0`, `MAX_RETRIES = 2`

```
Agent(
  subagent_type: "general-purpose",
  agents_file: ".claude/agents/qa-validator.md",
  model: "sonnet",
  prompt: """
    {WORKSPACE_DIR}/01_test_plan.md, 01_spec.md, 02_implementation.md를 읽고 검증하라.
    결과를 {WORKSPACE_DIR}/03_qa_report.md에 저장하라.
  """
)
```

FAIL + `RETRY_COUNT < MAX_RETRIES` → Implementer 재호출 (최대 2회).

---

### Phase 4: 완료 보고 + 커밋 확인

```
## 구현 완료
[생성/수정 파일 목록]

## QA 결과: PASS | FAIL | PASS_WITH_WARNINGS

---
커밋 & 푸시 하시겠습니까?
팀 패턴으로 남기려면: ok + 저장
```

> **커밋 확인 없이 자동 커밋하지 않는다.**

| 사용자 응답 | 처리 |
|------------|------|
| `ok` / `yes` / `ㅇㅋ` | 커밋 & 푸시만. **Phase 4.5 실행 안 함** |
| `ok + 저장` / `저장` / `패턴 저장` | Step 4-B(이유) → 커밋 → **Phase 4.5 실행** |
| `no` | 종료 |

#### Step 4-B: 패턴 저장 이유 (저장 응답 시에만)

`ok + 저장` 응답 시, 커밋 직전에 한 줄 질문:

```
이번에 쓴 방식을 팀 패턴으로 남깁니다. 이유를 한 줄 적어주세요. (없으면 skip)
```

- 입력 있음 → `{WORKSPACE_DIR}/04_pattern_reason.md` 저장
- `skip` / 빈 입력 → reason 없이 진행

---

### Phase 4.5: 패턴 학습 (`ok + 저장` 시에만)

**`ok`만으로는 실행하지 않는다.** 사용자가 명시적으로 저장을 요청한 경우에만:

```
Agent(
  subagent_type: "general-purpose",
  agents_file: ".claude/agents/pattern-extractor.md",
  model: "sonnet",
  prompt: """
    사용자가 팀 패턴 저장을 승인했다 (user_approved).
    {WORKSPACE_DIR}/02_implementation.md와 커밋된 파일에서 패턴을 추출해
    .harness/patterns/local/*.yaml에만 등록하라. team/은 읽기 전용이다.
    {WORKSPACE_DIR}/04_pattern_reason.md 가 있으면 reason 필드에 반영하라.
  """
)
```

---

## 부분 재실행

| 요청 | 재호출 |
|------|--------|
| "스펙 다시 정해줘" | Phase 1 전체 |
| "테스트 다시 만들어줘" | Phase 1.5 |
| "구현 수정해줘" | Implementer |
| "QA 다시 해줘" | QA Validator |
| "전체 다시 해줘" | 전체 파이프라인 |
