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

  [패턴 — 로컬 저장]
  패턴 저장해줘, 저장해줘, 로컬 패턴 저장, 패턴 남겨줘

  [패턴 — 팀 승격]
  팀에 올려줘, 승격해줘, team-patterns에 올려줘, 팀 패턴으로 올려줘

  [패턴 — 조회/sync]
  local 패턴 보여줘, 패턴 목록, 팀 패턴 sync 해줘, 패턴 동기화

  [핸드오프 — Phase 2 구현 방식]
  Claude로 구현, 여기서 구현, Cursor 없이 구현

  [핸드오프 — Cursor 구현 후 복귀]
  구현 완료, QA 돌려줘, Phase 3 해줘, 테스트 검증해줘

  [이슈 — 기능 단위 추적]
  이슈 1번 수정, issue 2, #3 수정해줘, 이슈 5에서

  [제외 — 이 스킬을 쓰지 않는 경우]
  파일 읽어줘 / 코드 설명해줘 / 이게 뭐야 / 어떻게 동작해
  → 단순 질문·설명 요청은 직접 응답한다.
---

# 기능 개발 오케스트레이터

프로젝트 스택에 맞는 레이어 순서로 기능을 개발한다.
**기획 확인 → 스펙 확정 → 테스트 선행 작성 → (Cursor) 레이어 구현 → 테스트 실행 검증 → 커밋 확인** 파이프라인.

## 도구 역할 (핸드오프)

| Phase | 도구 | 비고 |
|-------|------|------|
| 1, 1.5 | **Claude** | 스펙·테스트 선행 작성 |
| **2** | **Cursor Agent** (기본) 또는 **Claude** | `harness.config.yaml` `phase2` |
| 3, 4, 4.5, 5 | **Claude** | QA·커밋·패턴·승격 |

Phase 2 기본값은 **`cursor-agent` CLI 자동 실행**이다. `phase2: claude` 또는 사용자가 "여기서 구현"이면 `implementer`를 쓴다.

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
| Implementer | 2 | 스택별 레이어 구현 (`phase2: claude` 일 때만) |
| QA Validator | 3 | 테스트 실행 + 스펙 달성 검증 + 위험 진단 |
| Pattern Extractor | 4.5 | 커밋 **후** 사용자 승인 시 `local/` 패턴 등록 |
| Pattern Promoter | 5 | 사용자 요청 시 `team-patterns/` draft PR 승격 |

---

## 워크플로우

### Phase 0: 컨텍스트 확인

1. **스택·Phase 2 모드 감지**
   ```bash
   cat harness.config.yaml 2>/dev/null | grep -E '^(stack|phase2):'
   ```
   `DETECTED_STACK` 설정. `auto`이거나 없으면 code-analyzer가 Step 0에서 감지.
   `PHASE2_MODE` = `harness.config.yaml`의 `phase2` 값. 없으면 **`cursor-agent`**.
   사용자가 이번 요청에서 `여기서 구현` / `Claude로 구현` / `Cursor 없이` → `PHASE2_MODE=claude` (일회성 오버라이드).
2. **이슈 ID (`ISSUE_ID`) — 기능 단위 (고정)**
   - `이슈 N번`, `issue N`, `#N` → **수정/amendment**: `ISSUE_ID=N`
   - `.harness/issues/N.yaml` 읽기 → 최신 `runs[].run_id` 를 `PARENT_RUN_ID`로 기록
   - **신규 기능** → `ISSUE_ID` = `.harness/issues/*.yaml` 최대 id + 1 (없으면 `1`)
   - `WORKSPACE_DIR` = `_workspace/{YYYY-MM-DD}_issue-{ISSUE_ID}_{slug}`
   - 예) `_workspace/2026-07-10_issue-1_user-login` · 수정 `_workspace/2026-07-11_issue-1_pw-fix`

3. `WORKSPACE_DIR` 결정
   - 오늘 날짜 + `issue-{ISSUE_ID}_` + 슬러그 (위 규칙 우선)
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

**`01_spec.md` frontmatter (필수):**

