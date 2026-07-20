# 하위 태스크 작업 로그(Notes) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 이슈 하위 태스크(`issue_subtasks`) 각 항목에 사람이 직접 작성하는 마크다운 작업 로그(`notes`)를 붙이고, 대시보드에서 행의 상태 셀렉트 왼쪽에 있는 문서 버튼을 눌러 사이드바로 확인/편집할 수 있게 한다.

**Architecture:** `issue_subtasks` 테이블에 `notes TEXT` 컬럼 하나만 추가한다(실제 파일시스템 `.md` 파일 없음). 모델 → REST → 프론트 API 클라이언트까지 기존 `updateSubtask` 부분 업데이트 경로에 `notes` 필드를 얹어 그대로 재사용하고, 새 라우트/새 MCP 툴은 만들지 않는다. UI는 신규 `SubtaskNoteSidebar.tsx`(사이드바, textarea 편집 + `react-markdown` 미리보기)를 `IssueSubtasks.tsx`에서 문서 버튼으로 연다.

**Tech Stack:** Node 20 · TypeScript · better-sqlite3 · express (백엔드, `apps/issue-board-mcp`) / Next.js 15 · React 19 · Tailwind v4 · react-markdown · remark-gfm (프론트, `apps/issue-board`) — 기존 스택 그대로.

**참고 문서:** `docs/specs/2026-07-20-subtask-notes-design.md`

---

## 파일 구조

| 파일 | 역할 |
|---|---|
| `apps/issue-board-mcp/src/db.ts` | (수정) `issue_subtasks.notes` 컬럼 마이그레이션 추가 |
| `apps/issue-board-mcp/src/types.ts` | (수정) `Subtask.notes: string` 추가 |
| `apps/issue-board-mcp/src/models/subtasks.ts` | (수정) `notes` CRUD 반영 |
| `apps/issue-board-mcp/src/models/subtasks.test.ts` | (수정) `notes` 모델 테스트 추가 |
| `apps/issue-board-mcp/src/rest/app.ts` | (수정) `PUT /api/subtasks/:id`가 `notes`도 받도록 |
| `apps/issue-board-mcp/src/rest/app.test.ts` | (수정) `notes` REST 테스트 추가 |
| `apps/issue-board/src/lib/api.ts` | (수정) `Subtask.notes` 타입 + `updateSubtask` fields 확장 |
| `apps/issue-board/src/lib/api.test.ts` | (수정) `notes` 클라이언트 테스트 추가 |
| `apps/issue-board/src/components/SubtaskNoteSidebar.tsx` | (신규) 작업 로그 편집 사이드바 |
| `apps/issue-board/src/components/IssueSubtasks.tsx` | (수정) 문서 버튼 + 사이드바 연결 |

---

## Task 1: DB 스키마 + `Subtask` 타입

**Files:**
- Modify: `apps/issue-board-mcp/src/db.ts:94-99`
- Modify: `apps/issue-board-mcp/src/types.ts:82-89`

이 태스크는 스키마/타입 변경만 하고 새 테스트는 추가하지 않는다 — 실제 동작 검증은 Task 2의 모델 테스트가 한다(기존 `docs/plans/2026-07-16-issue-subtasks.md` Task 1과 동일한 관례).

- [ ] **Step 1: `issue_subtasks.notes` 컬럼 마이그레이션 추가**

`apps/issue-board-mcp/src/db.ts`에서 (현재 94~99번 줄) 아래 텍스트를:

```ts
  const projectCols = db.prepare('PRAGMA table_info(projects)').all() as { name: string }[]
  if (!projectCols.some((c) => c.name === 'dev_url')) {
    db.exec('ALTER TABLE projects ADD COLUMN dev_url TEXT')
  }

  return db
}
```

아래로 교체한다:

```ts
  const projectCols = db.prepare('PRAGMA table_info(projects)').all() as { name: string }[]
  if (!projectCols.some((c) => c.name === 'dev_url')) {
    db.exec('ALTER TABLE projects ADD COLUMN dev_url TEXT')
  }

  const subtaskCols = db.prepare('PRAGMA table_info(issue_subtasks)').all() as { name: string }[]
  if (!subtaskCols.some((c) => c.name === 'notes')) {
    db.exec("ALTER TABLE issue_subtasks ADD COLUMN notes TEXT NOT NULL DEFAULT ''")
  }

  return db
}
```

