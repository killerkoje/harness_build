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

# 기능 개발 오케스트레이터

프로젝트의 스택(Next.js, FastAPI, Go, Flutter 등)에 맞는 레이어 순서로 기능을 개발한다.
**기획 확인 → 스펙 확정 → 테스트 선행 작성 → 레이어 구현 → 테스트 실행 검증 → 커밋 확인** 파이프라인.

---

## 기획 레벨 → 모델 매핑

요청 텍스트 맨 앞의 레벨 키워드를 감지하여 `DEPTH_MODEL`을 결정한다.

| 키워드 | 감지 패턴 | DEPTH_MODEL | 적합한 작업 |
|--------|----------|-------------|------------|
| `low` | `low:`, `[low]`, `(low)` | `haiku` | 단일 파일 수정, 스타일 변경 |
| `mid` | `mid:`, `[mid]`, `(mid)` | `sonnet` | 훅 + 서비스 + 컴포넌트 1~2개 |
| `high` | `high:`, `[high]`, `(high)` | `opus` | 신규 페이지, 다수 컴포넌트, 모델 설계 |
| (없음) | 미감지 | `haiku` | 기본값 |

감지 시 한 줄 출력: `[기획레벨: mid → sonnet]`

---

## 에이전트 팀

| 에이전트 | Phase | 역할 |
|---------|-------|------|
| Code Analyzer | 1 | 스택 감지 + 코드 패턴 탐색 + TDD 스펙 초안 생성 |
| Test Writer | 1.5 | 확정 스펙 기준 테스트 파일 선행 생성 (TDD Red) |
| Implementer | 2 | 스택별 레이어 순서로 구현 (TDD Green) |
| QA Validator | 3 | 테스트 실행 + 스펙 달성 검증 + 위험 진단 |

---

## 워크플로우

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

---

### Phase 1: TDD 스펙 정의 (사용자 확인 필수 중단점)

#### Step 1-A: 코드 분석 + 스펙 초안 생성

```
Agent(
  subagent_type: "Explore",
  agents_file: ".claude/agents/code-analyzer.md",
  model: {DEPTH_MODEL},
  prompt: """
    기능 요청: [사용자 요청 원문]
    기존 코드 패턴을 분석하고 TDD 스펙 초안을 _workspace/01_spec.md에 저장하라.
  """
)
```

#### Step 1-B: TDD 스펙 질문 출력 (필수 중단점)

Code Analyzer가 생성한 스펙 초안을 바탕으로 아래 형식을 출력한다.
자동 추론 항목은 `[추론]` 표시 후 채워두고, 사용자에게 확인/수정을 요청한다.
**사용자가 ok/ㅇㅋ/yes/진행 등으로 확인하기 전까지 Phase 2를 절대 시작하지 않는다.**

```
## 기획 확인

### 기능
- **무엇을 만드는가:** [추론: 한 문장]
- **성공 조건:** [추론: 이걸 완성했다고 볼 수 있는 기준 2~3개]
- **예외/엣지케이스:** (알고 있는 게 있으면 말씀해 주세요)

### 디자인
- **UI 구조:** [추론: 예) 카드 리스트 → 상세 모달]
- **주요 컴포넌트:** [추론: shadcn/ui 기준 - Card, Dialog, Button 등]
- **로딩 / 에러 / 빈 상태:** [추론: Skeleton / toast / 빈 메시지]

### 데이터
- **API 엔드포인트:** [추론 또는 "알려주세요"]
- **핵심 타입:** [추론: 예) { id: string, name: string, ... }]
- **React Query 전략:** [추론: useQuery / useMutation / useInfiniteQuery]

### 구현 범위
- 신규 생성: [추론: 파일 목록]
- 수정: [추론: 파일 목록]

---
수정할 부분이 있으면 말씀해 주세요. 없으면 ok로 진행합니다.
```

