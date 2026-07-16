# 하위 태스크 진행도 배지 + 자동완료 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 이슈 카드에 하위 태스크 진행도(`33% (1/3)`)를 배지로 보여주고, 하위 태스크가 100% 완료되면 이슈 자체가 자동으로 `done` 상태로 전환되게 한다.

**Architecture:** 새 테이블 없이 `issues` LEFT JOIN `issue_subtasks` 집계 쿼리 하나로 진행도를 계산해 `GET /api/projects/:id/issues` 응답에 붙인다. 하위 태스크 토글/삭제로 전부 완료 상태가 되면 기존 `completeIssue()`를 재사용하는 공유 헬퍼 `maybeAutoCompleteIssue`가 이슈 status를 `done`으로 전환한다. 프론트는 진행도가 바뀔 때마다 콜백으로 부모 리스트에 알려 배지와 상태 pill을 실시간으로 갱신한다.

**Tech Stack:** better-sqlite3(SQL 집계 쿼리), Express REST, Next.js/React(클라이언트 컴포넌트), Vitest.

**참고 문서:** `docs/specs/2026-07-16-subtask-progress-badge-design.md`(설계 스펙), `docs/specs/2026-07-16-issue-subtasks-design.md`(기반이 된 하위 태스크 기능 스펙)

---

### Task 1: 백엔드 — 진행도 포함 이슈 조회 함수

**Files:**
- Modify: `apps/issue-board-mcp/src/models/issues.ts`
- Test: `apps/issue-board-mcp/src/models/issues.test.ts`

기존 `listIssuesByProject`는 `mcp/server.ts`(`list_issues` 툴), `models/projects.ts`(`getProjectContext`), `models/plans.ts`(기획 동기화)에서도 쓰이고 있으므로 건드리지 않는다. REST 이슈 리스트 라우트 전용으로 새 함수를 하나 추가한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/issue-board-mcp/src/models/issues.test.ts` 상단 import에 `createSubtask`, `updateSubtask`를 추가한다:

```ts
import {
  createIssuesFromPlan,
  listIssuesByProject,
  getIssue,
  setIssueStatus,
  approveIssueForDev,
  completeIssue,
  listIssuesByProjectWithProgress,
} from './issues.js'
import { createSubtask, updateSubtask } from './subtasks.js'
```

`describe('issues model', ...)` 블록 안, 기존 `listIssuesByProject returns issues ordered by number` 테스트 바로 아래에 추가:

```ts
  describe('listIssuesByProjectWithProgress', () => {
    it('reports null subtaskProgress when an issue has no subtasks', () => {
      createIssuesFromPlan(db, projectId, planId, [sections.mvpFeatures[0]])
      const [withProgress] = listIssuesByProjectWithProgress(db, projectId)
      expect(withProgress.subtaskProgress).toBeNull()
    })

    it('reports total/done counts when subtasks exist', () => {
      const [issue] = createIssuesFromPlan(db, projectId, planId, [sections.mvpFeatures[0]])
      createSubtask(db, issue.id, '하나')
      const second = createSubtask(db, issue.id, '둘')
      updateSubtask(db, second.id, { done: true })

      const [withProgress] = listIssuesByProjectWithProgress(db, projectId)
      expect(withProgress.subtaskProgress).toEqual({ total: 2, done: 1 })
    })

    it('keeps the same number ordering as listIssuesByProject', () => {
      createIssuesFromPlan(db, projectId, planId, sections.mvpFeatures)
      const list = listIssuesByProjectWithProgress(db, projectId)
      expect(list.map((i) => i.number)).toEqual([1, 2])
    })
  })
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `cd apps/issue-board-mcp && npx vitest run src/models/issues.test.ts`
Expected: FAIL — `listIssuesByProjectWithProgress is not a function` (아직 구현 전)

- [ ] **Step 3: 함수 구현**

