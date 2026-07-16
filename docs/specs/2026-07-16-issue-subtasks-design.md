# 이슈 하위 태스크(개발 체크리스트) 설계 스펙

**날짜:** 2026-07-16
**상태:** 승인됨

---

## 배경

issue-board의 "이슈"는 기획 MVP 표의 한 행이 그대로 이슈 하나가 되는 구조라, Notion에서 흔히 쓰는 에픽/스토리처럼 계층이 없다. 사용자가 Notion에서 상위 항목(에픽/스토리) 아래 하위 항목을 펼치기(▶/▼)로 넣나드는 화면을 예시로 들며, issue-board의 이슈도 **개발자가 실제로 뭘 해야 하는지 체크리스트로 세분화**하고 싶어했다.

## 목표

- 이슈 하나 아래에 개발자용 체크리스트(하위 태스크)를 붙인다 — 제목 + 완료여부만
- `/ib-plan`이 기획을 승인해 이슈를 생성하는 바로 그 시점에 AI가 하위 태스크를 자동 제안한다 (별도 승인 게이트 없이 바로)
- 대시보드 이슈 탭에서 이슈를 펼치면(▶/▼) 하위 태스크가 보이고, 사람이 추가/수정/삭제할 수 있다
- 기존 이슈 구조(우선순위/상태/Notion 동기화 등)는 그대로 둔다 — 이슈 "위"에 새 레벨을 만드는 게 아니라 "아래"에 붙이는 것

## 범위 밖

- 하위 태스크 재정렬(드래그 등) — 생성 순서(`id ASC`) 고정
- 하위 태스크에 설명/우선순위 등 추가 필드 — 제목 + 완료여부만
- 접힌 상태에서 "N/M 완료" 요약 배지 — 이러려면 모든 이슈의 하위 태스크를 미리 로드해야 해서, 지금 설계한 "펼칠 때만 로드" 방식과 충돌한다. 필요해지면 별도로 다시 설계
- 기획 개정으로 **업데이트되는** 기존 이슈의 하위 태스크 재생성 — 신규 생성 이슈에만 AI 제안 적용 (아래 "트리거" 참고)
- `/ib-approve` 변경 — 이 커맨드는 그대로 순수 게이트로 유지

---

## 데이터 모델

새 테이블 `issue_subtasks` 하나만 추가 (`apps/issue-board-mcp/src/db.ts`, 기존 `wireframes`/`design_systems`와 같은 FK 패턴):

```sql
CREATE TABLE IF NOT EXISTS issue_subtasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  issue_id INTEGER NOT NULL REFERENCES issues(id),
  title TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)
```

순서는 별도 `position` 컬럼 없이 `id ASC`(생성 순서)로 정렬 — "라운드" 기능에서 쓴 것과 같은 방식.

`Subtask` 타입(`apps/issue-board-mcp/src/types.ts`):
```ts
export interface Subtask {
  id: number
  issueId: number
  title: string
  done: boolean
  createdAt: string
  updatedAt: string
}
```

---

## 트리거: `/ib-plan` 기획 승인 시점

이슈가 실제 DB에 생기는 시점은 기획 승인(`approvePlanAndCreateIssues`, `create_plan`+승인 또는 `update_plan(status="approved")`)이다 — 이보다 더 이를 수 없다. 이 호출은 이미 새로 생성된 이슈 목록을 응답으로 돌려주고 있으므로(`{ plan, issues }`), `/ib-plan.md`는 이 응답을 받은 직후 각 신규 이슈의 제목/설명을 보고 개발 체크리스트 3~7개를 만들어 새 MCP 툴 `add_subtasks`로 바로 저장하도록 지침을 추가한다. 별도 확인 질문 없이 진행한다(대시보드에서 언제든 수정 가능하므로).

**기획 개정(`sync_plan_issues`) 시엔 신규 생성된 이슈에만 적용한다.** `syncIssuesFromPlan`은 이미 `created`/`updated`를 구분해 반환하므로, `updated` 쪽 이슈는 하위 태스크를 건드리지 않는다 — 이미 개발자가 체크해둔 진행 상황을 AI가 덮어쓰면 안 되기 때문이다.

`/ib-approve.md`는 변경하지 않는다 — 순수 게이트 역할 그대로.

---

## API 표면

**백엔드 REST** (`apps/issue-board-mcp`, 기존 와이어프레임 라우트와 같은 패턴):