- [ ] **Step 2: `Subtask` 타입에 `notes` 추가**

`apps/issue-board-mcp/src/types.ts`에서 (현재 82~89번 줄) 아래 텍스트를:

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

아래로 교체한다:

```ts
export interface Subtask {
  id: number
  issueId: number
  title: string
  done: boolean
  notes: string
  createdAt: string
  updatedAt: string
}
```

- [ ] **Step 3: 기존 테스트가 여전히 통과하는지 확인**

Run: `cd apps/issue-board-mcp && npm test`
Expected: 기존과 동일하게 전부 PASS

- [ ] **Step 4: 커밋**

```bash
git add apps/issue-board-mcp/src/db.ts apps/issue-board-mcp/src/types.ts
git commit -m "feat(issue-board-mcp): add issue_subtasks.notes column and type"
```

---

## Task 2: `subtasks.ts` 모델 — `notes` CRUD

**Files:**
- Modify: `apps/issue-board-mcp/src/models/subtasks.ts`
- Modify: `apps/issue-board-mcp/src/models/subtasks.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/issue-board-mcp/src/models/subtasks.test.ts`에서, `it('createSubtask creates a subtask that starts undone', ...)` 테스트(현재 40~45번 줄) 바로 뒤에 아래 테스트를 추가한다:

```ts
  it('createSubtask starts with empty notes', () => {
    const subtask = createSubtask(db, issueId, '제목')
    expect(subtask.notes).toBe('')
  })
```

그리고 `it('updateSubtask toggles done and updates title independently', ...)` 테스트(현재 53~62번 줄) 바로 뒤에 아래 테스트를 추가한다:

```ts
  it('updateSubtask updates notes independently of title and done', () => {
    const subtask = createSubtask(db, issueId, '제목')
    const withNotes = updateSubtask(db, subtask.id, { notes: '완료: API 라우터 작성함' })
    expect(withNotes?.notes).toBe('완료: API 라우터 작성함')
    expect(withNotes?.title).toBe('제목')
    expect(withNotes?.done).toBe(false)

    const toggled = updateSubtask(db, subtask.id, { done: true })
    expect(toggled?.notes).toBe('완료: API 라우터 작성함')
  })
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `cd apps/issue-board-mcp && npm test -- subtasks.test.ts`
Expected: FAIL — `subtask.notes`/`withNotes?.notes`가 `undefined` (아직 `rowToSubtask`가 `notes`를 읽지 않고, `updateSubtask`가 `notes`를 반영하지 않음)

- [ ] **Step 3: 구현**

`apps/issue-board-mcp/src/models/subtasks.ts`의 `rowToSubtask` 함수를:

```ts
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
```

아래로 교체한다:

```ts
function rowToSubtask(row: any): Subtask {
  return {
    id: row.id,
    issueId: row.issue_id,
    title: row.title,
    done: Boolean(row.done),
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
```

`createSubtask` 함수의 반환 객체를:

```ts
  return {
    id: Number(result.lastInsertRowid),
    issueId,
    title,
    done: false,
    createdAt: now,
    updatedAt: now,
  }
```

아래로 교체한다 (INSERT문 자체는 그대로 둔다 — DB 컬럼 `DEFAULT ''`가 이미 채워준다):

```ts
  return {
    id: Number(result.lastInsertRowid),
    issueId,
    title,
    done: false,
    notes: '',
    createdAt: now,
    updatedAt: now,
  }
```

`updateSubtask` 함수 전체를:

```ts
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
```

아래로 교체한다:

```ts
export function updateSubtask(
  db: Database.Database,
  id: number,
  fields: { title?: string; done?: boolean; notes?: string }
): Subtask | null {
  const existing = getSubtask(db, id)
  if (!existing) return null
  const now = new Date().toISOString()
  db.prepare('UPDATE issue_subtasks SET title = ?, done = ?, notes = ?, updated_at = ? WHERE id = ?').run(
    fields.title ?? existing.title,
    (fields.done ?? existing.done) ? 1 : 0,
    fields.notes ?? existing.notes,
    now,
    id
  )
  return getSubtask(db, id)
}
```

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `cd apps/issue-board-mcp && npm test -- subtasks.test.ts`
Expected: PASS (전체)

- [ ] **Step 5: 커밋**

```bash
git add apps/issue-board-mcp/src/models/subtasks.ts apps/issue-board-mcp/src/models/subtasks.test.ts
git commit -m "feat(issue-board-mcp): add notes field to subtask model"
```

---

## Task 3: REST — `PUT /api/subtasks/:id`가 `notes`도 받도록

**Files:**
- Modify: `apps/issue-board-mcp/src/rest/app.ts:185-192`
- Modify: `apps/issue-board-mcp/src/rest/app.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/issue-board-mcp/src/rest/app.test.ts`에서, `it('PUT /api/subtasks/:id returns 400 for an empty title', ...)` 테스트(현재 373~394번 줄)가 끝나는 `})` 바로 뒤, `it('GET /api/projects/:id/issues includes subtaskProgress per issue', ...)` 테스트 앞에 아래 테스트를 추가한다:

```ts
  it('PUT /api/subtasks/:id updates notes without touching title or done', async () => {
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

    const res = await request(app)
      .put(`/api/subtasks/${created.body.id}`)
      .send({ notes: '완료: API 라우터 작성' })
    expect(res.status).toBe(200)
    expect(res.body.notes).toBe('완료: API 라우터 작성')
    expect(res.body.title).toBe('t')
    expect(res.body.done).toBe(false)
  })
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `cd apps/issue-board-mcp && npm test -- app.test.ts`
Expected: FAIL — `res.body.notes`가 `''` (라우트가 아직 `notes`를 body에서 읽어 전달하지 않음)