`apps/issue-board-mcp/src/models/issues.ts`의 `listIssuesByProject` 함수(현재 90번째 줄 부근) 바로 아래에 추가:

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
    subtaskProgress:
      row.subtask_total > 0 ? { total: row.subtask_total, done: row.subtask_done } : null,
  }))
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd apps/issue-board-mcp && npx vitest run src/models/issues.test.ts`
Expected: PASS (기존 테스트 포함 전체)

- [ ] **Step 5: 커밋**

```bash
git add apps/issue-board-mcp/src/models/issues.ts apps/issue-board-mcp/src/models/issues.test.ts
git commit -m "feat(issue-board-mcp): add listIssuesByProjectWithProgress"
```

---

### Task 2: 백엔드 — 자동완료 헬퍼

**Files:**
- Modify: `apps/issue-board-mcp/src/models/subtasks.ts`
- Test: `apps/issue-board-mcp/src/models/subtasks.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/issue-board-mcp/src/models/subtasks.test.ts` 상단 import를 다음으로 교체:

```ts
import { createIssuesFromPlan, getIssue } from './issues.js'
import {
  listSubtasksByIssue,
  createSubtask,
  createSubtasksBulk,
  getSubtask,
  updateSubtask,
  deleteSubtask,
  maybeAutoCompleteIssue,
} from './subtasks.js'
```

`describe('subtasks model', ...)` 블록 끝(마지막 `it('deleteSubtask ...')` 다음)에 추가:

```ts
  describe('maybeAutoCompleteIssue', () => {
    it('sets the issue status to done when every subtask is done', async () => {
      const a = createSubtask(db, issueId, '하나')
      const b = createSubtask(db, issueId, '둘')
      updateSubtask(db, a.id, { done: true })
      updateSubtask(db, b.id, { done: true })

      await maybeAutoCompleteIssue(db, issueId)

      expect(getIssue(db, issueId)?.status).toBe('done')
    })

    it('does nothing while some subtasks are still open', async () => {
      const a = createSubtask(db, issueId, '하나')
      createSubtask(db, issueId, '둘')
      updateSubtask(db, a.id, { done: true })

      await maybeAutoCompleteIssue(db, issueId)

      expect(getIssue(db, issueId)?.status).toBe('planned')
    })

    it('does nothing when the issue has no subtasks at all', async () => {
      await maybeAutoCompleteIssue(db, issueId)
      expect(getIssue(db, issueId)?.status).toBe('planned')
    })

    it('is a no-op when the issue is already done', async () => {
      const a = createSubtask(db, issueId, '하나')
      updateSubtask(db, a.id, { done: true })
      await maybeAutoCompleteIssue(db, issueId)
      expect(getIssue(db, issueId)?.status).toBe('done')

      // Re-running after it's already done must not throw or change anything.
      await maybeAutoCompleteIssue(db, issueId)
      expect(getIssue(db, issueId)?.status).toBe('done')
    })
  })
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `cd apps/issue-board-mcp && npx vitest run src/models/subtasks.test.ts`
Expected: FAIL — `maybeAutoCompleteIssue is not a function`

- [ ] **Step 3: 함수 구현**

`apps/issue-board-mcp/src/models/subtasks.ts` 상단 import에 추가:

```ts
import { getIssue, completeIssue } from './issues.js'
```

(순환 참조 없음 — `issues.ts`는 `subtasks.ts`를 import하지 않는다.)