```yaml
---
issue_id: {ISSUE_ID}
parent_run_id: {PARENT_RUN_ID or null}
kind: initial | amendment
title: 기능 제목
---
```

수정 요청(`이슈 N번`)이면 `kind: amendment`, `parent_run_id`에 이전 run_id.

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

### Phase 2: 구현 (Cursor Agent 기본 · Claude 선택)

스펙 확정(Phase 1) 및 테스트 선행(Phase 1.5) 완료 후 `PHASE2_MODE`에 따라 분기한다. **질문하지 않는다.**

| `PHASE2_MODE` | 처리 |
|---------------|------|
| `cursor-agent` (기본) | Step 2-A → 2-B → **Phase 3 자동** |
| `claude` | Step 2-C (`implementer`) → Phase 3 |

#### Step 2-A: HANDOFF.md 작성 (`cursor-agent` 일 때)

`{WORKSPACE_DIR}/HANDOFF.md` 생성:

```markdown
# Phase 2 Handoff → Cursor Agent

status: pending
workspace_dir: {WORKSPACE_DIR}
stack: {DETECTED_STACK}

## 읽을 파일
- {WORKSPACE_DIR}/01_spec.md
- {WORKSPACE_DIR}/01_test_plan.md  # SKIP_TESTS=false 일 때

## 구현 후 작성
- {WORKSPACE_DIR}/02_implementation.md
- 이 파일 status → done
```

#### Step 2-B: cursor-agent 자동 실행

스크립트 경로 (우선순위):
1. `.harness/scripts/run-phase2-cursor.sh`
2. `scripts/run-phase2-cursor.sh` (harness_build 루트)

```bash
bash .harness/scripts/run-phase2-cursor.sh --workspace "{WORKSPACE_DIR}"
```

실패 시:
- `cursor-agent` 미설치 → 설치 안내 후 `phase2: claude`로 전환 제안 또는 Step 2-C 폴백
- 스크립트 exit ≠ 0 → 오류 출력 후 **중단** (사용자에게 수동 복구 또는 Claude 폴백 제안)

성공 시 `{WORKSPACE_DIR}/02_implementation.md` 존재 확인 후 **즉시 Phase 3** 진행 (같은 Claude 세션).

#### Step 2-C: Claude 구현 (`phase2: claude` 일 때)

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

완료 후 **Phase 3**으로 진행.

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

### Phase 2 → 3 복귀 (부분 재실행)

트리거: `구현 완료`, `QA 돌려줘`, `Phase 3 해줘`, `테스트 검증해줘`

`cursor-agent` 자동 파이프라인에서는 Phase 2 직후 Phase 3가 이어진다. 위 트리거는 **수동 복구·부분 재실행**용이다.

1. `{WORKSPACE_DIR}/02_implementation.md` 존재 확인 (없으면 요청)
2. **Phase 3** 실행

최신 `WORKSPACE_DIR`이 불명확하면 `_workspace/`에서 가장 최근 `02_implementation.md` 또는 `01_spec.md`가 있는 폴더를 사용한다.

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

FAIL + `RETRY_COUNT < MAX_RETRIES`:
- `PHASE2_MODE=cursor-agent` → `03_qa_report.md` FAIL 사유로 `run-phase2-cursor.sh --retry-reason "..."` 재실행 후 Phase 3 재검증
- `PHASE2_MODE=claude` → `implementer` 재호출 (최대 2회)

---

### Phase 4: 완료 보고 + 커밋

```
## 구현 완료
[생성/수정 파일 목록]

## QA 결과: PASS | FAIL | PASS_WITH_WARNINGS

---
커밋 & 푸시 하시겠습니까?
```

> **커밋 확인 없이 자동 커밋하지 않는다.**

| 사용자 응답 | 처리 |
|------------|------|
| `ok` / `yes` / `ㅇㅋ` / `커밋해줘` | 커밋 & 푸시 → `harness-report.sh` → **Step 4-A** |
| `no` / `아니오` | 종료 |

> `ok + 저장` 레거시: 커밋 후 Step 4-A에서 저장으로 이어짐 (하위 호환).

