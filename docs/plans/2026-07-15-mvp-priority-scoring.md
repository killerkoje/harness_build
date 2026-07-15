# MVP 우선순위 점수제 알고리즘 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/ib-plan`이 MVP 기능마다 8개 기준으로 0/1/2점 채점해 우선순위(`높음`/`보통`/`낮음`)를 정하고, 그 근거를 기획서 표에 남기게 한다.

**Architecture:** 애플리케이션 코드 변경 없음 — MVP 표 템플릿에 "근거" 컬럼을 추가하고 채점 규칙을 `/ib-plan.md` 프롬프트에 추가하는 것으로 끝난다. 서버의 `parseMvpTable`이 이미 3번째 컬럼 이후를 무시하도록 구현돼 있어, 4번째 컬럼(근거)을 추가해도 이슈 생성 로직에 영향이 없다.

**Tech Stack:** Markdown 프롬프트 파일 1개 수정 (`harness_global/.claude/commands/ib-plan.md`). 검증은 기존 `apps/issue-board-mcp` REST API를 curl로 직접 호출해 파서 동작을 확인한다.

**참고 문서:** `docs/specs/2026-07-15-mvp-priority-scoring-design.md`

---

## 파일 구조

| 파일 | 역할 |
|---|---|
| `harness_global/.claude/commands/ib-plan.md` | (수정) MVP 표 템플릿에 "근거" 컬럼 추가 + 8기준 채점 규칙·등급 매핑·근거 표기 규칙 추가 |

이번 작업으로 새로 만들거나 수정하는 애플리케이션 코드 파일은 없다.

---

## Task 1: `/ib-plan.md` — MVP 표 템플릿 + 채점 규칙 추가

**Files:**
- Modify: `harness_global/.claude/commands/ib-plan.md`

- [ ] **Step 1: MVP 표 템플릿에 "근거" 컬럼 추가**

`harness_global/.claude/commands/ib-plan.md`에서 (기획서 마크다운 템플릿 코드 블록 안, 현재 70~74번 줄) 아래 텍스트를:

```
## 3. 핵심 기능 (MVP)
| 우선순위 | 기능 | 설명 |
| --- | --- | --- |
(우선순위는 **`높음` / `보통` / `낮음`** 중 하나로만 적는다 — 대시보드가 색 chip으로
렌더한다. **각 행이 이후 이슈 분리의 단위**가 된다.)
```

아래로 교체한다:

```
## 3. 핵심 기능 (MVP)
| 우선순위 | 기능 | 설명 | 근거 |
| --- | --- | --- | --- |
(우선순위는 **`높음` / `보통` / `낮음`** 중 하나로만 적는다 — 대시보드가 색 chip으로
렌더한다. **각 행이 이후 이슈 분리의 단위**가 된다. 우선순위와 "근거" 컬럼은 감으로
적지 말고, 아래 "우선순위 채점 기준" 절의 규칙을 따른다.)
```

- [ ] **Step 2: 채점 규칙 절 추가**

같은 파일에서, 기획서 템플릿 코드 블록이 끝나고 이어지는 안내 불릿 목록 마지막 줄(현재 103번 줄) 아래에 새 절을 추가한다. 아래 텍스트를:

```
- 추측으로 지어내지 말고, 확정된 것과 가정을 구분해 "핵심 가정/미결"에 적어라.

### 4) 보드에 적재
```

아래로 교체한다:

```
- 추측으로 지어내지 말고, 확정된 것과 가정을 구분해 "핵심 가정/미결"에 적어라.

**우선순위 채점 기준** — MVP 표의 우선순위는 감으로 정하지 말고, 아래 8개 기준으로
각 기능을 0/1/2점(0=해당없음, 1=부분적, 2=명확히 해당)으로 채점해 합산(0~16점)한 뒤
정한다 (모두 동일 가중치):

| 기준 | 질문 | 2점(명확히 해당) 기준 |
| --- | --- | --- |
| 사용자 가치 | 사용자의 핵심 문제를 해결하는가? | 없으면 사용자가 핵심 행동을 완료하기 어렵다 |
| 핵심 흐름 연결성 | 핵심 사용자 흐름 안에 있는가? | 없으면 탐색·신청·확인·수강·결과 확인 중 하나가 끊긴다 |
| 운영 가능성 | 운영자가 실제 업무를 처리하는 데 필요한가? | 없으면 운영자가 엑셀·수작업으로 우회해야 한다 |
| 데이터·정책 기반 | 나중에 구조를 바꾸기 어려운 기반인가? | 상태값·권한·이력·데이터 관계처럼 초기 설계가 중요하다 |
| 리스크 | 기술·보안·권한·외부 연동 리스크가 큰가? | 늦게 확인하면 전체 일정·구조에 큰 영향을 준다 |
| 개발 난이도 | 일정 안에 구현 가능한가? | 어렵더라도 핵심이면 단순 버전으로 포함을 검토한다 |
| 검증 효과 | 출시 후 중요한 학습을 줄 수 있는가? | 사용자 행동·운영 가능성을 확인할 데이터를 준다 |
| 대체 가능성 | 수동 운영·단순 방식으로 대체 가능한가? | 대체 불가능하면 우선순위가 높다 |

**등급 매핑:** 11~16점 → `높음`, 5~10점 → `보통`, 0~4점 → `낮음`.

**"근거" 컬럼 작성 규칙:** 8개 기준을 전부 나열하지 말고, 점수를 가장 크게 끌어올리거나
내린 1~2개 기준만 압축해서 적은 뒤 `(합산점수/16)`을 괄호로 남긴다.
예: `핵심흐름 필수·대체불가 (13/16)`.

### 4) 보드에 적재
```

- [ ] **Step 3: 육안 검토**