- [ ] **Step 3: 구현**

`apps/issue-board-mcp/src/rest/app.ts`에서 (현재 185~192번 줄) 아래 텍스트를:

```ts
  app.put('/api/subtasks/:id', asyncHandler(async (req, res) => {
    const { title, done } = req.body ?? {}
    if (title !== undefined && !title) return res.status(400).json({ error: 'title required' })
    const updated = updateSubtask(db, Number(req.params.id), { title, done })
    if (!updated) return res.status(404).json({ error: 'not found' })
    await maybeAutoCompleteIssue(db, updated.issueId)
    res.json(updated)
  }))
```

아래로 교체한다:

```ts
  app.put('/api/subtasks/:id', asyncHandler(async (req, res) => {
    const { title, done, notes } = req.body ?? {}
    if (title !== undefined && !title) return res.status(400).json({ error: 'title required' })
    const updated = updateSubtask(db, Number(req.params.id), { title, done, notes })
    if (!updated) return res.status(404).json({ error: 'not found' })
    await maybeAutoCompleteIssue(db, updated.issueId)
    res.json(updated)
  }))
```

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `cd apps/issue-board-mcp && npm test -- app.test.ts`
Expected: PASS (전체)

- [ ] **Step 5: 커밋**

```bash
git add apps/issue-board-mcp/src/rest/app.ts apps/issue-board-mcp/src/rest/app.test.ts
git commit -m "feat(issue-board-mcp): let PUT /api/subtasks/:id update notes"
```

---

## Task 4: 프론트 API 클라이언트 — `Subtask.notes` + `updateSubtask` 확장

**Files:**
- Modify: `apps/issue-board/src/lib/api.ts:162-194`
- Modify: `apps/issue-board/src/lib/api.test.ts`

이 태스크는 순수 타입/클라이언트 변경이라 실제로 동작을 깨는 "실패하는 테스트"를 먼저 쓰기 어렵다 (JS는 런타임에서 여분의 객체 필드를 그냥 통과시키므로, 테스트만으로는 구현 전/후 차이가 나지 않는다 — 진짜 게이트는 TypeScript 컴파일러다). 그래서 이 태스크는 구현 → 테스트 추가 → 타입체크 순서로 진행한다.

- [ ] **Step 1: `Subtask` 인터페이스에 `notes` 추가**

`apps/issue-board/src/lib/api.ts`에서 (현재 162~167번 줄) 아래 텍스트를:

```ts
export interface Subtask {
  id: number
  issueId: number
  title: string
  done: boolean
}
```

아래로 교체한다:

```ts
export interface Subtask {
  id: number
  issueId: number
  title: string
  done: boolean
  notes: string
}
```

- [ ] **Step 2: `updateSubtask` 클라이언트 함수의 `fields` 타입에 `notes` 추가**