파일 맨 아래(`deleteSubtask` 다음)에 추가:

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

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd apps/issue-board-mcp && npx vitest run src/models/subtasks.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add apps/issue-board-mcp/src/models/subtasks.ts apps/issue-board-mcp/src/models/subtasks.test.ts
git commit -m "feat(issue-board-mcp): auto-complete issue when all subtasks are done"
```

---

### Task 3: 백엔드 — REST 이슈 리스트에 진행도 연결

**Files:**
- Modify: `apps/issue-board-mcp/src/rest/app.ts`
- Test: `apps/issue-board-mcp/src/rest/app.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/issue-board-mcp/src/rest/app.test.ts`에서 하위 태스크 관련 테스트들이 모여있는 구간(기존 `PUT /api/subtasks/:id returns 400 for an empty title` 테스트 다음)에 추가:

```ts
  it('GET /api/projects/:id/issues includes subtaskProgress per issue', async () => {
    const project = (await request(app).post('/api/projects').send({ rootPath: projectRoot })).body
    const plan = (
      await request(app)
        .post(`/api/projects/${project.id}/plans`)
        .send({
          title: 'p',
          sections: {
            overview: 'o',
            targetUsers: 't',
            mvpFeatures: [{ priority: '높음', title: '로그인', description: 'd' }],
            outOfScope: 'x',
          },
        })
    ).body
    await request(app).post(`/api/plans/${plan.id}/approve`)
    const issue = (await request(app).get(`/api/projects/${project.id}/issues`)).body[0]

    const noSubtasks = (await request(app).get(`/api/projects/${project.id}/issues`)).body[0]
    expect(noSubtasks.subtaskProgress).toBeNull()

    await request(app).post(`/api/issues/${issue.id}/subtasks`).send({ title: 't' })
    const withSubtasks = (await request(app).get(`/api/projects/${project.id}/issues`)).body[0]
    expect(withSubtasks.subtaskProgress).toEqual({ total: 1, done: 0 })
  })
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `cd apps/issue-board-mcp && npx vitest run src/rest/app.test.ts -t "includes subtaskProgress"`
Expected: FAIL — `withSubtasks.subtaskProgress` is `undefined`, not `{ total: 1, done: 0 }`

- [ ] **Step 3: 라우트 교체**

`apps/issue-board-mcp/src/rest/app.ts` 상단 import(현재 21-28번째 줄)에서 `listIssuesByProject`를 `listIssuesByProjectWithProgress`로 교체:

```ts
import {
  listIssuesByProjectWithProgress,
  getIssue,
  setIssueStatus,
  approveIssueForDev,
  completeIssue,
  setIssueNotionStatus,
} from '../models/issues.js'
```

`GET /api/projects/:projectId/issues` 라우트(현재 132-134번째 줄) 본문을 교체:

```ts
  app.get('/api/projects/:projectId/issues', (req, res) => {
    res.json(listIssuesByProjectWithProgress(db, Number(req.params.projectId)))
  })
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd apps/issue-board-mcp && npx vitest run src/rest/app.test.ts`
Expected: PASS (전체 — 다른 라우트가 `listIssuesByProject`에 의존하지 않는지도 이걸로 같이 확인된다)

- [ ] **Step 5: 커밋**

```bash
git add apps/issue-board-mcp/src/rest/app.ts apps/issue-board-mcp/src/rest/app.test.ts
git commit -m "feat(issue-board-mcp): expose subtaskProgress on the issue list route"
```

---

### Task 4: 백엔드 — 하위 태스크 토글/삭제 시 자동완료 트리거

**Files:**
- Modify: `apps/issue-board-mcp/src/rest/app.ts`
- Test: `apps/issue-board-mcp/src/rest/app.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/issue-board-mcp/src/rest/app.test.ts`, Task 3에서 추가한 테스트 다음에 추가:

