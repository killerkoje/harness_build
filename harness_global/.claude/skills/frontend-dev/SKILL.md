---
name: frontend-dev
description: |
  아래 조건 중 하나라도 해당하면 반드시 이 스킬을 사용하라. 예외 없음.

  [코드 생성/수정 동사]
  만들어줘, 만들어, 추가해줘, 추가해, 구현해줘, 구현해, 작성해줘, 작성해,
  수정해줘, 수정해, 고쳐줘, 고쳐, 바꿔줘, 바꿔, 변경해줘, 변경해,
  연결해줘, 연결해, 붙여줘, 붙여, 넣어줘, 넣어, 달아줘, 달아

  [대상 명사 — 위 동사와 함께 쓰인 경우]
  컴포넌트, 페이지, 훅, hook, 기능, API, 서비스, 타입, 타입스크립트,
  폼, form, 버튼, 모달, 다이얼로그, 레이아웃, 헤더, 푸터, 사이드바,
  리스트, 카드, 테이블, 차트, 필터, 검색, 인증, 로그인, 회원가입,
  대시보드, 마이페이지, 설정 페이지, 상세 페이지

  [버그/에러 수정]
  버그, 에러, 오류, 안 돼, 안돼, 작동 안 해, 깨져, 터져, 안 나와, 안나와,
  고쳐, 고쳐줘, 수정해줘, 왜 이래, 뭐가 문제야

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

React / Next.js (App Router) + TypeScript + TanStack Query 기반 MVVM 프로젝트의 기능 개발을
**TDD 스펙 정의 → MVVM 구현 → 스펙 기준 검증 → 커밋 확인** 4단계 파이프라인으로 조율한다.

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

| 에이전트 | 역할 |
|---------|------|
| Code Analyzer | 기존 코드 패턴 탐색 + TDD 스펙 초안 생성 |
| Implementer | 확정된 스펙 기준으로 MVVM 순서 구현 |
| QA Validator | 스펙 달성 여부 검증 + 위험 진단 |

---

## 워크플로우

### Phase 0: 컨텍스트 확인

1. 레벨 키워드 감지 → `DEPTH_MODEL` 설정
2. `_workspace/` 상태 확인
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

### Phase 2: MVVM 구현

Phase 1 사용자 확인 후 실행:

```
Agent(
  subagent_type: "general-purpose",
  agents_file: ".claude/agents/implementer.md",
  model: {DEPTH_MODEL},
  prompt: """
    _workspace/01_spec.md 를 읽고 확정된 스펙을 기준으로 MVVM 순서로 구현하라.
    구현 결과를 _workspace/02_implementation.md 에 저장하라.
  """
)
```

**구현 순서 (MVVM 고정):**
1. **Model** — `types/` TypeScript 인터페이스 & API 응답/요청 타입
2. **Service** — `services/` 또는 `lib/api/` fetch 함수
3. **ViewModel** — `hooks/` TanStack Query 훅
4. **View** — `app/[feature]/page.tsx` + `components/`

---

### Phase 3: 스펙 기준 검증

```
Agent(
  subagent_type: "general-purpose",
  agents_file: ".claude/agents/qa-validator.md",
  model: {DEPTH_MODEL},
  prompt: """
    _workspace/01_spec.md (확정 스펙) 와 _workspace/02_implementation.md 를 읽고
    구현 파일을 직접 열어 스펙 달성 여부를 검증하라.
    결과를 _workspace/03_qa_report.md 에 저장하라.
  """
)
```

**검증 기준 (스펙 우선):**
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
```

> 사용자가 ok/ㅇㅋ/yes 확인 시 실행:
> `git add -A && git commit -m "feat|fix|refactor: [요약]" && git push`
>
> **커밋 확인 없이 자동 커밋하지 않는다. 항상 물어본다.**

---

## 데이터 전달 프로토콜

| Phase | 입력 | 출력 |
|-------|------|------|
| Analyzer (1-A) | 사용자 요청 원문 | `_workspace/01_spec.md` (초안) |
| 사용자 확인 (1-B) | 스펙 질문 출력 | 사용자 ok + `_workspace/01_spec.md` (확정) |
| Implementer (2) | `_workspace/01_spec.md` | 실제 파일 + `_workspace/02_implementation.md` |
| QA Validator (3) | `_workspace/01_spec.md` + `_workspace/02_implementation.md` + 구현 파일 | `_workspace/03_qa_report.md` |

---

## 에러 핸들링

- **Analyzer 실패** → 스펙 초안 없이 오케스트레이터가 직접 TDD 질문 출력 후 진행
- **Implementer 블로커** → `02_implementation.md` 블로커를 사용자에게 보고 후 방향 결정 요청
- **QA FAIL** → 치명 문제만 Implementer 재호출. 주의 수준은 보고만 함

---

## 부분 재실행

| 요청 | 재호출 |
|------|--------|
| "스펙 다시 정해줘" | Phase 1 전체 재실행 |
| "구현 수정해줘" | Implementer만 (01_spec.md 재사용) |
| "QA 다시 해줘" | QA Validator만 |
| "전체 다시 해줘" | 전체 파이프라인 |