`apps/issue-board/src/lib/api.ts`에서 (현재 183~194번 줄) 아래 텍스트를:

```ts
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
```

아래로 교체한다:

```ts
export async function updateSubtask(
  id: number,
  fields: { title?: string; done?: boolean; notes?: string }
): Promise<Subtask> {
  return json(
    await fetch(`${BASE_URL}/api/subtasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
  )
}
```

- [ ] **Step 3: 회귀 테스트 추가**

`apps/issue-board/src/lib/api.test.ts`에서, `it('updateSubtask calls PUT /api/subtasks/:id with partial fields', ...)` 테스트(현재 77~86번 줄) 바로 뒤에 아래 테스트를 추가한다:

```ts
  it('updateSubtask forwards the notes field', async () => {
    ;(fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ id: 1, title: 't', done: false, notes: '메모' }),
    })
    const updated = await updateSubtask(1, { notes: '메모' })
    expect(fetch).toHaveBeenCalledWith('http://localhost:4000/api/subtasks/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: '메모' }),
    })
    expect(updated.notes).toBe('메모')
  })
```

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `cd apps/issue-board && npx vitest run src/lib/api.test.ts`
Expected: PASS (전체)

- [ ] **Step 5: 타입 체크**

Run: `cd apps/issue-board && npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 6: 커밋**

```bash
git add apps/issue-board/src/lib/api.ts apps/issue-board/src/lib/api.test.ts
git commit -m "feat(issue-board): add notes to Subtask client type"
```

---

## Task 5: `SubtaskNoteSidebar.tsx` 컴포넌트

**Files:**
- Create: `apps/issue-board/src/components/SubtaskNoteSidebar.tsx`

이 저장소는 React 컴포넌트에 대한 자동 테스트(RTL 등)를 쓰지 않는다(`api.ts`/`subtasks.ts` 같은 로직 계층만 vitest로 테스트). 이 컴포넌트는 타입 체크와 Task 7의 수동 브라우저 검증으로 확인한다.

- [ ] **Step 1: 구현**

`apps/issue-board/src/components/SubtaskNoteSidebar.tsx` 새로 작성:

```tsx
'use client'

// src/components/SubtaskNoteSidebar.tsx
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { updateSubtask, type Subtask } from '@/lib/api'

export default function SubtaskNoteSidebar({
  subtask,
  onClose,
  onSaved,
}: {
  subtask: Subtask
  onClose: () => void
  onSaved: (updated: Subtask) => void
}) {
  const [draft, setDraft] = useState(subtask.notes)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const updated = await updateSubtask(subtask.id, { notes: draft })
      onSaved(updated)
    } catch {
      setError('저장에 실패했습니다. 다시 시도하세요.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <aside className="fixed top-0 right-0 h-full w-96 bg-white border-l border-zinc-200 shadow-lg p-4 flex flex-col gap-3 z-20 overflow-y-auto">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-zinc-800 truncate">{subtask.title}</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-zinc-400 hover:text-zinc-700 text-sm px-1 shrink-0"
          aria-label="닫기"
        >
          ×
        </button>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="작업 로그를 마크다운으로 작성하세요"
        className="w-full h-40 text-sm border border-zinc-200 rounded p-2 font-mono resize-none"
      />

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="self-start text-xs px-3 py-1.5 rounded bg-indigo-600 text-white disabled:opacity-50"
      >
        {saving ? '저장 중...' : '저장'}
      </button>

      <div className="border-t border-zinc-200 pt-3">
        <p className="text-xs text-zinc-400 mb-1">미리보기</p>
        <div className="text-sm">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="my-1.5 leading-relaxed text-zinc-700">{children}</p>,
              ul: ({ children }) => <ul className="my-1.5 ml-4 list-disc space-y-0.5 text-zinc-700">{children}</ul>,
              ol: ({ children }) => <ol className="my-1.5 ml-4 list-decimal space-y-0.5 text-zinc-700">{children}</ol>,
              strong: ({ children }) => <strong className="font-semibold text-zinc-900">{children}</strong>,
              code: ({ children }) => <code className="text-xs bg-zinc-100 rounded px-1 py-0.5">{children}</code>,
            }}
          >
            {draft || '_아직 작성된 내용이 없습니다._'}
          </ReactMarkdown>
        </div>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: 타입 체크**

Run: `cd apps/issue-board && npx tsc --noEmit`
Expected: 에러 없음 (이 컴포넌트는 아직 아무 곳에서도 import 안 됨 — Task 6에서 연결)

- [ ] **Step 3: 커밋**

```bash
git add apps/issue-board/src/components/SubtaskNoteSidebar.tsx
git commit -m "feat(issue-board): add SubtaskNoteSidebar component"
```

---

## Task 6: `IssueSubtasks.tsx` — 문서 버튼 + 사이드바 연결

**Files:**
- Modify: `apps/issue-board/src/components/IssueSubtasks.tsx`

- [ ] **Step 1: import 추가 + 사이드바 상태 추가**

`apps/issue-board/src/components/IssueSubtasks.tsx`의 import 줄(현재 1~5번 줄)을:

```tsx
'use client'