```ts
  it('PUT /api/subtasks/:id auto-completes the issue once the last subtask is checked off', async () => {
    const project = (await request(app).post('/api/projects').send({ rootPath: projectRoot })).body
    const plan = (
      await request(app)
        .post(`/api/projects/${project.id}/plans`)
        .send({
          title: 'p',
          sections: {
            overview: 'o',
            targetUsers: 't',
            mvpFeatures: [{ priority: '높음', title: '로그인', description: 'd' }],
            outOfScope: 'x',
          },
        })
    ).body
    await request(app).post(`/api/plans/${plan.id}/approve`)
    const issue = (await request(app).get(`/api/projects/${project.id}/issues`)).body[0]
    const created = await request(app).post(`/api/issues/${issue.id}/subtasks`).send({ title: 't' })

    await request(app).put(`/api/subtasks/${created.body.id}`).send({ done: true })

    const updatedIssue = (await request(app).get(`/api/issues/${issue.id}`)).body
    expect(updatedIssue.status).toBe('done')
  })

  it('DELETE /api/subtasks/:id auto-completes the issue when the last open subtask is removed', async () => {
    const project = (await request(app).post('/api/projects').send({ rootPath: projectRoot })).body
    const plan = (
      await request(app)
        .post(`/api/projects/${project.id}/plans`)
        .send({
          title: 'p',
          sections: {
            overview: 'o',
            targetUsers: 't',
            mvpFeatures: [{ priority: '높음', title: '로그인', description: 'd' }],
            outOfScope: 'x',
          },
        })
    ).body
    await request(app).post(`/api/plans/${plan.id}/approve`)
    const issue = (await request(app).get(`/api/projects/${project.id}/issues`)).body[0]
    const done = await request(app).post(`/api/issues/${issue.id}/subtasks`).send({ title: '완료됨' })
    const open = await request(app).post(`/api/issues/${issue.id}/subtasks`).send({ title: '미완료' })
    await request(app).put(`/api/subtasks/${done.body.id}`).send({ done: true })

    await request(app).delete(`/api/subtasks/${open.body.id}`)

    const updatedIssue = (await request(app).get(`/api/issues/${issue.id}`)).body
    expect(updatedIssue.status).toBe('done')
  })
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `cd apps/issue-board-mcp && npx vitest run src/rest/app.test.ts -t "auto-completes"`
Expected: FAIL — `updatedIssue.status`가 `'planned'`(자동완료 로직이 아직 없음)

- [ ] **Step 3: 라우트 구현**

`apps/issue-board-mcp/src/rest/app.ts` 상단 import(subtasks 모델 import 줄, 현재 30번째 줄)를 교체:

```ts
import {
  listSubtasksByIssue,
  createSubtask,
  getSubtask,
  updateSubtask,
  deleteSubtask,
  maybeAutoCompleteIssue,
} from '../models/subtasks.js'
```

`PUT /api/subtasks/:id`와 `DELETE /api/subtasks/:id` 라우트(현재 174-186번째 줄)를 교체:

```ts
  app.put('/api/subtasks/:id', asyncHandler(async (req, res) => {
    const { title, done } = req.body ?? {}
    if (title !== undefined && !title) return res.status(400).json({ error: 'title required' })
    const updated = updateSubtask(db, Number(req.params.id), { title, done })
    if (!updated) return res.status(404).json({ error: 'not found' })
    await maybeAutoCompleteIssue(db, updated.issueId)
    res.json(updated)
  }))

  app.delete('/api/subtasks/:id', asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    const existing = getSubtask(db, id)
    if (!existing) return res.status(404).json({ error: 'not found' })
    deleteSubtask(db, id)
    await maybeAutoCompleteIssue(db, existing.issueId)
    res.status(204).end()
  }))
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd apps/issue-board-mcp && npm test`
Expected: PASS — 전체 테스트 스위트(기존 것 포함) 통과

- [ ] **Step 5: 커밋**

```bash
git add apps/issue-board-mcp/src/rest/app.ts apps/issue-board-mcp/src/rest/app.test.ts
git commit -m "feat(issue-board-mcp): trigger auto-complete from subtask toggle/delete routes"
```

---

### Task 5: 프론트엔드 — Issue 타입에 진행도 필드 추가

**Files:**
- Modify: `apps/issue-board/src/lib/api.ts`

이 저장소 관례상 프론트 컴포넌트/타입 변경은 자동화 테스트 없이 마지막 수동 브라우저 검증(Task 8)으로 확인한다 — `api.test.ts`의 기존 모킹은 부분 객체(`{ id: 1, number: 1 }`)를 `any`로 캐스팅해 호출하는 방식이라 타입에 필드를 추가해도 기존 테스트가 깨지지 않는다.

- [ ] **Step 1: 타입 수정**

`apps/issue-board/src/lib/api.ts`의 `Issue` 인터페이스(현재 5-18번째 줄)에 필드 추가:

```ts
export interface Issue {
  id: number
  projectId: number
  number: number
  planId: number | null
  title: string
  priority: '높음' | '보통' | '낮음'
  description: string
  status: 'planned' | 'wireframed' | 'dev_approved' | 'done'
  notionPageId: string | null
  notionStatus: NotionStatus | null
  // GET /api/projects/:id/issues에서만 채워진다 — getIssue 기반 단건 조회
  // 라우트(승인/완료/Notion상태 변경 등)의 응답에는 이 키 자체가 없다.
  // 그래서 optional(`?:`)로 선언한다 — 없으면 undefined가 되는 게 타입상으로도 맞다.
  subtaskProgress?: { total: number; done: number } | null
  createdAt: string
  updatedAt: string
}
```

- [ ] **Step 2: 타입 체크로 확인**

Run: `cd apps/issue-board && npx tsc --noEmit`
Expected: 에러 없음. `plan-rounds.test.ts`의 `makeIssue()` 헬퍼처럼 `Issue` 객체를 리터럴로 완전히 구성하는 테스트가 있다면 `subtaskProgress`가 optional이므로 그 필드를 안 넣어도 에러가 안 나야 한다(넣고 싶으면 `null`로 넣어도 무방).

**중요 — Task 7과의 연결점:** 이 필드가 `GET /api/projects/:id/issues`에만 있고 다른 이슈 응답에는 없기 때문에, `IssueList.tsx`에서 단건 응답(예: `setIssueNotionStatus`의 반환값)으로 이슈를 갱신할 때 **절대 통째로 교체하면 안 된다** — `subtaskProgress`가 없는 객체로 덮어쓰면 배지가 사라진다. Task 7의 `handleNotionStatusChange`는 `{ ...prev, ...updated }` 형태로 병합해서 이 문제를 피한다(Task 7 코드에 이미 반영됨).

- [ ] **Step 3: 커밋**

```bash
git add apps/issue-board/src/lib/api.ts
git commit -m "feat(issue-board): add subtaskProgress to the Issue type"
```

---

### Task 6: 프론트엔드 — IssueSubtasks가 진행도 변화를 부모에 알림

**Files:**
- Modify: `apps/issue-board/src/components/IssueSubtasks.tsx`

- [ ] **Step 1: 컴포넌트 수정**

`apps/issue-board/src/components/IssueSubtasks.tsx` 전체를 다음으로 교체:

```tsx
'use client'

