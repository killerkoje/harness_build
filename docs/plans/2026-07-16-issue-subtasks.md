# 이슈 하위 태스크(개발 체크리스트) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 이슈 아래에 제목+완료여부만 있는 개발자용 체크리스트(하위 태스크)를 붙인다. `/ib-plan`이 기획을 승인해 이슈를 생성하는 시점에 AI가 자동 제안하고, 대시보드에서 이슈 카드를 펼치면(▶/▼) 체크리스트가 나타나 사람이 추가·수정·삭제할 수 있다.

**Architecture:** 새 테이블 `issue_subtasks` 하나(이슈에 FK) + REST 4개 라우트 + MCP 툴 `add_subtasks` 1개 + 프론트 API 함수 4개 + 새 컴포넌트 `IssueSubtasks.tsx`(펼쳤을 때만 지연 로드) + `IssueList.tsx`에 펼치기 토글 연결 + `/ib-plan.md`에 승인 직후 AI 제안 지침 추가.

**Tech Stack:** Node 20 · TypeScript · better-sqlite3 · express · `@modelcontextprotocol/sdk` (백엔드) / Next.js 15 · React 19 · Tailwind v4 (프론트) — 기존 `apps/issue-board`, `apps/issue-board-mcp`와 동일 스택.

**참고 문서:** `docs/specs/2026-07-16-issue-subtasks-design.md`

---

## 파일 구조

| 파일 | 역할 |
|---|---|
| `apps/issue-board-mcp/src/db.ts` | (수정) `issue_subtasks` 테이블 추가 |
| `apps/issue-board-mcp/src/types.ts` | (수정) `Subtask` 타입 추가 |
| `apps/issue-board-mcp/src/models/subtasks.ts` | (신규) 모델 함수 |
| `apps/issue-board-mcp/src/models/subtasks.test.ts` | (신규) 모델 테스트 |
| `apps/issue-board-mcp/src/rest/app.ts` | (수정) REST 라우트 4개 |
| `apps/issue-board-mcp/src/rest/app.test.ts` | (수정) REST 테스트 |
| `apps/issue-board-mcp/src/mcp/server.ts` | (수정) `add_subtasks` MCP 툴 |
| `apps/issue-board/src/lib/api.ts` | (수정) `Subtask` 타입 + 클라이언트 함수 4개 |
| `apps/issue-board/src/lib/api.test.ts` | (수정) 클라이언트 함수 테스트 |
| `apps/issue-board/src/components/IssueSubtasks.tsx` | (신규) 펼친 이슈 안에 렌더되는 체크리스트 |
| `apps/issue-board/src/components/IssueList.tsx` | (수정) 펼치기(▶/▼) 토글 연결 |
| `harness_global/.claude/commands/ib-plan.md` | (수정) 승인 직후 하위 태스크 AI 제안 지침 |

---

## Task 1: DB 스키마 + `Subtask` 타입

**Files:**
- Modify: `apps/issue-board-mcp/src/db.ts`
- Modify: `apps/issue-board-mcp/src/types.ts`

- [ ] **Step 1: `issue_subtasks` 테이블 추가**

`apps/issue-board-mcp/src/db.ts`에서 (현재 50~56번 줄) 아래 텍스트를:

```ts
    CREATE TABLE IF NOT EXISTS wireframes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_id INTEGER NOT NULL UNIQUE REFERENCES issues(id),
      screens TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS design_systems (
```

아래로 교체한다:

```ts
    CREATE TABLE IF NOT EXISTS wireframes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_id INTEGER NOT NULL UNIQUE REFERENCES issues(id),
      screens TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS issue_subtasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_id INTEGER NOT NULL REFERENCES issues(id),
      title TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS design_systems (
```

(`wireframes`는 이슈당 1개라 `issue_id`가 `UNIQUE`지만, `issue_subtasks`는 이슈당 여러 개라 `UNIQUE` 없이 그냥 FK만 건다.)

- [ ] **Step 2: `Subtask` 타입 추가**

`apps/issue-board-mcp/src/types.ts`에서 (현재 74~80번 줄) 아래 텍스트를:

```ts
export interface Wireframe {
  id: number
  issueId: number
  screens: WireframeScreen[]
  createdAt: string
  updatedAt: string
}
```