`harness_global/.claude/commands/ib-plan.md` 전체를 다시 읽어 확인한다:
- `### 1)` ~ `### 5)` 섹션 헤딩과 그 안의 하위 번호(`1.`/`2.`/`3.` 등)가 깨지지 않았는지
- 기획서 마크다운 템플릿 코드 블록(```로 감싼 부분)이 여전히 올바르게 열리고 닫히는지
- 새로 추가한 채점 규칙 절이 "### 4) 보드에 적재" 헤딩 앞, 코드 블록 밖에 있는지 (코드 블록 안에 프롬프트 지침이 섞여 들어가면 기획서 산출물에 그대로 출력돼버림 — 반드시 코드 블록 밖에 있어야 한다)

- [ ] **Step 4: 커밋**

```bash
git add harness_global/.claude/commands/ib-plan.md
git commit -m "docs(ib-plan): score MVP priority against 8 weighted criteria instead of ad-hoc judgment"
```

---

## Task 2: 파서 호환성 수동 검증

**Files:** 없음 (검증 전용 — 코드 변경이 없으므로 자동화 테스트 추가 대상이 없다. `docs/specs/2026-07-15-mvp-priority-scoring-design.md`의 "테스트" 절 참고)

이 태스크는 실제 `/ib-plan` LLM 세션을 돌리지 않고, 서버가 4컬럼 표를 정말로 안전하게 처리하는지 REST API를 직접 호출해 확인한다 (설계 문서의 핵심 전제 — "서버는 3번째 컬럼까지만 파싱하고 4번째는 무시한다" — 를 실증한다).

- [ ] **Step 1: 서버 기동**

```bash
cd apps/issue-board-mcp && npm run dev
```

Run (다른 터미널에서, 뜰 때까지 대기):
```bash
i=0; until curl -sf http://localhost:4000/api/projects >/dev/null 2>&1 || [ $i -ge 30 ]; do sleep 1; i=$((i+1)); done
curl -sf http://localhost:4000/api/projects >/dev/null 2>&1 && echo "mcp up" || echo "mcp NOT up"
```
Expected: `mcp up`

- [ ] **Step 2: 4컬럼 MVP 표가 포함된 기획서를 `content`로 생성**

```bash
mkdir -p /tmp/priority-scoring-test
PROJECT=$(curl -s -X POST http://localhost:4000/api/projects -H 'Content-Type: application/json' -d '{"rootPath":"/tmp/priority-scoring-test"}')
PID=$(echo "$PROJECT" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).id))")
echo "projectId=$PID"

CONTENT='# 테스트 프로젝트

## 1. 개요 / 목적
> 🎯 **목적** — 테스트.

**플랫폼:** 웹

## 2. 타깃 사용자 & 유스케이스
| 페르소나 | 니즈 | 핵심 유스케이스 |
| --- | --- | --- |
| 사용자 | 로그인 | 이메일 로그인 |

## 3. 핵심 기능 (MVP)
| 우선순위 | 기능 | 설명 | 근거 |
| --- | --- | --- | --- |
| 높음 | 로그인 | 이메일 로그인 | 핵심흐름 필수·대체불가 (13/16) |
| 낮음 | 테마 변경 | 다크모드 | 사용자가치는 있으나 핵심흐름 아님 (3/16) |

## 4. 범위 밖 (Out of Scope)
> ⚠️ **범위 밖** — 소셜 로그인.
'

PLAN=$(curl -s -X POST "http://localhost:4000/api/projects/$PID/plans" \
  -H 'Content-Type: application/json' \
  -d "$(node -e "console.log(JSON.stringify({title: '테스트 기획', content: process.argv[1]}))" "$CONTENT")")
echo "$PLAN" | node -e "
process.stdin.on('data', d => {
  const plan = JSON.parse(d)
  console.log('mvpFeatures:', JSON.stringify(plan.sections.mvpFeatures))
  console.log('markdown includes 근거 column:', plan.sections.markdown.includes('| 근거 |'))
})
"
```

Expected 출력 (정확히 이 구조):
```
mvpFeatures: [{"priority":"높음","title":"로그인","description":"이메일 로그인"},{"priority":"낮음","title":"테마 변경","description":"다크모드"}]
markdown includes 근거 column: true
```

이 결과가 설계 문서의 핵심 전제를 증명한다: `mvpFeatures`(구조화 데이터, 이슈 생성에 쓰임)에는 "근거" 컬럼 내용이 전혀 섞이지 않고 정확히 3개 필드만 파싱됐고, 동시에 `sections.markdown`(대시보드가 그대로 렌더하는 원문)에는 "근거" 컬럼이 그대로 살아있다.

- [ ] **Step 3: 승인 → 이슈 생성까지 정상 동작하는지 확인**

```bash
PLAN_ID=$(echo "$PLAN" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).id))")
curl -s -X POST "http://localhost:4000/api/plans/$PLAN_ID/approve" | node -e "
process.stdin.on('data', d => {
  const r = JSON.parse(d)
  console.log('issues:', r.issues.map(i => i.number + ':' + i.title + ':' + i.priority))
})
"
```

Expected:
```
issues: [ '1:로그인:높음', '2:테마 변경:낮음' ]
```

이슈의 `priority`/`title`이 "근거" 컬럼과 무관하게 정확히 반영됐는지 확인한다.

- [ ] **Step 4: 정리**

```bash
curl -s -X DELETE "http://localhost:4000/api/projects/$PID" -o /dev/null -w "delete status: %{http_code}\n"
rm -rf /tmp/priority-scoring-test
kill %1 2>/dev/null || pkill -f "tsx watch" 2>/dev/null
```

이 태스크는 검증 전용이라 별도 커밋이 없다 (Task 1의 커밋이 이번 작업의 유일한 변경분).
