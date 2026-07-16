# 하위 태스크 진행도 배지 + 자동완료 설계 스펙

**날짜:** 2026-07-16
**상태:** 승인됨

---

## 배경

[[이슈 하위 태스크(개발 체크리스트)]](./2026-07-16-issue-subtasks-design.md) 기능으로 이슈마다 개발자용 체크리스트가 생겼다. 그 스펙은 "접힌 상태에서 N/M 완료 요약 배지"를 명시적으로 범위 밖으로 뺐다 — 모든 이슈의 하위 태스크를 미리 로드해야 해서 "펼칠 때만 로드"하는 방식과 충돌한다는 이유였다.

사용자가 실제로 하위 태스크 기능을 써본 뒤, 이슈 카드가 접힌 상태에서도 진행도(예: `33% (1/3)`)를 보고 싶고, 100%가 되면 노션처럼 자동으로 완료 처리되길 원한다고 요청했다. 이번 스펙은 그 트레이드오프를 다시 설계해 범위 밖이었던 항목을 들여온다.

## 목표

- 이슈 카드(접힌 상태 포함)에 하위 태스크 진행도 배지를 보여준다 — `N% (M/T)` 형식
- 하위 태스크가 전부 완료(100%)되면 이슈 자체가 자동으로 "완료" 상태로 전환된다
- 기존 "펼칠 때만 하위 태스크 목록을 로드" 방식은 그대로 유지한다 — 배지는 목록 전체를 로드하지 않고 집계값만 가져온다

## 범위 밖

- 하위 태스크가 하나도 없는 이슈에 배지 표시 — 배지 자체를 안 띄운다
- 자동완료 이후 다시 체크 해제해도 이슈 상태를 되돌리는 것 — 한 번 완료되면 유지
- 배지 클릭으로 펼치기 등 추가 인터랙션 — 기존 ▶/▼ 화살표가 이미 그 역할을 한다

---

## 데이터 & API

새 테이블 없음. `GET /api/projects/:id/issues` 응답에만 집계 필드를 추가한다.

**주의:** 기존 `listIssuesByProject`(`apps/issue-board-mcp/src/models/issues.ts`)는 REST 라우트 말고도 `mcp/server.ts`(`list_issues` MCP 툴), `models/projects.ts`(`getProjectContext`), `models/plans.ts`(기획 동기화 로직)에서도 그대로 쓰이고 있다. 이 함수의 반환 타입을 바꾸면 세 곳 모두 영향을 받으므로, **기존 함수는 건드리지 않고** REST 리스트 라우트 전용 새 함수를 추가한다.

**모델 함수** (`apps/issue-board-mcp/src/models/issues.ts`, 신규 추가):

```ts
export function listIssuesByProjectWithProgress(
  db: Database.Database,
  projectId: number
): (Issue & { subtaskProgress: { total: number; done: number } | null })[] {
  const rows = db
    .prepare(
      `SELECT i.*,
              COUNT(s.id) AS subtask_total,
              SUM(CASE WHEN s.done THEN 1 ELSE 0 END) AS subtask_done
       FROM issues i
       LEFT JOIN issue_subtasks s ON s.issue_id = i.id
       WHERE i.project_id = ?
       GROUP BY i.id
       ORDER BY i.number ASC`
    )
    .all(projectId) as any[]
  return rows.map((row) => ({
    ...rowToIssue(row),
    subtaskProgress: row.subtask_total > 0 ? { total: row.subtask_total, done: row.subtask_done } : null,
  }))
}
```

이 함수는 REST의 `GET /api/projects/:projectId/issues` 라우트에서만 쓰인다(기존 `listIssuesByProject` 호출을 이 함수 호출로 교체). `get_issue_by_number`, `approveIssueForDev`, `completeIssue`, `list_issues` MCP 툴, 기획 동기화 로직 등 다른 진입점은 전부 기존 `listIssuesByProject`/`getIssue`를 그대로 쓴다 — `Issue` 코어 타입에는 `subtaskProgress`를 추가하지 않는다(불필요한 곳까지 집계 쿼리를 강제하지 않기 위해).

**프론트엔드** (`apps/issue-board/src/lib/api.ts`):

```ts
export interface Issue {
  // ...기존 필드
  subtaskProgress: { total: number; done: number } | null
}
```

---

## 자동완료 트리거

체크박스 토글(`PUT /api/subtasks/:id`)이나 삭제(`DELETE /api/subtasks/:id`)로 인해 해당 이슈의 하위 태스크가 **전부 완료**되면, 이슈 상태를 자동으로 `done`으로 전환한다. 새 함수를 만들지 않고 기존 `completeIssue(db, issueId)`(`apps/issue-board-mcp/src/models/issues.ts`)를 재사용한다 — harness 파이프라인이 개발 완료 시 호출하는 것과 동일한 함수로, `status='done'` 설정 + Notion 푸시를 함께 처리한다.

공유 헬퍼를 하나 추가한다 (`apps/issue-board-mcp/src/models/subtasks.ts`, `import { getIssue, completeIssue } from './issues.js'` 추가 — 순환 참조 없음, `issues.ts`는 `subtasks.ts`를 import하지 않는다):