아래로 교체한다:

```ts
export interface Wireframe {
  id: number
  issueId: number
  screens: WireframeScreen[]
  createdAt: string
  updatedAt: string
}

export interface Subtask {
  id: number
  issueId: number
  title: string
  done: boolean
  createdAt: string
  updatedAt: string
}
```

- [ ] **Step 3: 기존 테스트가 여전히 통과하는지 확인**

이 태스크 자체는 새 테스트를 추가하지 않는다(스키마 변경은 Task 2의 모델 테스트가 실제로 실행되면서 검증된다) — 지금은 스키마 문법 오류로 기존 테스트 전체가 깨지지 않는지만 확인한다.

Run: `cd apps/issue-board-mcp && npm test`
Expected: 기존과 동일하게 전부 PASS (스키마 추가만으로는 기존 동작이 바뀌지 않는다)

- [ ] **Step 4: 커밋**

```bash
git add apps/issue-board-mcp/src/db.ts apps/issue-board-mcp/src/types.ts
git commit -m "feat(issue-board-mcp): add issue_subtasks table and Subtask type"
```

---

## Task 2: `subtasks.ts` 모델 함수 + 테스트

**Files:**
- Create: `apps/issue-board-mcp/src/models/subtasks.ts`
- Test: `apps/issue-board-mcp/src/models/subtasks.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/issue-board-mcp/src/models/subtasks.test.ts` 새로 작성:

```ts
// src/models/subtasks.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import type Database from 'better-sqlite3'
import { createDb } from '../db.js'
import { getOrCreateProject } from './projects.js'
import { createPlan } from './plans.js'
import { createIssuesFromPlan } from './issues.js'
import {
  listSubtasksByIssue,
  createSubtask,
  createSubtasksBulk,
  getSubtask,
  updateSubtask,
  deleteSubtask,
} from './subtasks.js'
import type { PlanSections } from '../types.js'

const sections: PlanSections = {
  overview: 'o',
  targetUsers: 't',
  mvpFeatures: [{ priority: '높음', title: '로그인', description: 'd' }],
  outOfScope: 'x',
}

describe('subtasks model', () => {
  let db: Database.Database
  let issueId: number
  beforeEach(() => {
    db = createDb(':memory:')
    const projectId = getOrCreateProject(db, '/tmp/p').id
    const planId = createPlan(db, projectId, 'p', sections).id
    issueId = createIssuesFromPlan(db, projectId, planId, sections.mvpFeatures)[0].id
  })

  it('returns an empty array when the issue has no subtasks yet', () => {
    expect(listSubtasksByIssue(db, issueId)).toEqual([])
  })

  it('createSubtask creates a subtask that starts undone', () => {
    const subtask = createSubtask(db, issueId, 'API 라우터 추가')
    expect(subtask.title).toBe('API 라우터 추가')
    expect(subtask.done).toBe(false)
    expect(subtask.issueId).toBe(issueId)
  })

  it('createSubtasksBulk creates multiple subtasks in order', () => {
    const created = createSubtasksBulk(db, issueId, ['하나', '둘', '셋'])
    expect(created.map((s) => s.title)).toEqual(['하나', '둘', '셋'])
    expect(listSubtasksByIssue(db, issueId).map((s) => s.title)).toEqual(['하나', '둘', '셋'])
  })

  it('updateSubtask toggles done and updates title independently', () => {
    const subtask = createSubtask(db, issueId, '원래 제목')
    const toggled = updateSubtask(db, subtask.id, { done: true })
    expect(toggled?.done).toBe(true)
    expect(toggled?.title).toBe('원래 제목')

    const renamed = updateSubtask(db, subtask.id, { title: '새 제목' })
    expect(renamed?.title).toBe('새 제목')
    expect(renamed?.done).toBe(true)
  })

  it('updateSubtask returns null for a nonexistent id', () => {
    expect(updateSubtask(db, 999999, { done: true })).toBeNull()
  })

  it('deleteSubtask removes the row and returns true, then false if already gone', () => {
    const subtask = createSubtask(db, issueId, '삭제될 것')
    expect(deleteSubtask(db, subtask.id)).toBe(true)
    expect(getSubtask(db, subtask.id)).toBeNull()
    expect(deleteSubtask(db, subtask.id)).toBe(false)
  })
})
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `cd apps/issue-board-mcp && npm test -- subtasks.test.ts`
Expected: FAIL — `Cannot find module './subtasks.js'`

- [ ] **Step 3: 구현**

`apps/issue-board-mcp/src/models/subtasks.ts` 새로 작성:

```ts
// src/models/subtasks.ts
import type Database from 'better-sqlite3'
import type { Subtask } from '../types.js'