> 사용자가 내용을 수정하면 해당 항목을 반영하여 스펙을 업데이트한 뒤 다시 확인을 요청한다.
> 최종 확정된 스펙을 `_workspace/01_spec.md`에 저장한다.

---

### Phase 1.5: 테스트 파일 생성

Phase 1 사용자 확인(ok) 직후, Phase 2 구현 전에 실행한다.
**테스트 파일이 구현보다 먼저 존재해야 TDD다.**

> **`low:` 레벨 스킵:** `DEPTH_MODEL`이 `haiku`(low 또는 레벨 미지정)이면 이 Phase를 건너뛰고 Phase 2로 바로 진행한다.
> 단일 파일 스타일 수정·텍스트 변경 등 단순 작업에는 테스트 생성이 불필요하다.

```
Agent(
  subagent_type: "general-purpose",
  agents_file: ".claude/agents/test-writer.md",
  model: {DEPTH_MODEL},
  prompt: """
    _workspace/01_spec.md를 읽고 성공 조건을 기준으로 테스트 파일을 생성하라.
    - 테스트 환경(vitest/jest, msw 여부)을 먼저 감지하라.
    - 감지된 환경에 맞는 템플릿으로 실제 테스트 파일을 프로젝트에 작성하라.
    - 생성 결과와 실행 명령어를 _workspace/01_test_plan.md에 저장하라.
  """
)
```

완료 후 한 줄 출력:
```
[테스트 생성 완료] {생성된 파일 수}개 파일 → {테스트 러너} / {모킹 전략}
예) [테스트 생성 완료] 2개 파일 → vitest / MSW
```

`01_test_plan.md`에 `RUN: false`가 기록된 경우(테스트 러너 없음) 사용자에게 알린다:
```
⚠️ 테스트 러너 감지 안 됨. 테스트 파일은 생성되었으나 Phase 3에서 실행을 생략합니다.
   vitest 설치: pnpm add -D vitest @testing-library/react jsdom msw
```

---

### Phase 2: 레이어 순서 구현

Phase 1.5 완료 후 실행:

```
Agent(
  subagent_type: "general-purpose",
  agents_file: ".claude/agents/implementer.md",
  model: {DEPTH_MODEL},
  prompt: """
    _workspace/01_spec.md 를 읽고 확정된 스펙을 기준으로 스택별 레이어 순서로 구현하라.
    _workspace/01_test_plan.md 가 존재하면 반드시 읽고, 생성된 테스트 파일들을 직접 열어
    테스트 assertion 기준에 맞게 구현하라. 목표는 테스트가 PASS되는 코드다.
    구현 결과를 _workspace/02_implementation.md 에 저장하라.
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

`RETRY_COUNT = 0`, `MAX_RETRIES = 2`로 시작하여 아래 루프를 실행한다.

#### 3-A: QA Validator 호출

```
Agent(
  subagent_type: "general-purpose",
  agents_file: ".claude/agents/qa-validator.md",
  model: {DEPTH_MODEL},
  prompt: """
    아래 순서로 검증하라:
    1. _workspace/01_test_plan.md를 읽어 테스트 실행 여부를 확인하라.
       RUN: true이면 명시된 명령어로 테스트를 실행하고 결과를 캡처하라.
    2. _workspace/01_spec.md, _workspace/02_implementation.md를 읽고
       구현 파일을 직접 열어 스펙 달성 여부를 정적 검증하라.
    3. 결과를 _workspace/03_qa_report.md에 저장하라.
  """
)
```

#### 3-B: 결과 판정 + 분기

`_workspace/03_qa_report.md`를 읽어 판정한다:

**→ PASS 또는 PASS_WITH_WARNINGS:**
Phase 4로 진행.

**→ FAIL이고 `RETRY_COUNT < MAX_RETRIES`:**

`RETRY_COUNT`를 1 증가시키고, Implementer를 재호출한다:

```
Agent(
  subagent_type: "general-purpose",
  agents_file: ".claude/agents/implementer.md",
  model: {DEPTH_MODEL},
  prompt: """
    _workspace/03_qa_report.md의 FAIL 항목을 읽고 문제를 수정하라.
    - 테스트 FAIL: 해당 테스트가 PASS되도록 구현을 수정하라.
    - 정적 분석 [치명] 항목: 코드를 직접 수정하라.
    수정 완료 후 _workspace/02_implementation.md를 업데이트하라.
  """
)
```

Implementer 완료 후 3-A로 돌아가 재검증한다.

**→ FAIL이고 `RETRY_COUNT >= MAX_RETRIES`:**

자동 수정을 중단하고 사용자에게 보고한다:

```
## ⚠️ 자동 수정 한도 초과 ({MAX_RETRIES}회 시도)