// src/components/IssueSubtasks.tsx
import { useEffect, useState } from 'react'
import { createSubtask, deleteSubtask, fetchSubtasks, updateSubtask, type Subtask } from '@/lib/api'

type Progress = { total: number; done: number } | null

function computeProgress(list: Subtask[]): Progress {
  return list.length === 0 ? null : { total: list.length, done: list.filter((s) => s.done).length }
}

export default function IssueSubtasks({
  issueId,
  onProgressChange,
}: {
  issueId: number
  onProgressChange?: (progress: Progress) => void
}) {
  const [subtasks, setSubtasks] = useState<Subtask[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')

  useEffect(() => {
    fetchSubtasks(issueId)
      .then((data) => {
        setSubtasks(data)
        onProgressChange?.(computeProgress(data))
      })
      .catch(() => setLoadError(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueId])

  async function handleToggle(subtask: Subtask) {
    setActionError(null)
    try {
      const updated = await updateSubtask(subtask.id, { done: !subtask.done })
      const next = (subtasks ?? []).map((s) => (s.id === subtask.id ? updated : s))
      setSubtasks(next)
      onProgressChange?.(computeProgress(next))
    } catch {
      setActionError('하위 태스크 상태 변경에 실패했습니다.')
    }
  }

  async function handleDelete(id: number) {
    setActionError(null)
    try {
      await deleteSubtask(id)
      const next = (subtasks ?? []).filter((s) => s.id !== id)
      setSubtasks(next)
      onProgressChange?.(computeProgress(next))
    } catch {
      setActionError('하위 태스크 삭제에 실패했습니다.')
    }
  }

  async function handleAdd() {
    const title = newTitle.trim()
    if (!title) return
    setActionError(null)
    try {
      const created = await createSubtask(issueId, title)
      const next = [...(subtasks ?? []), created]
      setSubtasks(next)
      onProgressChange?.(computeProgress(next))
      setNewTitle('')
    } catch {
      setActionError('하위 태스크 추가에 실패했습니다.')
    }
  }

  if (loadError) return <p className="text-xs text-red-600 mt-2 ml-6">하위 태스크를 불러오지 못했습니다.</p>
  if (subtasks === null) return <p className="text-xs text-zinc-400 mt-2 ml-6">불러오는 중...</p>

  return (
    <div className="mt-2 ml-6 space-y-1">
      {actionError && <p className="text-xs text-red-600">{actionError}</p>}
      {subtasks.map((subtask) => (
        <div key={subtask.id} className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={subtask.done}
            onChange={() => handleToggle(subtask)}
            className="cursor-pointer"
          />
          <span className={subtask.done ? 'line-through text-zinc-400 flex-1' : 'text-zinc-700 flex-1'}>
            {subtask.title}
          </span>
          <button onClick={() => handleDelete(subtask.id)} className="text-zinc-300 hover:text-red-500">
            ×
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2 text-xs mt-1">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="+ 새 하위 항목"
          className="flex-1 border border-zinc-200 rounded px-2 py-1 text-zinc-700"
        />
      </div>
    </div>
  )
}
```

변경 요지: `onProgressChange` prop 추가, 초기 로드/토글/삭제/추가 4곳 모두에서 최신 배열을 계산한 직후 `computeProgress`로 부모에 알림. 기존 로직(로딩/에러 상태, 체크박스, 삭제, 추가)은 그대로.

- [ ] **Step 2: 타입 체크로 확인**

Run: `cd apps/issue-board && npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add apps/issue-board/src/components/IssueSubtasks.tsx
git commit -m "feat(issue-board): report subtask progress changes to the parent"
```

---

### Task 7: 프론트엔드 — IssueList에 진행도 배지 + 상태 동기화

**Files:**
- Modify: `apps/issue-board/src/components/IssueList.tsx`

- [ ] **Step 1: 컴포넌트 수정**

`apps/issue-board/src/components/IssueList.tsx` 전체를 다음으로 교체:

```tsx
// src/components/IssueList.tsx
'use client'

import { useMemo, useState } from 'react'
import {
  NOTION_STATUS_OPTIONS,
  setIssueNotionStatus,
  type Issue,
  type NotionStatus,
  type Plan,
} from '@/lib/api'
import { roundIndexOf, roundLabel, roundShortLabel } from '@/lib/plan-rounds'
import IssueSubtasks from './IssueSubtasks'

const STATUS_LABEL: Record<Issue['status'], string> = {
  planned: '기획됨',
  wireframed: '와이어프레임 완료',
  dev_approved: '개발 승인됨',
  done: '완료',
}

const STATUS_STYLE: Record<Issue['status'], string> = {
  planned: 'bg-zinc-100 text-zinc-600',
  wireframed: 'bg-blue-50 text-blue-700',
  dev_approved: 'bg-emerald-50 text-emerald-700',
  done: 'bg-indigo-50 text-indigo-700',
}

function progressLabel(progress: NonNullable<Issue['subtaskProgress']>): string {
  if (progress.done === progress.total) return '완료'
  const percent = Math.round((progress.done / progress.total) * 100)
  return `${percent}% (${progress.done}/${progress.total})`
}

export default function IssueList({
  issues,
  plans,
  projectId,
}: {
  issues: Issue[]
  plans: Plan[]
  projectId: number
}) {
  const [items, setItems] = useState(issues)
  const [error, setError] = useState<string | null>(null)
  const [roundFilter, setRoundFilter] = useState<number | 'all'>('all')
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())

  const filteredItems = useMemo(
    () => (roundFilter === 'all' ? items : items.filter((i) => i.planId === roundFilter)),
    [items, roundFilter]
  )

  if (items.length === 0) {
    return <p className="text-sm text-zinc-400">이슈가 없습니다. 기획을 먼저 확정하세요.</p>
  }

  async function handleNotionStatusChange(issueId: number, value: string) {
    const notionStatus = (value || null) as NotionStatus | null
    setError(null)
    try {
      const updated = await setIssueNotionStatus(issueId, notionStatus)
      // setIssueNotionStatus의 응답(getIssue 기반)에는 subtaskProgress 키가 아예 없다.
      // 통째로 교체(updated)하면 그 이슈의 진행도 배지가 사라진다 — 병합으로 기존 값을 보존한다.
      setItems((prev) => prev.map((i) => (i.id === issueId ? { ...i, ...updated } : i)))
    } catch {
      setError('Notion 상태 변경에 실패했습니다. 잠시 후 다시 시도하세요.')
    }
  }

  function toggleExpanded(issueId: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(issueId)) next.delete(issueId)
      else next.add(issueId)
      return next
    })
  }

  function updateIssueProgress(issueId: number, progress: Issue['subtaskProgress']) {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== issueId) return i
        // 하위 태스크가 전부 완료되면 백엔드가 이슈 status도 자동으로 done으로
        // 바꾼다(maybeAutoCompleteIssue) — 화면도 같은 방향으로만 맞춰준다.
        const autoDone = progress !== null && progress.done === progress.total && i.status !== 'done'
        return { ...i, subtaskProgress: progress, status: autoDone ? 'done' : i.status }
      })
    )
  }

  return (
    <div className="max-w-2xl">
      {plans.length > 1 && (
        <label className="block text-xs text-zinc-500 mb-3">
          기획 차수
          <select
            className="ml-2 text-xs border border-zinc-200 rounded px-2 py-1 text-zinc-700"
            value={roundFilter}
            onChange={(e) => setRoundFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          >
            <option value="all">전체</option>
            {plans.map((plan, index) => (
              <option key={plan.id} value={plan.id}>
                {roundLabel(index)}
              </option>
            ))}
          </select>
        </label>
      )}
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      {filteredItems.length === 0 ? (
        <p className="text-sm text-zinc-400">해당 차수의 이슈가 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {filteredItems.map((issue) => {
            const roundIndex = roundIndexOf(plans, issue.planId)
            const isExpanded = expandedIds.has(issue.id)
            return (
              <li key={issue.id} className="border border-zinc-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <button
                    onClick={() => toggleExpanded(issue.id)}
                    className="text-zinc-400 hover:text-zinc-700 w-4 shrink-0"
                    aria-label={isExpanded ? '하위 태스크 접기' : '하위 태스크 펼치기'}
                  >
                    {isExpanded ? '▼' : '▶'}
                  </button>
                  <span className="font-mono text-sm text-indigo-700">#{issue.number}</span>
                  {roundIndex >= 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500">
                      {roundShortLabel(roundIndex)}
                    </span>
                  )}
                  <span className="font-medium text-sm flex-1">{issue.title}</span>
                  {issue.subtaskProgress && (
                    <span className="text-xs text-zinc-400">{progressLabel(issue.subtaskProgress)}</span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded ${STATUS_STYLE[issue.status]}`}>
                    {STATUS_LABEL[issue.status]}
                  </span>
                </div>
                <p className="text-xs text-zinc-500">{issue.description}</p>
                {isExpanded && (
                  <IssueSubtasks
                    issueId={issue.id}
                    onProgressChange={(progress) => updateIssueProgress(issue.id, progress)}
                  />
                )}
                <div className="flex items-center gap-2 mt-2">
                  <a
                    href={`/projects/${projectId}/wireframe?issueId=${issue.id}`}
                    className="text-xs text-indigo-600"
                  >
                    와이어프레임 보기 →
                  </a>
                  <label className="text-xs text-zinc-400 ml-auto">
                    Notion 상태
                    <select
                      className="ml-1 text-xs border border-zinc-200 rounded px-1 py-0.5 text-zinc-700"
                      value={issue.notionStatus ?? ''}
                      onChange={(e) => handleNotionStatusChange(issue.id, e.target.value)}
                    >
                      <option value="">자동 ({STATUS_LABEL[issue.status]} 기준)</option>
                      {NOTION_STATUS_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
```

변경 요지: 상태 pill 왼쪽에 진행도 플레인 텍스트 배지 추가, `updateIssueProgress` 함수로 `IssueSubtasks`의 콜백을 받아 `subtaskProgress`와(100% 도달 시) `status`를 함께 갱신.

- [ ] **Step 2: 타입 체크로 확인**

Run: `cd apps/issue-board && npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add apps/issue-board/src/components/IssueList.tsx
git commit -m "feat(issue-board): show subtask progress badge and sync issue status"
```

---

### Task 8: 수동 브라우저 검증

**Files:** 없음(코드 변경 없음, 검증만)

이 리포 관례상 `IssueList.tsx`/`IssueSubtasks.tsx` 같은 UI 컴포넌트 변경은 자동화 테스트 대신 수동 브라우저 검증으로 마무리한다.

- [ ] **Step 1: 서버 기동 확인**

`apps/issue-board-mcp`(4000번 포트)와 `apps/issue-board`(5173번 포트)가 이미 떠 있는지 확인하고, 없으면 각각 `npm run dev`로 기동한다.

- [ ] **Step 2: ib-test-project 이슈 목록에서 배지 확인**

`http://localhost:5173/projects/4/issues`를 열고 5개 이슈 각각의 진행도 배지를 스크린샷으로 확인한다:
- `#1 로그인` — `33% (1/3)`
- `#2 프로필 편집` — `50% (2/4)`
- `#3 알림 설정` — `33% (1/3)`
- `#4 알림 히스토리 조회` — `0% (0/3)`
- `#5 다크모드 설정` — `완료` (이미 2/2지만, 이 검증 전까지는 백엔드 status가 자동으로 안 바뀌어 있을 수 있다 — Step 3에서 확인)

- [ ] **Step 3: 자동완료 트리거를 실제로 발생시켜 확인**

`#5 다크모드 설정`을 펼쳐서 아무 하위 태스크나 체크 해제했다가 다시 체크(토글 두 번)해서 `PUT /api/subtasks/:id` 호출이 실제로 발생하게 만든다. 이후:
- 화면의 `#5` 상태 pill이 `완료`(STATUS_STYLE 색상 포함)로 바뀌는지 확인
- `curl http://localhost:4000/api/issues/18`로 `status: "done"`인지 확인

- [ ] **Step 4: 새 이슈에서 체크로 100% 도달 시나리오 확인**

`#4 알림 히스토리 조회`를 펼쳐서 하위 태스크 3개를 순서대로 체크한다. 마지막 체크 직후:
- 배지가 `완료`로 바뀌는지
- 상태 pill이 `개발 승인됨`에서 `완료`로 바뀌는지
- 브라우저 콘솔에 에러가 없는지

- [ ] **Step 5: 삭제로 100% 도달 시나리오 확인**

`#3 알림 설정`(현재 1/3)에서 미완료 항목 2개 중 1개를 삭제해 2/2로 만든다. 배지가 `완료`로, 상태 pill도 `완료`로 바뀌는지 확인한다.

- [ ] **Step 6: 하위 태스크 없는 이슈에 배지가 없는지 확인**

`docs/plans/2026-07-16-issue-subtasks.md` Task 9에서 썼던 것과 같은 방식으로, 하위 태스크를 하나도 추가하지 않은 신규 이슈(또는 임시로 새 프로젝트에 기획을 승인해 만든 이슈)를 펼쳐 배지가 렌더링되지 않는지 확인한다.

- [ ] **Step 7: 결과 보고**

스크린샷과 확인 결과를 정리해서 보고한다. 문제가 있으면 해당 Task로 돌아가 수정한다.