```ts
export async function maybeAutoCompleteIssue(db: Database.Database, issueId: number): Promise<void> {
  const subtasks = listSubtasksByIssue(db, issueId)
  if (subtasks.length === 0) return
  const allDone = subtasks.every((s) => s.done)
  if (!allDone) return
  const issue = getIssue(db, issueId)
  if (!issue || issue.status === 'done') return
  await completeIssue(db, issueId)
}
```

- `PUT /api/subtasks/:id`: `updateSubtask` 이후, 응답 반환 전에 `maybeAutoCompleteIssue(db, updated.issueId)`를 `await`한다.
- `DELETE /api/subtasks/:id`: 삭제 전에 `getSubtask`로 `issueId`를 먼저 확보해두고, 삭제 후 `maybeAutoCompleteIssue(db, issueId)`를 `await`한다.
- `issue.status === 'done'` 가드 덕분에 이미 완료된 이슈에서 반복 토글해도 `completeIssue`(및 Notion 푸시)가 중복 호출되지 않는다.
- 되돌림 없음: 완료 후 체크를 다시 풀거나 태스크를 더 추가해 퍼센트가 100% 밑으로 떨어져도 `status`는 그대로 `done`을 유지한다 — `maybeAutoCompleteIssue`는 100%→미만 방향으로는 아무것도 하지 않는다(all-done이 아니면 그냥 return).

두 라우트 핸들러(`apps/issue-board-mcp/src/rest/app.ts`)는 이미 동기 함수였는데, `completeIssue`가 비동기(Notion 푸시 때문에)라 `async`로 바꿔야 한다 — 기존 `approve_issue`/`complete_issue` 라우트가 이미 이 패턴을 쓰고 있으므로 그대로 따른다.

---

## UI

`apps/issue-board/src/components/IssueList.tsx`의 상태 배지(`STATUS_STYLE[issue.status]`, 색이 있는 pill)와는 다르게, 진행도는 배경/테두리 없는 **플레인 텍스트**로 옆에 붙인다 — 보내주신 노션 스크린샷의 `0% (0/2)`처럼:

```tsx
{issue.subtaskProgress && (
  <span className="text-xs text-zinc-400">
    {issue.subtaskProgress.done === issue.subtaskProgress.total
      ? '완료'
      : `${Math.round((issue.subtaskProgress.done / issue.subtaskProgress.total) * 100)}% (${issue.subtaskProgress.done}/${issue.subtaskProgress.total})`}
  </span>
)}
```

`subtaskProgress`가 `null`(하위 태스크 없음)이면 배지를 렌더링하지 않는다. 접힌 상태에서도 이 배지는 리스트 최초 로드 시점에 이미 가진 값이라 추가 API 호출이 없다 — `IssueSubtasks.tsx`가 펼칠 때 불러오는 상세 목록과는 별개의 데이터 소스다.

**동기화 주의:** `IssueSubtasks.tsx`에서 체크/삭제/추가로 하위 태스크가 바뀌면, 그 이슈의 `subtaskProgress`도 화면에서 갱신되어야 배지가 실시간으로 맞는다. `IssueList.tsx`가 `issues` 배열을 상태로 들고 있으므로, `IssueSubtasks`가 변경 후 콜백(`onProgressChange?: (progress: { total: number; done: number }) => void`)으로 부모에 알리고 `IssueList`가 해당 이슈의 `subtaskProgress`를 로컬로 갱신한다 — 매번 이슈 리스트 전체를 다시 fetch하지 않는다.

---

## 에러 처리

- `maybeAutoCompleteIssue`가 실패(예: Notion 푸시 실패)해도 하위 태스크 자체의 토글/삭제 응답은 이미 처리된 뒤이므로, 기존 `pushIssueToNotion`의 실패 허용 패턴(best-effort, 로그만 남기고 진행)을 그대로 따른다 — 새로 막을 필요 없음.
- 집계 쿼리는 `LEFT JOIN` + `GROUP BY`라 하위 태스크가 없는 이슈도 항상 한 행으로 나온다(COUNT(s.id)가 0) — null 이슈 누락 걱정 없음.

---

## 테스트

- 백엔드: `listIssuesByProjectWithProgress`가 `subtaskProgress`를 올바르게 계산하는지 단위 테스트(`apps/issue-board-mcp/src/models/issues.test.ts`) — 하위 태스크 0개/일부 완료/전부 완료 3가지 케이스. 기존 `listIssuesByProject`는 반환 타입이 안 바뀌었는지(회귀 없음) 기존 테스트가 그대로 통과하는 것으로 확인.
- `maybeAutoCompleteIssue` 단위 테스트(`apps/issue-board-mcp/src/models/subtasks.test.ts`) — 전부 완료 시 `status`가 `done`으로 바뀌는지, 이미 `done`인 이슈는 재호출해도 무해한지, 미완료가 섞이면 아무 일도 안 하는지.
- REST: `PUT /api/subtasks/:id`로 마지막 항목을 완료 처리하면 이슈 `status`가 `done`이 되는지, `DELETE`로 마지막 미완료 항목을 지워도 동일하게 되는지(`apps/issue-board-mcp/src/rest/app.test.ts`).
- 프론트: `IssueList.tsx`의 배지 렌더링과 `IssueSubtasks.tsx`의 진행도 콜백은 이 리포 관례대로 수동 브라우저 검증으로 마무리한다(기존 하위 태스크 UI 검증과 동일 방식).
