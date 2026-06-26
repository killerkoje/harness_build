# 레벨 자동 추론 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 레벨 키워드(`low:` / `mid:` / `high:`) 없이 요청 텍스트만 입력해도, 하네스가 자동으로 기획 레벨을 추론하고 애매한 경우엔 사용자에게 물어본다.

**Architecture:** Phase 0에서 텍스트 분석으로 예비 레벨 결정(명확 → 진행, 애매 → 질문). Phase 1에서 code-analyzer가 코드베이스 스캔 후 `INFERRED_LEVEL`을 `01_spec.md`에 포함. 오케스트레이터가 두 값을 비교해 레벨 보정이 필요하면 출력 후 변경.

**Tech Stack:** 프롬프트 파일(Markdown) 편집만. 코드 변경 없음.

---

## 변경 파일

| 파일 | 변경 내용 |
|------|---------|
| `harness_global/.claude/skills/dev/SKILL.md` | 기획 레벨 테이블 수정 + Phase 0에 자동 추론 로직 추가 + Phase 1-A 완료 후 보정 체크 추가 |
| `harness_global/.claude/agents/code-analyzer.md` | Step 4 출력 스펙 템플릿에 `## 추론 레벨` 섹션 추가 |
| `harness_global/stacks/next/agents/code-analyzer.md` | 출력 프로토콜 템플릿에 `## 추론 레벨` 섹션 추가 |

---

## Task 1: SKILL.md — 기획 레벨 테이블 + Phase 0 자동 추론 로직

**Files:**
- Modify: `harness_global/.claude/skills/dev/SKILL.md`

- [ ] **Step 1: 기획 레벨 테이블 마지막 행 수정**

`harness_global/.claude/skills/dev/SKILL.md`에서 아래 행을:

```markdown
| (없음) | 미감지 | `haiku` | 기본값 |
```

다음으로 교체:

```markdown
| (없음) | 미감지 → **자동 추론** | 추론 결과에 따라 결정 | 텍스트 분석 → 명확하면 자동 결정, 애매하면 사용자 질문 |
```

- [ ] **Step 2: Phase 0 Step 1 아래에 자동 추론 로직 블록 추가**

현재 Phase 0 Step 1 내용:

```markdown
감지 시 한 줄 출력: `[기획레벨: mid → sonnet]`
```

이 줄 바로 아래에 다음 블록 추가:

```markdown
### 레벨 미감지 시: 자동 추론

레벨 키워드가 없으면 요청 텍스트를 분석하여 예비 레벨을 결정한다.

#### 추론 기준표

| 신호 | 판정 |
|------|------|
| "텍스트", "색", "스타일", "오타", 단일 속성 변경 | `low` |
| 컴포넌트·훅·API·엔드포인트 단수 명시, 신규 1~2개 파일 예상 | `mid` |
| "페이지", "플로우", "전체", "모듈", "시스템", 복수 레이어 언급 | `high` |
| "버그", "에러", "고쳐", 범위 불명확한 "기능 만들어줘" | 애매 |

#### 명확 케이스

`DEPTH_MODEL`을 추론 레벨로 설정하고 한 줄 출력 후 Phase 1 진행 (중단점 없음):

```
[레벨 추론: mid → sonnet | 신규 훅+서비스]
```

#### 애매 케이스

사용자에게 질문하고 답변을 기다린다:

```
범위가 명확하지 않아 레벨을 판단하기 어렵습니다.
low (단순 수정) / mid (기능 1~2개) / high (신규 페이지·모듈)?
```

사용자가 레벨을 답하면 → `DEPTH_MODEL` 설정 후 Phase 1 진행.
이 경우 `LEVEL_USER_SPECIFIED: true`로 표시해 Phase 1 보정 시 무시한다.
```

- [ ] **Step 3: Phase 1-A 완료 후 레벨 보정 로직 추가**

`Phase 1: TDD 스펙 정의` 섹션의 `#### Step 1-B: TDD 스펙 질문 출력` 바로 위에 다음 블록 추가:

```markdown
#### Step 1-A 완료 후: 레벨 보정 확인

`{WORKSPACE_DIR}/01_spec.md`의 `INFERRED_LEVEL`을 읽어 Phase 0 예비 레벨과 비교한다.

| Phase 0 예비 레벨 | Phase 1 INFERRED_LEVEL | 처리 |
|------------------|------------------------|------|
| 동일 | 동일 | 조용히 유지 (출력 없음) |
| mid | high | `[레벨 조정: mid → high \| {근거}]` 출력 + `DEPTH_MODEL` 변경 |
| high | mid | `[레벨 조정: high → mid \| {근거}]` 출력 + `DEPTH_MODEL` 변경 |
| `LEVEL_USER_SPECIFIED: true` | 다른 값 | 무시 — 사용자 답변 레벨 유지 |
| Phase 1 `INFERRED_LEVEL` 없음 | — | Phase 0 값 유지 |
```

