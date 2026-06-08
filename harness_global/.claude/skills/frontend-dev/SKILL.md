---
name: frontend-dev
description: "프론트엔드 기능 개발, 버그 수정, 컴포넌트 구현, 스토어/서비스 작업을 요청하면 반드시 이 스킬을 사용하라. Vue 컴포넌트 만들어줘, 스토어 수정해줘, 버그 고쳐줘, API 연결해줘, 페이지 추가해줘, 기능 구현해줘, 다시 실행해줘, 이전 결과 수정해줘 등 프론트엔드 코드 작업 요청에 모두 적용된다. 요청 앞에 'low:', 'mid:', 'high:' 레벨 키워드가 붙은 경우에도 반드시 이 스킬을 사용하라."
---

# 기능 개발 오케스트레이터

Vue 3 + Quasar + Pinia 기반 프론트엔드 프로젝트의 기능 개발을 3단계 파이프라인으로 조율한다.

**실행 모드:** 서브 에이전트 파이프라인 (분석 → 구현 → 검증)

## 기획 레벨 → 모델 매핑

요청 텍스트에서 레벨 키워드를 감지하여 `DEPTH_MODEL`을 결정한다. 이 모델은 모든 Agent 호출에 동일하게 적용된다.

| 키워드 | 감지 패턴 | DEPTH_MODEL | 적합한 작업 |
|--------|----------|-------------|------------|
| `low` | `low:`, `[low]`, `(low)` | `haiku` | 단일 컴포넌트 수정, 스타일 변경, 텍스트 수정 |
| `mid` | `mid:`, `middle:`, `[mid]`, `(mid)` | `sonnet` | 1~2파일 + 스토어/API 연결 |
| `high` | `high:`, `[high]`, `(high)` | `opus` | 신규 페이지, 다수 컴포넌트 연동, 설계 포함 |
| (없음) | 키워드 미감지 | `haiku` | 기본값 |

**감지 규칙:** 요청 텍스트 맨 앞의 레벨 키워드만 인식한다. 본문 중간에 "low"가 포함되어도 레벨로 해석하지 않는다.

## 에이전트 팀

| 에이전트 | 파일 | 역할 |
|---------|------|------|
| Code Analyzer | `.claude/agents/code-analyzer.md` | 코드베이스 분석, 패턴 탐색 |
| Implementer | `.claude/agents/implementer.md` | 실제 코드 구현 |
| QA Validator | `.claude/agents/qa-validator.md` | 경계면 교차 검증 |

## 워크플로우

### Phase 0: 컨텍스트 확인

1. **기획 레벨 감지** — 요청 텍스트 맨 앞에서 레벨 키워드를 찾는다. 감지된 키워드에 따라 `DEPTH_MODEL`을 설정한다. 키워드가 없으면 `haiku` 사용.
   - 레벨을 감지했으면 사용자에게 한 줄로 확인 메시지를 출력한다: `[기획레벨: low → haiku]`

2. **_workspace 상태 확인** — `_workspace/` 디렉토리 존재 여부 확인:
   - **존재 + 부분 수정 요청** → 해당 에이전트만 재호출 (부분 재실행)
   - **존재 + 새 기능 요청** → `_workspace/`를 `_workspace_prev/`로 이동 후 새 실행
   - **미존재** → 초기 실행

### Phase 1: 분석 (Code Analyzer)

```
Agent(
  subagent_type: "Explore",
  agents_file: ".claude/agents/code-analyzer.md",
  model: {DEPTH_MODEL},   ← Phase 0에서 결정된 모델 사용
  prompt: [기능 설명 + 분석 결과를 _workspace/01_analysis.md에 저장 지시]
)
```

**프롬프트 구성 시 포함 사항:**
- 사용자가 요청한 기능의 정확한 설명
- 탐색해야 할 역할/도메인 (성우/연출자/음향감독/검수자/관리자 중)
- 유사 기능이 있다면 해당 파일 경로 힌트

### Phase 2: 구현 (Implementer)

Phase 1 완료 후 실행:

```
Agent(
  subagent_type: "general-purpose",
  agents_file: ".claude/agents/implementer.md",
  model: {DEPTH_MODEL},   ← Phase 0에서 결정된 모델 사용
  prompt: [_workspace/01_analysis.md를 읽고 구현 지시 + _workspace/02_implementation.md에 결과 저장]
)
```

**프롬프트 구성 시 포함 사항:**
- `_workspace/01_analysis.md` 읽기 지시
- 구현 범위 명시 (서비스/스토어/컴포넌트/라우트 중 어느 것)
- 기존 유사 파일 경로 (참조용)

### Phase 3: 검증 (QA Validator)

Phase 2 완료 후 실행:

```
Agent(
  subagent_type: "general-purpose",
  agents_file: ".claude/agents/qa-validator.md",
  model: {DEPTH_MODEL},   ← Phase 0에서 결정된 모델 사용
  prompt: [두 보고서 읽고 구현 파일 직접 열어 검증 + _workspace/03_qa_report.md에 결과 저장]
)
```

### Phase 4: 결과 보고

`_workspace/03_qa_report.md`를 읽어 사용자에게 요약 보고:

```
## 구현 완료
[생성/수정된 파일 목록]

## QA 결과: PASS | FAIL | PASS_WITH_WARNINGS
[핵심 검증 결과]

## 주의사항
[FAIL이나 WARNING이 있는 경우 구체적 내용]
```

## 데이터 전달 프로토콜

| Phase | 입력 | 출력 |
|-------|------|------|
| Analyzer | 사용자 요청 (텍스트) | `_workspace/01_analysis.md` |
| Implementer | `_workspace/01_analysis.md` | 실제 파일 + `_workspace/02_implementation.md` |
| QA Validator | `_workspace/01,02*.md` + 구현 파일 | `_workspace/03_qa_report.md` |

## 에러 핸들링

- **Analyzer 실패**: 관련 파일을 직접 읽고 Implementer에게 컨텍스트 직접 전달
- **Implementer 블로커 발생**: `02_implementation.md`의 블로커를 사용자에게 보고하고 방향 결정 요청
- **QA FAIL**: 심각 문제만 Implementer를 재호출하여 수정. 주의 수준은 사용자에게 보고만 함

## 부분 재실행 가이드

| 요청 유형 | 재호출 에이전트 |
|----------|--------------|
| "분석 다시 해줘" | Analyzer만 |
| "구현 수정해줘" | Implementer만 (01_analysis.md 재사용) |
| "QA 다시 해줘" | QA Validator만 |
| "전체 다시 해줘" | 전체 파이프라인 |

## 테스트 시나리오

### 정상 흐름
1. 사용자: "검수 페이지에 풀링 기능 추가해줘"
2. Analyzer → `src/pages/inspection/`, `src/stores/inspection.store.js`, `src/services/inspection.service.js` 탐색
3. Implementer → 서비스 메서드 추가, 스토어 액션 추가, 페이지 컴포넌트 수정
4. QA → API shape과 스토어 state 교차 검증

### 에러 흐름
1. Implementer가 블로커 발견 (API 엔드포인트 불명확)
2. `02_implementation.md`에 블로커 기록
3. 오케스트레이터가 사용자에게 API 스펙 요청