| 메서드 | 경로 | 역할 |
|---|---|---|
| GET | `/api/issues/:id/subtasks` | 목록 조회 |
| POST | `/api/issues/:id/subtasks` | 하나 생성 `{ title }` |
| PUT | `/api/subtasks/:id` | 수정 `{ title?, done? }` |
| DELETE | `/api/subtasks/:id` | 삭제 |

**MCP 툴** (`apps/issue-board-mcp/src/mcp/server.ts`, `/ib-plan`이 승인 직후 호출):

- `add_subtasks({ issueId, titles: string[] })` — 여러 개를 한 번에 생성 (AI 제안용)

**모델 함수** (`apps/issue-board-mcp/src/models/subtasks.ts`, 신규):

- `listSubtasksByIssue(db, issueId): Subtask[]`
- `createSubtask(db, issueId, title): Subtask`
- `createSubtasksBulk(db, issueId, titles: string[]): Subtask[]`
- `updateSubtask(db, id, fields: { title?: string; done?: boolean }): void`
- `deleteSubtask(db, id): boolean`

**프론트엔드** (`apps/issue-board/src/lib/api.ts`):

- `Subtask` 타입(백엔드와 동일 필드)
- `fetchSubtasks(issueId)`, `createSubtask(issueId, title)`, `updateSubtask(id, fields)`, `deleteSubtask(id)`

---

## UI

`apps/issue-board/src/components/IssueList.tsx`의 각 이슈 카드 왼쪽에 ▶/▼ 펼치기 화살표를 추가한다 (클릭 시 로컬 state로 펼침/접힘 토글, 페이지 이동 없음 — 기존 Notion 상태 드롭다운과 같은 클라이언트 상호작용 방식).

펼친 하위 태스크 영역은 새 컴포넌트 `apps/issue-board/src/components/IssueSubtasks.tsx`(클라이언트 컴포넌트)로 분리한다 — `IssueList.tsx`가 비대해지는 것을 막고, 하위 태스크 관련 fetch/상태를 이 컴포넌트 하나에 가둔다:

- 체크박스 목록 — 클릭 시 바로 `updateSubtask(id, { done })` PUT
- 각 항목 옆 삭제(×) 버튼 — `deleteSubtask`
- 맨 아래 "+ 새 하위 항목" 인라인 입력 — 엔터/버튼으로 `createSubtask`

하위 태스크는 **해당 이슈를 처음 펼칠 때만** `fetchSubtasks`로 불러온다 (컴포넌트 마운트 시 1회, 이후 로컬 state로 관리). 접힌 이슈나 페이지 최초 로드 시엔 하위 태스크 API를 호출하지 않는다 — 요약 배지(N/M 완료)를 넣지 않기로 한 것과 같은 이유(범위 밖 참고).

---

## 에러 처리

- 존재하지 않는 이슈/하위 태스크에 대한 PUT/DELETE → 404 (기존 와이어프레임/Notion 상태 라우트와 동일 패턴)
- `/ib-plan`에서 AI의 하위 태스크 생성이 실패하거나 빈 배열을 반환해도 기획 승인 자체(이슈 생성)는 그대로 진행된다 — 하위 태스크는 부가 기능이라 승인 흐름을 막지 않는다
- 프론트에서 `fetchSubtasks` 실패 시 펼친 영역 안에만 에러 문구를 표시한다 — 이슈 목록 전체는 죽지 않는다 (기존 `ConnectionErrorBanner`류 패턴과 동일한 격리 원칙)

---

## 테스트

- 백엔드: `subtasks.ts` 모델 함수 단위 테스트 (`apps/issue-board-mcp/src/models/subtasks.test.ts`, `createDb(':memory:')` 패턴), REST 4개 라우트 테스트 (`apps/issue-board-mcp/src/rest/app.test.ts`에 추가)
- 프론트: `apps/issue-board/src/lib/api.ts`에 추가되는 4개 함수 테스트 (`api.test.ts`에 추가, 기존 `fetch` mock 패턴)
- `IssueSubtasks.tsx`, 이슈 카드 펼치기 UI, `/ib-plan.md` 문구 변경은 이 리포 관례대로 자동화 테스트를 두지 않고 **수동 브라우저 검증**으로 마무리한다. AI가 실제로 어떤 하위 태스크를 제안하는지는 코드로 테스트할 수 없는 영역이므로, MCP 툴 호출 → DB → REST → UI로 이어지는 배관이 정상 동작하는지만 REST 레벨(curl/스크립트)로 실증한다 (기존 세션에서 우선순위 채점 기능 검증 때 썼던 방식과 동일).