function rowToSubtask(row: any): Subtask {
  return {
    id: row.id,
    issueId: row.issue_id,
    title: row.title,
    done: Boolean(row.done),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function listSubtasksByIssue(db: Database.Database, issueId: number): Subtask[] {
  const rows = db
    .prepare('SELECT * FROM issue_subtasks WHERE issue_id = ? ORDER BY id ASC')
    .all(issueId) as any[]
  return rows.map(rowToSubtask)
}

export function getSubtask(db: Database.Database, id: number): Subtask | null {
  const row = db.prepare('SELECT * FROM issue_subtasks WHERE id = ?').get(id)
  return row ? rowToSubtask(row) : null
}

export function createSubtask(db: Database.Database, issueId: number, title: string): Subtask {
  const now = new Date().toISOString()
  const result = db
    .prepare(
      'INSERT INTO issue_subtasks (issue_id, title, done, created_at, updated_at) VALUES (?, ?, 0, ?, ?)'
    )
    .run(issueId, title, now, now)
  return {
    id: Number(result.lastInsertRowid),
    issueId,
    title,
    done: false,
    createdAt: now,
    updatedAt: now,
  }
}

export function createSubtasksBulk(
  db: Database.Database,
  issueId: number,
  titles: string[]
): Subtask[] {
  const insertAll = db.transaction((titlesToInsert: string[]) =>
    titlesToInsert.map((title) => createSubtask(db, issueId, title))
  )
  return insertAll(titles)
}

export function updateSubtask(
  db: Database.Database,
  id: number,
  fields: { title?: string; done?: boolean }
): Subtask | null {
  const existing = getSubtask(db, id)
  if (!existing) return null
  const now = new Date().toISOString()
  db.prepare('UPDATE issue_subtasks SET title = ?, done = ?, updated_at = ? WHERE id = ?').run(
    fields.title ?? existing.title,
    (fields.done ?? existing.done) ? 1 : 0,
    now,
    id
  )
  return getSubtask(db, id)
}

export function deleteSubtask(db: Database.Database, id: number): boolean {
  const result = db.prepare('DELETE FROM issue_subtasks WHERE id = ?').run(id)
  return result.changes > 0
}
```

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `cd apps/issue-board-mcp && npm test -- subtasks.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: 커밋**

```bash
git add apps/issue-board-mcp/src/models/subtasks.ts apps/issue-board-mcp/src/models/subtasks.test.ts
git commit -m "feat(issue-board-mcp): add subtasks model functions"
```

---

## Task 3: REST 라우트 4개 + 테스트

**Files:**
- Modify: `apps/issue-board-mcp/src/rest/app.ts`
- Modify: `apps/issue-board-mcp/src/rest/app.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/issue-board-mcp/src/rest/app.test.ts`의 `describe('REST API', ...)` 블록을 닫는 마지막 `})` 바로 앞에 아래 테스트들을 추가한다:

```ts
  it('subtask CRUD: create, list, toggle done, rename, delete', async () => {
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

    const created = await request(app)
      .post(`/api/issues/${issue.id}/subtasks`)
      .send({ title: 'API 라우터 추가' })
    expect(created.status).toBe(200)
    expect(created.body.title).toBe('API 라우터 추가')
    expect(created.body.done).toBe(false)

    const listRes = await request(app).get(`/api/issues/${issue.id}/subtasks`)
    expect(listRes.status).toBe(200)
    expect(listRes.body).toHaveLength(1)

    const toggled = await request(app).put(`/api/subtasks/${created.body.id}`).send({ done: true })
    expect(toggled.status).toBe(200)
    expect(toggled.body.done).toBe(true)
    expect(toggled.body.title).toBe('API 라우터 추가')

    const renamed = await request(app)
      .put(`/api/subtasks/${created.body.id}`)
      .send({ title: '라우터 추가 (완료)' })
    expect(renamed.status).toBe(200)
    expect(renamed.body.title).toBe('라우터 추가 (완료)')
    expect(renamed.body.done).toBe(true)

    const del = await request(app).delete(`/api/subtasks/${created.body.id}`)
    expect(del.status).toBe(204)

    const afterDelete = await request(app).get(`/api/issues/${issue.id}/subtasks`)
    expect(afterDelete.body).toHaveLength(0)
  })

  it('GET /api/issues/:id/subtasks returns 404 for a nonexistent issue', async () => {
    const res = await request(app).get('/api/issues/999999/subtasks')
    expect(res.status).toBe(404)
  })

  it('POST /api/issues/:id/subtasks returns 400 without a title', async () => {
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

    const res = await request(app).post(`/api/issues/${issue.id}/subtasks`).send({})
    expect(res.status).toBe(400)
  })

  it('PUT /api/subtasks/:id returns 404 for a nonexistent subtask', async () => {
    const res = await request(app).put('/api/subtasks/999999').send({ done: true })
    expect(res.status).toBe(404)
  })

  it('DELETE /api/subtasks/:id returns 404 for a nonexistent subtask', async () => {
    const res = await request(app).delete('/api/subtasks/999999')
    expect(res.status).toBe(404)
  })
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `cd apps/issue-board-mcp && npm test -- app.test.ts`
Expected: FAIL — 404/undefined 라우트 관련 실패 (라우트가 아직 없음)

- [ ] **Step 3: 구현**

`apps/issue-board-mcp/src/rest/app.ts`에서 wireframes 모델 import 줄(현재 29번 줄)을:

```ts
import { upsertWireframe, getWireframeByIssue } from '../models/wireframes.js'
```

아래로 교체한다:

```ts
import { upsertWireframe, getWireframeByIssue } from '../models/wireframes.js'
import { listSubtasksByIssue, createSubtask, updateSubtask, deleteSubtask } from '../models/subtasks.js'
```

그리고 `/api/issues/:id/wireframe` GET 라우트(현재 151~155번 줄) 바로 뒤, `/api/issues/:id/approve` 라우트 앞에 아래 라우트 4개를 추가한다:

```ts
  app.get('/api/issues/:id/wireframe', (req, res) => {
    const wireframe = getWireframeByIssue(db, Number(req.params.id))
    if (!wireframe) return res.status(404).json({ error: 'not found' })
    res.json(wireframe)
  })

  app.get('/api/issues/:id/subtasks', (req, res) => {
    const issueId = Number(req.params.id)
    const issue = getIssue(db, issueId)
    if (!issue) return res.status(404).json({ error: 'not found' })
    res.json(listSubtasksByIssue(db, issueId))
  })

  app.post('/api/issues/:id/subtasks', (req, res) => {
    const issueId = Number(req.params.id)
    const issue = getIssue(db, issueId)
    if (!issue) return res.status(404).json({ error: 'not found' })
    const { title } = req.body ?? {}
    if (!title) return res.status(400).json({ error: 'title required' })
    res.json(createSubtask(db, issueId, title))
  })

  app.put('/api/subtasks/:id', (req, res) => {
    const { title, done } = req.body ?? {}
    const updated = updateSubtask(db, Number(req.params.id), { title, done })
    if (!updated) return res.status(404).json({ error: 'not found' })
    res.json(updated)
  })

  app.delete('/api/subtasks/:id', (req, res) => {
    const deleted = deleteSubtask(db, Number(req.params.id))
    if (!deleted) return res.status(404).json({ error: 'not found' })
    res.status(204).end()
  })
```

(`getIssue`는 이미 이 파일 21~28번 줄의 `../models/issues.js` import에 포함돼 있으므로 새로 추가할 필요 없다.)

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `cd apps/issue-board-mcp && npm test -- app.test.ts`
Expected: PASS (전체)

- [ ] **Step 5: 커밋**

```bash
git add apps/issue-board-mcp/src/rest/app.ts apps/issue-board-mcp/src/rest/app.test.ts
git commit -m "feat(issue-board-mcp): add subtask REST routes"
```

---

## Task 4: MCP 툴 `add_subtasks`

**Files:**
- Modify: `apps/issue-board-mcp/src/mcp/server.ts`

- [ ] **Step 1: 구현**

`apps/issue-board-mcp/src/mcp/server.ts`에서 wireframes 모델 import 줄(현재 29번 줄)을:

```ts
import { upsertWireframe } from '../models/wireframes.js'
```

아래로 교체한다:

```ts
import { upsertWireframe } from '../models/wireframes.js'
import { createSubtasksBulk } from '../models/subtasks.js'
```

그리고 `complete_issue` 툴(현재 263~274번 줄) 바로 뒤, `upsert_design_system` 툴 앞에 아래 툴을 추가한다:

```ts
  server.tool(
    'complete_issue',
    '이슈를 완료(done) 상태로 전환한다. /dev 파이프라인이 커밋을 끝낸 뒤 호출 (Notion 상태도 완료로 동기화)',
    { issueId: z.number() },
    async ({ issueId }) => {
      const updated = await completeIssue(db, issueId)
      if (!updated) {
        return { content: [{ type: 'text', text: `issue ${issueId} not found` }], isError: true }
      }
      return { content: [{ type: 'text', text: JSON.stringify(updated) }] }
    }
  )

  server.tool(
    'add_subtasks',
    '이슈에 개발자용 하위 태스크(체크리스트)를 여러 개 한 번에 추가한다. 이미 있는 하위 태스크는 건드리지 않고 뒤에 이어붙인다',
    { issueId: z.number(), titles: z.array(z.string()) },
    async ({ issueId, titles }) => {
      const issue = getIssue(db, issueId)
      if (!issue) {
        return { content: [{ type: 'text', text: `issue ${issueId} not found` }], isError: true }
      }
      const subtasks = createSubtasksBulk(db, issueId, titles)
      return { content: [{ type: 'text', text: JSON.stringify(subtasks) }] }
    }
  )
```

(`getIssue`는 이미 이 파일 21~28번 줄의 `../models/issues.js` import에 포함돼 있다.)

- [ ] **Step 2: 타입 체크**

Run: `cd apps/issue-board-mcp && npx tsc -p tsconfig.json --noEmit`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add apps/issue-board-mcp/src/mcp/server.ts
git commit -m "feat(issue-board-mcp): add add_subtasks MCP tool"
```

이 툴은 별도 MCP 프로토콜 테스트를 두지 않는다 — 내부에서 쓰는 `createSubtasksBulk`는 Task 2에서, 동등한 생성 흐름(`POST /api/issues/:id/subtasks`)은 Task 3에서 이미 테스트됐고, 이 리포의 다른 MCP 툴들(`approve_issue` 등)도 프로토콜 레벨 테스트 없이 모델/REST 레벨 테스트로 커버하는 관례를 따른다.

---

## Task 5: 프론트 API 클라이언트

**Files:**
- Modify: `apps/issue-board/src/lib/api.ts`
- Modify: `apps/issue-board/src/lib/api.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/issue-board/src/lib/api.test.ts`의 import 줄을:

```ts
import { fetchIssues, approveIssue, fetchProjects, deleteProject, fetchPlans } from './api.js'
```

아래로 교체한다:

```ts
import {
  fetchIssues,
  approveIssue,
  fetchProjects,
  deleteProject,
  fetchPlans,
  fetchSubtasks,
  createSubtask,
  updateSubtask,
  deleteSubtask,
} from './api.js'
```

`describe('api client', ...)` 블록을 닫는 마지막 `})` 바로 앞에 아래 테스트들을 추가한다:

```ts
  it('fetchSubtasks calls GET /api/issues/:id/subtasks and returns parsed json', async () => {
    ;(fetch as any).mockResolvedValue({ ok: true, json: async () => [{ id: 1, title: 't', done: false }] })
    const subtasks = await fetchSubtasks(7)
    expect(fetch).toHaveBeenCalledWith('http://localhost:4000/api/issues/7/subtasks')
    expect(subtasks).toEqual([{ id: 1, title: 't', done: false }])
  })

  it('createSubtask calls POST /api/issues/:id/subtasks with the title', async () => {
    ;(fetch as any).mockResolvedValue({ ok: true, json: async () => ({ id: 1, title: '새 태스크', done: false }) })
    const subtask = await createSubtask(7, '새 태스크')
    expect(fetch).toHaveBeenCalledWith('http://localhost:4000/api/issues/7/subtasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '새 태스크' }),
    })
    expect(subtask.title).toBe('새 태스크')
  })

  it('updateSubtask calls PUT /api/subtasks/:id with partial fields', async () => {
    ;(fetch as any).mockResolvedValue({ ok: true, json: async () => ({ id: 1, title: 't', done: true }) })
    const updated = await updateSubtask(1, { done: true })
    expect(fetch).toHaveBeenCalledWith('http://localhost:4000/api/subtasks/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: true }),
    })
    expect(updated.done).toBe(true)
  })

  it('deleteSubtask calls DELETE /api/subtasks/:id', async () => {
    ;(fetch as any).mockResolvedValue({ ok: true })
    await deleteSubtask(1)
    expect(fetch).toHaveBeenCalledWith('http://localhost:4000/api/subtasks/1', { method: 'DELETE' })
  })
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `cd apps/issue-board && npx vitest run src/lib/api.test.ts`
Expected: FAIL — `fetchSubtasks`/`createSubtask`/`updateSubtask`/`deleteSubtask`가 export되지 않음 (참고: `deleteProject`도 이미 이 파일에 있으므로, 새 `deleteSubtask`와 이름이 겹치지 않는지 확인 — 겹치지 않는다)

- [ ] **Step 3: 구현**

`apps/issue-board/src/lib/api.ts`의 `fetchDesignSystem` 함수(현재 140~144번 줄, 파일의 마지막 함수) 바로 뒤에 추가:

```ts
export interface Subtask {
  id: number
  issueId: number
  title: string
  done: boolean
}

export async function fetchSubtasks(issueId: number): Promise<Subtask[]> {
  return json(await fetch(`${BASE_URL}/api/issues/${issueId}/subtasks`))
}

export async function createSubtask(issueId: number, title: string): Promise<Subtask> {
  return json(
    await fetch(`${BASE_URL}/api/issues/${issueId}/subtasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
  )
}

export async function updateSubtask(
  id: number,
  fields: { title?: string; done?: boolean }
): Promise<Subtask> {
  return json(
    await fetch(`${BASE_URL}/api/subtasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
  )
}

export async function deleteSubtask(id: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/subtasks/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`request failed: ${res.status}`)
}
```

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `cd apps/issue-board && npx vitest run src/lib/api.test.ts`
Expected: PASS (10 tests)

- [ ] **Step 5: 커밋**

```bash
git add apps/issue-board/src/lib/api.ts apps/issue-board/src/lib/api.test.ts
git commit -m "feat(issue-board): add subtask API client functions"
```

---

## Task 6: `IssueSubtasks.tsx` 컴포넌트

**Files:**
- Create: `apps/issue-board/src/components/IssueSubtasks.tsx`

- [ ] **Step 1: 구현**

`apps/issue-board/src/components/IssueSubtasks.tsx` 새로 작성:

```tsx
'use client'

// src/components/IssueSubtasks.tsx
import { useEffect, useState } from 'react'
import { createSubtask, deleteSubtask, fetchSubtasks, updateSubtask, type Subtask } from '@/lib/api'

export default function IssueSubtasks({ issueId }: { issueId: number }) {
  const [subtasks, setSubtasks] = useState<Subtask[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')

  useEffect(() => {
    fetchSubtasks(issueId)
      .then(setSubtasks)
      .catch(() => setError('하위 태스크를 불러오지 못했습니다.'))
  }, [issueId])

  async function handleToggle(subtask: Subtask) {
    try {
      const updated = await updateSubtask(subtask.id, { done: !subtask.done })
      setSubtasks((prev) => prev?.map((s) => (s.id === subtask.id ? updated : s)) ?? null)
    } catch {
      setError('하위 태스크 상태 변경에 실패했습니다.')
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteSubtask(id)
      setSubtasks((prev) => prev?.filter((s) => s.id !== id) ?? null)
    } catch {
      setError('하위 태스크 삭제에 실패했습니다.')
    }
  }

  async function handleAdd() {
    const title = newTitle.trim()
    if (!title) return
    try {
      const created = await createSubtask(issueId, title)
      setSubtasks((prev) => [...(prev ?? []), created])
      setNewTitle('')
    } catch {
      setError('하위 태스크 추가에 실패했습니다.')
    }
  }

  if (error) return <p className="text-xs text-red-600 mt-2 ml-6">{error}</p>
  if (subtasks === null) return <p className="text-xs text-zinc-400 mt-2 ml-6">불러오는 중...</p>

  return (
    <div className="mt-2 ml-6 space-y-1">
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

- [ ] **Step 2: 타입 체크**

Run: `cd apps/issue-board && npx tsc --noEmit`
Expected: 에러 없음 (이 컴포넌트는 아직 아무 곳에서도 import 안 됨 — Task 7에서 연결)

- [ ] **Step 3: 커밋**

```bash
git add apps/issue-board/src/components/IssueSubtasks.tsx
git commit -m "feat(issue-board): add IssueSubtasks checklist component"
```

---

## Task 7: `IssueList.tsx` — 펼치기 토글 연결

**Files:**
- Modify: `apps/issue-board/src/components/IssueList.tsx`

- [ ] **Step 1: 전체 교체**

`apps/issue-board/src/components/IssueList.tsx`의 전체 내용을 아래로 교체한다:

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
      setItems((prev) => prev.map((i) => (i.id === issueId ? updated : i)))
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
                  <span className={`text-xs px-2 py-0.5 rounded ${STATUS_STYLE[issue.status]}`}>
                    {STATUS_LABEL[issue.status]}
                  </span>
                </div>
                <p className="text-xs text-zinc-500">{issue.description}</p>
                {isExpanded && <IssueSubtasks issueId={issue.id} />}
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

- [ ] **Step 2: 타입 체크 + 전체 테스트**

Run: `cd apps/issue-board && npx tsc --noEmit`
Expected: 에러 없음

Run: `cd apps/issue-board && npx vitest run`
Expected: 전체 PASS

- [ ] **Step 3: 커밋**

```bash
git add apps/issue-board/src/components/IssueList.tsx
git commit -m "feat(issue-board): wire up subtask expand/collapse toggle on issue cards"
```

---

## Task 8: `/ib-plan` — 승인 직후 하위 태스크 AI 제안

**Files:**
- Modify: `harness_global/.claude/commands/ib-plan.md`

- [ ] **Step 1: 지침 추가**

`harness_global/.claude/commands/ib-plan.md`에서 (현재 144~148번 줄) 아래 텍스트를:

```
3. **버전 확정(마일스톤)** — 매 편집이 아니라 **의미 있는 시점에만** 남긴다:
   - 기획을 확정하면 `update_plan(planId, status="approved")` → 그 시점이 **자동 스냅샷**되고
     MVP 표 행이 이슈로 생성(또는 동기화)된다.
   - 중간 마일스톤을 남기고 싶으면 `snapshot_plan(planId, label="<사유>")`.
   - 그냥 다듬는 중이면 스냅샷하지 마라 (작업본 덮어쓰기로 충분).
```

아래로 교체한다:

```
3. **버전 확정(마일스톤)** — 매 편집이 아니라 **의미 있는 시점에만** 남긴다:
   - 기획을 확정하면 `update_plan(planId, status="approved")` → 그 시점이 **자동 스냅샷**되고
     MVP 표 행이 이슈로 생성(또는 동기화)된다.
   - **새로 생성된 이슈마다 하위 태스크(개발 체크리스트)를 바로 채운다.** 응답에서 신규
     이슈 목록을 가져온다 — 최초 승인이면 `result.issues` 전체, 기획 개정(재승인)이면
     `result.created`만 (`result.updated`는 건드리지 않는다 — 이미 개발자가 체크해둔
     진행 상황을 덮어쓰면 안 된다). 각 이슈의 제목·설명을 보고 개발자 체크리스트
     3~7개를 만들어 `add_subtasks({ issueId, titles })`를 호출한다. 별도 확인 없이
     바로 진행한다 — 대시보드에서 사람이 언제든 추가·수정·삭제할 수 있다.
   - 중간 마일스톤을 남기고 싶으면 `snapshot_plan(planId, label="<사유>")`.
   - 그냥 다듬는 중이면 스냅샷하지 마라 (작업본 덮어쓰기로 충분).
```

- [ ] **Step 2: 육안 검토**

`harness_global/.claude/commands/ib-plan.md` 전체를 다시 읽어 확인한다:
- `### 1)` ~ `### 5)` 섹션 헤딩과 하위 번호(`1.`/`2.`/`3.`)가 깨지지 않았는지
- 기획서 마크다운 템플릿 코드 블록(56~97번 줄)은 이번 변경과 무관하므로 그대로인지

- [ ] **Step 3: 커밋**

```bash
git add harness_global/.claude/commands/ib-plan.md
git commit -m "docs(ib-plan): suggest developer subtask checklist right after plan approval"
```

---

## Task 9: 수동 브라우저 검증

**Files:** 없음 (검증 전용)

이 태스크는 실제 `/ib-plan` LLM 세션을 돌리지 않고, `add_subtasks`가 하는 일과 정확히 같은 일(이슈에 하위 태스크 붙이기)을 REST API로 직접 재현해 배관 전체(모델 → REST → 프론트 컴포넌트)가 맞물려 동작하는지 확인한다.

- [ ] **Step 1: 세 서버 기동 확인**

```bash
curl -sf http://localhost:4000/api/projects -o /dev/null -w "issue-board-mcp: %{http_code}\n" || echo "cd apps/issue-board-mcp && npm run dev"
curl -sf http://localhost:5173 -o /dev/null -w "issue-board: %{http_code}\n" || echo "cd apps/issue-board && npm run dev"
```

- [ ] **Step 2: 이슈에 하위 태스크 3개 추가 (REST로 직접, `/ib-plan`이 승인 직후 호출할 것과 동일한 모양)**

기존 `ib-test-project`(projectId=4)의 이슈 중 하나(예: #1, 실제 issueId는 `GET /api/projects/4/issues`로 확인)에 대해:

```bash
curl -s http://localhost:4000/api/projects/4/issues | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).map(i=>i.id+':#'+i.number+':'+i.title)))"
```

위에서 확인한 첫 번째 이슈의 `id`를 `<ISSUE_ID>`에 넣어:

```bash
curl -s -X POST "http://localhost:4000/api/issues/<ISSUE_ID>/subtasks" -H 'Content-Type: application/json' -d '{"title":"API 라우터 추가"}'
curl -s -X POST "http://localhost:4000/api/issues/<ISSUE_ID>/subtasks" -H 'Content-Type: application/json' -d '{"title":"단위 테스트 작성"}'
curl -s -X POST "http://localhost:4000/api/issues/<ISSUE_ID>/subtasks" -H 'Content-Type: application/json' -d '{"title":"프론트 폼 연결"}'
curl -s "http://localhost:4000/api/issues/<ISSUE_ID>/subtasks"
```

Expected: 마지막 GET 응답이 방금 만든 3개를 생성 순서대로 담은 배열.

- [ ] **Step 3: 대시보드에서 펼치기/체크/추가/삭제 확인**

`http://localhost:5173/projects/4/issues`를 브라우저로 열어:
- 해당 이슈 카드 왼쪽의 ▶를 클릭 → 방금 만든 하위 태스크 3개가 체크박스 목록으로 나타나는지 (▶가 ▼로 바뀌는지)
- 체크박스 하나를 클릭 → 즉시 완료 표시(취소선)로 바뀌는지, 새로고침해도 유지되는지
- × 버튼으로 하나 삭제 → 목록에서 바로 사라지는지
- "+ 새 하위 항목"에 텍스트 입력 후 엔터 → 목록에 추가되는지
- 하위 태스크가 없는 다른 이슈를 펼쳐서 → 에러 없이 빈 목록(입력창만) 뜨는지

- [ ] **Step 4: 정리 및 결과 보고**

```bash
node -e "console.log('cleanup: manually delete the 2 remaining test subtasks via dashboard × button, or leave them — this is the shared ib-test-project reference data')"
```

문제 없으면 완료 보고. 문제가 있으면 어떤 화면에서 무엇이 어긋났는지 기록하고 해당 Task로 돌아가 수정한다.