### 미해결 FAIL 항목
[03_qa_report.md의 FAIL 목록]

### 원인 추정
[반복 실패 패턴 분석]

---
수동으로 확인 후 다시 시도하시겠습니까?
- "구현 수정해줘" → Implementer 재호출
- "QA 다시 해줘" → QA 재실행
- "일단 진행해" → FAIL 상태로 Phase 4 진행
```

**검증 기준 (스펙 우선):**
- 테스트 실행 결과 (PASS/FAIL) — 최우선
- Phase 1에서 정의한 성공 조건이 코드에서 달성되었는가
- 디자인 스펙의 컴포넌트/상태(로딩·에러·빈) 처리가 구현되었는가
- 타입 경계면: API 타입 ↔ 훅 ↔ props 일치
- 컨벤션 위반 여부 (`REACT_NEXT_CONVENTIONS.md` §14 금지사항)
- 잠재적 런타임 위험

---

### Phase 4: 완료 보고 + 커밋 확인

`_workspace/03_qa_report.md`를 읽어 보고 후 **항상 커밋 여부를 묻는다:**

```
## 구현 완료
[생성/수정 파일 목록]

## 스펙 달성 여부
[Phase 1 성공 조건별 ✅ / ❌]

## QA 결과: PASS | FAIL | PASS_WITH_WARNINGS
[핵심 내용]

## 주의사항
[FAIL / WARNING 내용 — 있을 경우만]

---
커밋 & 푸시 하시겠습니까?
(팀 패턴으로 남기려면: ok + 저장)
```

> **커밋 확인 없이 자동 커밋하지 않는다. 항상 물어본다.**
>
> 응답별 처리:
> - `yes` / `ok` / `ㅇㅋ` → Step 4-B(선택 이유) 후 커밋 & 푸시. Phase 4.5는 `source: [qa_pass]`
> - `yes + 저장` / `저장` / `패턴 저장` (이유 포함 가능) → Step 4-B(필요 시) 후 커밋 & 푸시. Phase 4.5는 `source: [user_approved, qa_pass]`
> - `no` → 커밋 없이 종료
>
> `yes + 저장`은 "이 구현 방식을 팀 패턴으로 명시 등록한다"는 의미다.

#### Step 4-B: 선택 이유 수집 (mid / high, 커밋 직전)

`DEPTH_MODEL`이 `haiku`(low)이면 이 Step을 건너뛰고 바로 커밋한다.

커밋 실행 **직전**에 아래 조건을 확인한다:

| 조건 | 처리 |
|------|------|
| 사용자 응답에 이미 이유가 포함됨 | `_workspace/04_pattern_reason.md`에 저장 후 질문 생략 |
| `yes + 저장`과 함께 이유를 적음 | 동일 |
| 위 해당 없음 | 선택 질문 1회 |

```
선택: 이번에 쓴 방식의 이유를 한 줄만 남길까요?
(다음 스펙 추론·패턴 학습에 반영됩니다. 없으면 skip)
```

- **입력 있음** → `_workspace/04_pattern_reason.md`에 저장 + 커밋 메시지 body에 포함
- **`skip` / 빈 입력** → 파일 생성 안 함, 커밋만 진행

`04_pattern_reason.md` 형식:

```markdown
# 패턴 선택 이유