커밋 성공 후 **반드시** 이슈 동기화:

```bash
bash .harness/scripts/harness-report.sh
```

`.harness/issues/{ISSUE_ID}.yaml` 에 run·변경 파일이 누적된다. Hub 이슈 탭에서 추적.

#### Step 4-A: 로컬 패턴 저장 질문 (커밋 성공 후 필수)

커밋·푸시가 끝난 뒤 **반드시** 한 번만 질문한다. 커밋과 동시에 묻지 않는다.

```
커밋됐어요.
이번 구현 방식을 이 프로젝트 패턴(.harness/patterns/local/)에 저장할까요?
```

| 사용자 응답 | 처리 |
|------------|------|
| `예` / `저장` / `저장해줘` / `ㅇㅇ` / `패턴 저장` | Step 4-B → Phase 4.5 |
| `아니오` / `skip` / `안 함` | 종료. **팀 승격 질문하지 않음** |
| `뭐가 저장돼?` | 추출 예정 패턴 미리보기 후 다시 질문 |

#### Step 4-B: 패턴 저장 이유 (저장 응답 시만)

```
이유를 한 줄 적어주세요. (없으면 skip)
```

- 입력 있음 → `{WORKSPACE_DIR}/04_pattern_reason.md` 저장
- `skip` / 빈 입력 → reason 없이 Phase 4.5 진행

---

### Phase 4.5: 로컬 패턴 저장

커밋 완료 + Step 4-A에서 저장 승인한 경우에만:

```
Agent(
  subagent_type: "general-purpose",
  agents_file: ".claude/agents/pattern-extractor.md",
  model: "sonnet",
  prompt: """
    사용자가 프로젝트 로컬 패턴 저장을 승인했다 (user_approved).
    {WORKSPACE_DIR}/02_implementation.md와 방금 커밋된 파일에서 패턴을 추출해
    .harness/patterns/local/*.yaml에만 등록하라. team/은 읽기 전용이다.
    {WORKSPACE_DIR}/04_pattern_reason.md 가 있으면 reason 필드에 반영하라.
  """
)
```

완료 후 한 줄:

```
local에 N개 저장했어요. 다음 기능부터 이 프로젝트에서 자동 참조됩니다.
팀 공통으로 올리려면 나중에 "팀에 올려줘"라고 하세요.
```

---

### Phase 5: 팀 패턴 승격 (별도 요청 시만)

**커밋·로컬 저장 직후 자동 실행 금지.** 사용자가 명시 요청할 때만:

트리거: `팀에 올려줘`, `승격해줘`, `{id} 팀 패턴으로 올려줘`, `local 패턴 보여줘`

```
Agent(
  subagent_type: "general-purpose",
  agents_file: ".claude/agents/pattern-promoter.md",
  model: "sonnet",
  prompt: """
    사용자 승격 요청: [사용자 원문]
    .harness/patterns/local/ 후보를 보여주고, 선택된 패턴을 team-patterns/에 draft PR로 승격하라.
    scripts/promote-pattern.sh 를 사용할 수 있으면 사용하라.
  """
)
```

| 요청 | 처리 |
|------|------|
| `local 패턴 보여줘` | local vs team 목록·충돌만 출력 |
| `팀 패턴 sync 해줘` | `bash install.sh --sync-patterns .` 또는 sync-team-patterns.sh 실행 |

---

## 부분 재실행

| 요청 | 재호출 |
|------|--------|
| "스펙 다시 정해줘" | Phase 1 전체 |
| "테스트 다시 만들어줘" | Phase 1.5 |
| "구현 수정해줘" | Phase 2 (`PHASE2_MODE` 기준) |
| "QA 다시 해줘" | QA Validator |
| "패턴 저장해줘" | Phase 4.5 (커밋된 작업 기준) |
| "팀에 올려줘" / "승격해줘" | Phase 5 |
| "팀 패턴 sync 해줘" | sync-team-patterns.sh |
| "전체 다시 해줘" | 전체 파이프라인 |
