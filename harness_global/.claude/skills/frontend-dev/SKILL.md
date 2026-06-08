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

React / Next.js (App Router) + TypeScript + TanStack Query 기반 MVVM 구조 프로젝트의 기능 개발을 4단계 TDD 파이프라인으로 조율한다.

**실행 모드:** 서브 에이전트 파이프라인 (기획 확인 → MVVM 구현 → TDD 검증 → 완료 보고)

---

## 기획 레벨 → 모델 매핑

요청 텍스트 맨 앞의 레벨 키워드를 감지하여 `DEPTH_MODEL`을 결정한다.

| 키워드 | 감지 패턴 | DEPTH_MODEL | 적합한 작업 |
|--------|----------|-------------|------------|
| `low` | `low:`, `[low]`, `(low)` | `haiku` | 단일 컴포넌트 수정, 스타일 변경, 텍스트 수정 |
| `mid` | `mid:`, `middle:`, `[mid]`, `(mid)` | `sonnet` | 1~2파일 + 훅/API 연결 |
| `high` | `high:`, `[high]`, `(high)` | `opus` | 신규 페이지, 다수 컴포넌트 연동, 모델 설계 포함 |
| (없음) | 키워드 미감지 | `haiku` | 기본값 |

**감지 규칙:** 요청 텍스트 맨 앞의 레벨 키워드만 인식한다. 본문 중간에 포함된 경우 레벨로 해석하지 않는다.

---

## 에이전트 팀

| 에이전트 | 파일 | 역할 |
|---------|------|------|
| Code Analyzer | `.claude/agents/code-analyzer.md` | 코드베이스 분석, 기존 패턴 탐색 |
| Implementer | `.claude/agents/implementer.md` | MVVM 순서로 실제 코드 구현 |
| QA Validator | `.claude/agents/qa-validator.md` | TDD 검증 + 잠재 위험 진단 |

---

## 워크플로우

### Phase 0: 컨텍스트 확인

1. **기획 레벨 감지** — 요청 맨 앞에서 레벨 키워드를 찾는다. `DEPTH_MODEL` 설정.
   - 감지 시 한 줄 출력: `[기획레벨: mid → sonnet]`

2. **`_workspace` 상태 확인**
   - **존재 + 부분 수정 요청** → 해당 에이전트만 재호출 (부분 재실행)
   - **존재 + 새 기능 요청** → `_workspace/`를 `_workspace_prev/`로 이동 후 새 실행
   - **미존재** → 초기 실행

---

### Phase 1: 기획 확인 (사용자 동의 필수)

**Step 1-A: 코드 분석**

```
Agent(
  subagent_type: "Explore",
  agents_file: ".claude/agents/code-analyzer.md",
  model: {DEPTH_MODEL},
  prompt: [기능 설명 + 분석 결과를 _workspace/01_analysis.md에 저장 지시]
)
```

**Step 1-B: 기획 의도 정리 및 사용자 확인 (필수 중단점)**

분석 결과를 바탕으로 아래 형식으로 출력하고 **반드시 사용자 확인을 기다린다. Phase 2는 사용자가 ok하기 전까지 절대 시작하지 않는다.**

```
## 기획 확인

**기능 요약:** [한 문장]

**구현 범위 (MVVM):**
- Model: [types/ 에 정의할 TypeScript 인터페이스 목록]
- ViewModel: [hooks/ 에 생성할 TanStack Query 훅 목록]
- View: [app/ 또는 components/ 에 생성/수정할 파일 목록]

**API 연동:**
- 엔드포인트: [경로 및 메서드]
- React Query 전략: [useQuery / useMutation / useInfiniteQuery]
- queryKey: [예상 키 구조]

**예상 파일 변경 목록:**
- 신규 생성: ...
- 수정: ...

이 기획으로 진행할까요? (수정 사항 있으면 말씀해 주세요)
```