- [ ] **Step 4: 파일 읽어 세 변경 사항 모두 존재 확인**

`harness_global/.claude/skills/dev/SKILL.md`를 읽어 다음 세 항목이 모두 있는지 확인:
1. 기획 레벨 테이블에 "자동 추론" 텍스트 포함
2. "레벨 미감지 시: 자동 추론" 섹션 존재
3. "Step 1-A 완료 후: 레벨 보정 확인" 섹션 존재

- [ ] **Step 5: 커밋**

```bash
git add harness_global/.claude/skills/dev/SKILL.md
git commit -m "feat: dev 스킬 Phase 0 레벨 자동 추론 + Phase 1 보정 로직 추가"
```

---

## Task 2: 범용 code-analyzer.md — INFERRED_LEVEL 출력 추가

**Files:**
- Modify: `harness_global/.claude/agents/code-analyzer.md`

- [ ] **Step 1: Step 4 스펙 템플릿에 `## 추론 레벨` 섹션 추가**

`harness_global/.claude/agents/code-analyzer.md`의 Step 4 스펙 템플릿에서 `## 주의사항` 섹션 바로 위에 다음 섹션 추가:

```markdown
## 추론 레벨
- INFERRED_LEVEL: {low | mid | high}
- 근거: {1줄 — 신규 필요 레이어 수, 기존 코드 유무, 예상 파일 수 등}
```

예시:
```markdown
## 추론 레벨
- INFERRED_LEVEL: mid
- 근거: 기존 useAuth 훅 존재, 신규 서비스 1개 + 컴포넌트 1개 필요
```

**추론 기준 (code-analyzer가 코드 스캔 후 판단):**

| 상황 | INFERRED_LEVEL |
|------|---------------|
| 단일 파일 수정, 기존 파일에 줄 추가 | `low` |
| 신규 파일 1~3개, 기존 레이어 내 작업 | `mid` |
| 신규 파일 4개+, 새 레이어 필요, 기존 코드 없음 | `high` |

- [ ] **Step 2: 파일 읽어 섹션 존재 확인**

`harness_global/.claude/agents/code-analyzer.md`를 읽어 `## 추론 레벨` + `INFERRED_LEVEL` 텍스트가 Step 4 템플릿 내에 있는지 확인.

- [ ] **Step 3: 커밋**

```bash
git add harness_global/.claude/agents/code-analyzer.md
git commit -m "feat: 범용 code-analyzer INFERRED_LEVEL 출력 추가"
```

---

## Task 3: next/code-analyzer.md — INFERRED_LEVEL 출력 추가

**Files:**
- Modify: `harness_global/stacks/next/agents/code-analyzer.md`

- [ ] **Step 1: 출력 프로토콜 템플릿에 `## 추론 레벨` 섹션 추가**

`harness_global/stacks/next/agents/code-analyzer.md`의 출력 프로토콜 Markdown 템플릿에서 `## 주의사항` 섹션 바로 위에 다음 섹션 추가:

```markdown
## 추론 레벨
- INFERRED_LEVEL: {low | mid | high}
- 근거: {1줄 — 신규 필요 레이어 수, 기존 코드 유무, 예상 파일 수 등}
```

예시:
```markdown
## 추론 레벨
- INFERRED_LEVEL: high
- 근거: 기존 auth 레이어 없음, types/services/hooks/components/app 전체 신규 생성 필요
```

**추론 기준 (코드 스캔 후 판단, Next.js 특화):**

| 상황 | INFERRED_LEVEL |
|------|---------------|
| 기존 컴포넌트 스타일·텍스트 수정 | `low` |
| 기존 훅·서비스 있음 + 신규 컴포넌트 1~2개 | `mid` |
| 기존 기능 없음 + types/services/hooks 전체 신규 or 신규 페이지 | `high` |

- [ ] **Step 2: 파일 읽어 섹션 존재 확인**

`harness_global/stacks/next/agents/code-analyzer.md`를 읽어 `## 추론 레벨` + `INFERRED_LEVEL` 텍스트가 출력 프로토콜 템플릿 내에 있는지 확인.

- [ ] **Step 3: 커밋**

```bash
git add harness_global/stacks/next/agents/code-analyzer.md
git commit -m "feat: next code-analyzer INFERRED_LEVEL 출력 추가"
```