- **기록 시각:** {ISO 날짜}
- **source:** user_approved | qa_pass
- **이유:** {사용자 입력 한 줄}
```

커밋 완료 직후 → **Phase 4.5** 실행.

---

### Phase 4.5: 패턴 학습 (mid / high만)

`DEPTH_MODEL`이 `haiku`(low)이면 이 Phase를 건너뛴다.

```
Agent(
  subagent_type: "general-purpose",
  agents_file: ".claude/agents/pattern-extractor.md",
  model: "sonnet",
  prompt: """
    커밋이 완료되었다.
    _workspace/02_implementation.md와 방금 커밋된 파일들을 읽고
    팀 패턴을 추출해 .harness/patterns/에 적재하라.

    source 컨텍스트: {SOURCE_CONTEXT}
    - "user_approved"이면 → source: [user_approved, qa_pass], 신뢰도 HIGH, AUTO 우선
    - "qa_pass"이면 → source: [qa_pass], 기존 패턴과 일치할 때만 AUTO, 첫 등장은 FLAG

    _workspace/04_pattern_reason.md 가 있으면 reason 필드 최우선으로 사용하라.
    AUTO 항목은 즉시 등록하고, SUGGEST 항목은 사용자에게 간결하게 제안하라.
  """
)
```

`{SOURCE_CONTEXT}`는 오케스트레이터가 사용자 응답(`yes` vs `yes + 저장`)에 따라 채운다.

---

## 데이터 전달 프로토콜

| Phase | 입력 | 출력 |
|-------|------|------|
| Analyzer (1-A) | 사용자 요청 원문 | `_workspace/01_spec.md` (초안) |
| 사용자 확인 (1-B) | 스펙 질문 출력 | 사용자 ok + `_workspace/01_spec.md` (확정) |
| Test Writer (1.5) | `_workspace/01_spec.md` | 테스트 파일 (프로젝트) + `_workspace/01_test_plan.md` |
| Implementer (2) | `_workspace/01_spec.md` + `_workspace/01_test_plan.md` + 테스트 파일 | 실제 파일 + `_workspace/02_implementation.md` |
| QA Validator (3) | `_workspace/01_test_plan.md` + `_workspace/01_spec.md` + `_workspace/02_implementation.md` + 구현 파일 | `_workspace/03_qa_report.md` |
| Implementer retry (3-B) | `_workspace/03_qa_report.md` | 수정된 실제 파일 + `_workspace/02_implementation.md` 업데이트 |
| 사용자 (4-B) | 선택 이유 입력 (mid/high) | `_workspace/04_pattern_reason.md` (있을 때만) |
| Pattern Extractor (4.5) | `_workspace/02_implementation.md` + `_workspace/04_pattern_reason.md`(있으면) + 커밋된 파일 + `.harness/patterns/` | `.harness/patterns/*.yaml` 업데이트 + 제안 출력 |

---

## 에러 핸들링

- **Analyzer 실패** → 스펙 초안 없이 오케스트레이터가 직접 TDD 질문 출력 후 진행
- **Implementer 블로커** → `02_implementation.md` 블로커를 사용자에게 보고 후 방향 결정 요청
- **QA FAIL** → 치명 문제만 Implementer 재호출. 주의 수준은 보고만 함

---

## 부분 재실행

| 요청 | 재호출 | 비고 |
|------|--------|------|
| "스펙 다시 정해줘" | Phase 1 전체 재실행 | 01_test_plan.md도 재생성 |
| "테스트 다시 만들어줘" | Phase 1.5 재실행 | 01_spec.md 재사용 |
| "구현 수정해줘" | Implementer만 (01_spec.md + 01_test_plan.md 재사용) | |
| "QA 다시 해줘" | QA Validator만 (retry_count 초기화) | |
| "전체 다시 해줘" | 전체 파이프라인 | |