> **사용자가 ok/ㅇㅋ/진행/yes 등으로 확인하기 전까지 Phase 2를 시작하지 않는다.**

---

### Phase 2: MVVM 구현 (Implementer)

Phase 1 사용자 확인 후 실행:

```
Agent(
  subagent_type: "general-purpose",
  agents_file: ".claude/agents/implementer.md",
  model: {DEPTH_MODEL},
  prompt: [_workspace/01_analysis.md를 읽고 MVVM 순서로 구현 + _workspace/02_implementation.md에 결과 저장]
)
```

**구현 순서 (MVVM 고정):**
1. **Model** — `types/` TypeScript 인터페이스 & API 응답/요청 타입 정의
2. **API Service** — `services/` 또는 `lib/api/` fetch/axios 함수 작성
3. **ViewModel** — `hooks/` TanStack Query 훅 (`useQuery` / `useMutation`) 작성
4. **View** — `app/[feature]/page.tsx` + `components/` 에 ViewModel 연동

---

### Phase 3: TDD 검증 (QA Validator)

```
Agent(
  subagent_type: "general-purpose",
  agents_file: ".claude/agents/qa-validator.md",
  model: {DEPTH_MODEL},
  prompt: [01_analysis.md + 02_implementation.md 읽고 구현 파일 직접 열어 검증 + _workspace/03_qa_report.md 저장]
)
```

**검증 항목:**
- 타입 경계면: API 응답 타입 ↔ ViewModel 훅 반환값 ↔ View props 일치
- React Query 설정: queryKey 충돌, staleTime/gcTime 적절성
- 잠재적 런타임 에러: undefined 접근, 비동기 처리 누락, 메모리 누수
- 테스트 파일: 핵심 훅·유틸 단위 테스트(`.test.ts`) 존재 여부 확인

---

### Phase 4: 완료 보고 + 커밋 확인

`_workspace/03_qa_report.md`를 읽어 요약 보고 후 커밋 여부를 묻는다:

```
## 구현 완료
[생성/수정된 파일 목록]

## QA 결과: PASS | FAIL | PASS_WITH_WARNINGS
[핵심 검증 결과]

## 주의사항
[FAIL 또는 WARNING이 있는 경우 구체적 내용]

---
커밋 & 푸시 하시겠습니까?
```

> 사용자가 ok/ㅇㅋ/yes 등으로 확인하면 커밋 & 푸시 실행:
> - 커밋 메시지 형식: `feat: [기능 요약]` / `fix: [버그 요약]` / `refactor: [내용]`
> - `git add -A && git commit -m "..." && git push`

---

## 데이터 전달 프로토콜

| Phase | 입력 | 출력 |
|-------|------|------|
| Analyzer (1-A) | 사용자 요청 (텍스트) | `_workspace/01_analysis.md` |
| 사용자 확인 (1-B) | 기획 요약 출력 | 사용자 ok |
| Implementer (2) | `_workspace/01_analysis.md` | 실제 파일 + `_workspace/02_implementation.md` |
| QA Validator (3) | `_workspace/01,02*.md` + 구현 파일 | `_workspace/03_qa_report.md` |

---

## 에러 핸들링

- **Analyzer 실패**: 관련 파일을 직접 읽고 Implementer에게 컨텍스트 직접 전달
- **Implementer 블로커**: `02_implementation.md`의 블로커를 사용자에게 보고하고 방향 결정 요청
- **QA FAIL**: 심각 문제만 Implementer 재호출하여 수정. 주의 수준은 보고만 함

---

## 부분 재실행 가이드

| 요청 유형 | 재호출 에이전트 |
|----------|--------------|
| "분석 다시 해줘" | Analyzer만 |
| "구현 수정해줘" | Implementer만 (01_analysis.md 재사용) |
| "QA 다시 해줘" | QA Validator만 |
| "전체 다시 해줘" | 전체 파이프라인 |