// src/components/IssueSubtasks.tsx
import { useEffect, useRef, useState } from 'react'
import { createSubtask, deleteSubtask, fetchSubtasks, updateSubtask, type Subtask } from '@/lib/api'
```

아래로 교체한다:

```tsx
'use client'

// src/components/IssueSubtasks.tsx
import { useEffect, useRef, useState } from 'react'
import { createSubtask, deleteSubtask, fetchSubtasks, updateSubtask, type Subtask } from '@/lib/api'
import SubtaskNoteSidebar from './SubtaskNoteSidebar'
```

`IssueSubtasks` 함수 본문 상단의 상태 선언부(현재 27~31번 줄) 를:

```tsx
  const [subtasks, setSubtasks] = useState<Subtask[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const addingRef = useRef(false)
```

아래로 교체한다:

```tsx
  const [subtasks, setSubtasks] = useState<Subtask[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [noteSubtaskId, setNoteSubtaskId] = useState<number | null>(null)
  const addingRef = useRef(false)
```

- [ ] **Step 2: 문서 버튼을 상태 셀렉트 왼쪽에 추가**

같은 파일에서 (현재 92~123번 줄, `<ul>` 안 `subtasks.map` 블록) 아래 텍스트를:

```tsx
      {subtasks.map((subtask) => (
        <li key={subtask.id} className={`group ${BOX} flex items-center gap-2`}>
          <span
            className={
              subtask.done
                ? 'line-through text-zinc-400 text-sm flex-1 min-w-0'
                : 'text-sm text-zinc-800 flex-1 min-w-0'
            }
          >
            {subtask.title}
          </span>
          <select
            value={subtask.done ? 'done' : 'open'}
            onChange={(e) => handleStatusChange(subtask, e.target.value === 'done')}
            className={`text-xs px-2 py-1.5 rounded cursor-pointer shrink-0 ${
              subtask.done ? SUBTASK_STATUS.done.style : SUBTASK_STATUS.open.style
            }`}
            aria-label={`${subtask.title} 상태`}
          >
            <option value="open">{SUBTASK_STATUS.open.label}</option>
            <option value="done">{SUBTASK_STATUS.done.label}</option>
          </select>
          <button
            type="button"
            onClick={() => handleDelete(subtask.id)}
            className="opacity-0 group-hover:opacity-100 text-zinc-300 hover:text-red-500 text-sm px-1 shrink-0"
            aria-label="삭제"
          >
            ×
          </button>
        </li>
      ))}
```

아래로 교체한다:

```tsx
      {subtasks.map((subtask) => (
        <li key={subtask.id} className={`group ${BOX} flex items-center gap-2`}>
          <span
            className={
              subtask.done
                ? 'line-through text-zinc-400 text-sm flex-1 min-w-0'
                : 'text-sm text-zinc-800 flex-1 min-w-0'
            }
          >
            {subtask.title}
          </span>
          <button
            type="button"
            onClick={() => setNoteSubtaskId(subtask.id)}
            className={`text-sm px-1 shrink-0 ${
              subtask.notes ? 'text-indigo-500 hover:text-indigo-700' : 'text-zinc-300 hover:text-zinc-500'
            }`}
            aria-label="작업 로그"
          >
            📄
          </button>
          <select
            value={subtask.done ? 'done' : 'open'}
            onChange={(e) => handleStatusChange(subtask, e.target.value === 'done')}
            className={`text-xs px-2 py-1.5 rounded cursor-pointer shrink-0 ${
              subtask.done ? SUBTASK_STATUS.done.style : SUBTASK_STATUS.open.style
            }`}
            aria-label={`${subtask.title} 상태`}
          >
            <option value="open">{SUBTASK_STATUS.open.label}</option>
            <option value="done">{SUBTASK_STATUS.done.label}</option>
          </select>
          <button
            type="button"
            onClick={() => handleDelete(subtask.id)}
            className="opacity-0 group-hover:opacity-100 text-zinc-300 hover:text-red-500 text-sm px-1 shrink-0"
            aria-label="삭제"
          >
            ×
          </button>
        </li>
      ))}
```

- [ ] **Step 3: 사이드바를 렌더하도록 return 문을 감싸기**

같은 파일의 return 문 시작 부분(현재 89~90번 줄)을:

```tsx
  return (
    <ul className="ml-6 space-y-2 list-none">
```

아래로 교체한다:

```tsx
  const noteTarget = noteSubtaskId === null ? null : (subtasks.find((s) => s.id === noteSubtaskId) ?? null)

  return (
    <>
    <ul className="ml-6 space-y-2 list-none">
```

그리고 return 문의 닫는 부분(현재 136~138번 줄)을:

```tsx
    </ul>
  )
}
```

아래로 교체한다:

```tsx
    </ul>
    {noteTarget && (
      <SubtaskNoteSidebar
        subtask={noteTarget}
        onClose={() => setNoteSubtaskId(null)}
        onSaved={(updated) => {
          setSubtasks((prev) => prev?.map((s) => (s.id === updated.id ? updated : s)) ?? null)
        }}
      />
    )}
    </>
  )
}
```

(`noteTarget` 계산은 `subtasks === null`인 이른 반환 두 곳 — `loadError`/로딩 중 — 보다 아래, 즉 `subtasks`가 배열로 확정된 지점에 있으므로 `subtasks.find(...)`가 안전하다.)

- [ ] **Step 4: 타입 체크**

Run: `cd apps/issue-board && npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 5: 커밋**

```bash
git add apps/issue-board/src/components/IssueSubtasks.tsx
git commit -m "feat(issue-board): wire up subtask note sidebar via document button"
```

---

## Task 7: 수동 브라우저 검증

**Files:** 없음 (검증 전용)

- [ ] **Step 1: 세 서버 기동 확인**

```bash
curl -sf http://localhost:4000/api/projects -o /dev/null -w "issue-board-mcp: %{http_code}\n" || echo "cd apps/issue-board-mcp && npm run dev"
curl -sf http://localhost:5173 -o /dev/null -w "issue-board: %{http_code}\n" || echo "cd apps/issue-board && npm run dev"
```

- [ ] **Step 2: 대시보드에서 확인**

`http://localhost:5173/projects/<projectId>/issues`를 열어 이슈 카드를 펼치고(▶ 클릭), 하위 태스크 행에서:

- 제목과 상태 셀렉트 사이에 문서 아이콘(📄)이 보이는지 (아직 로그가 없으면 흐린 색)
- 아이콘 클릭 → 화면 오른쪽에서 사이드바가 열리는지, 해당 하위 태스크 제목이 상단에 보이는지
- textarea에 마크다운 텍스트(예: `**완료**: API 라우터 추가함\n- 테스트 3개 통과`) 입력 → "저장" 클릭 → 아래 미리보기가 굵게/목록으로 렌더되는지
- 사이드바를 닫고 다시 그 아이콘을 클릭 → 방금 저장한 내용이 textarea에 그대로 남아있는지, 아이콘 색이 "기록 있음" 색으로 바뀌었는지
- 페이지 새로고침 후에도 로그가 유지되는지
- 다른 행의 문서 아이콘을 클릭 → 사이드바 내용이 그 행의 로그로 교체되는지 (섞이지 않는지)
- 로그가 없는 다른 하위 태스크에서 사이드바를 열면 빈 textarea + "아직 작성된 내용이 없습니다" 미리보기가 뜨는지

- [ ] **Step 3: 결과 보고**

문제 없으면 완료 보고. 문제가 있으면 어떤 화면에서 무엇이 어긋났는지 기록하고 해당 Task로 돌아가 수정한다.
