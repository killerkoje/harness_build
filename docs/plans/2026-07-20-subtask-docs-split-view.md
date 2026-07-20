# 하위 태스크 문서 — 전용 스플릿 뷰 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 하위 태스크 행의 문서 아이콘→고정 사이드바 UI를 걷어내고, 이슈별 전용 문서 화면(좌: 하위 태스크 목록, 드래그 리사이저, 우: 편집/미리보기 탭)으로 교체한다.

**Architecture:** 백엔드(DB 컬럼·모델·REST)와 프론트 API 클라이언트(`updateSubtask(id, { notes })`)는 기존 그대로 재사용한다. 기존 와이어프레임 화면과 동일한 패턴 — `/projects/[id]/issues` 라우트에 `?issueId=` 쿼리 파라미터로 분기해서, 있으면 새 `IssueDocsBoard`(전용 화면), 없으면 기존 `IssueList`(이슈 목록)를 렌더한다. `IssueSubtasks.tsx`는 문서 관련 UI를 걷어내고 원래(체크리스트만 있는) 형태로 되돌린다.

**Tech Stack:** Next.js 15 · React 19 · Tailwind v4 · react-markdown · remark-gfm — 기존 `apps/issue-board`와 동일 스택. 백엔드 변경 없음.

**참고 문서:** `docs/specs/2026-07-20-subtask-docs-split-view-design.md`

---

## 파일 구조

| 파일 | 역할 |
|---|---|
| `apps/issue-board/src/components/SubtaskNoteSidebar.tsx` | (삭제) 사이드바 UI, 스플릿 뷰로 대체됨 |
| `apps/issue-board/src/components/IssueSubtasks.tsx` | (수정) 문서 버튼/사이드바 관련 코드 제거, 원래 체크리스트 전용 형태로 복귀 |
| `apps/issue-board/src/components/IssueList.tsx` | (수정) `projectId` prop 복귀 + "문서 보기 →" 링크 추가 |
| `apps/issue-board/src/components/IssueDocsBoard.tsx` | (신규) 스플릿 뷰 화면 |
| `apps/issue-board/src/app/projects/[id]/issues/page.tsx` | (수정) `searchParams.issueId`로 목록/문서화면 분기 |

---

## Task 1: `IssueSubtasks.tsx` — 문서 버튼/사이드바 걷어내기

**Files:**
- Modify: `apps/issue-board/src/components/IssueSubtasks.tsx`

- [ ] **Step 1: 전체 교체**

`apps/issue-board/src/components/IssueSubtasks.tsx`의 전체 내용을 아래로 교체한다 (문서 아이콘 버튼, `noteSubtaskId` state, `SubtaskNoteSidebar` import/렌더, 감싸던 `<div>` 래퍼를 모두 제거하고 원래 `<ul>` 단일 루트로 복귀 — 상태 변경/삭제/추가 로직은 그대로):

```tsx
'use client'

// src/components/IssueSubtasks.tsx
import { useEffect, useRef, useState } from 'react'
import { createSubtask, deleteSubtask, fetchSubtasks, updateSubtask, type Subtask } from '@/lib/api'

type Progress = { total: number; done: number } | null

const BOX = 'bg-white border border-zinc-200 rounded-xl p-4'

const SUBTASK_STATUS = {
  open: { label: '미완료', style: 'bg-zinc-100 text-zinc-600' },
  done: { label: '완료', style: 'bg-indigo-50 text-indigo-700' },
} as const

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
  const addingRef = useRef(false)

  useEffect(() => {
    fetchSubtasks(issueId)
      .then(setSubtasks)
      .catch(() => setLoadError(true))
  }, [issueId])

  useEffect(() => {
    if (subtasks !== null) onProgressChange?.(computeProgress(subtasks))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtasks])

  async function handleStatusChange(subtask: Subtask, done: boolean) {
    if (subtask.done === done) return
    setActionError(null)
    try {
      const updated = await updateSubtask(subtask.id, { done })
      setSubtasks((prev) => prev?.map((s) => (s.id === subtask.id ? updated : s)) ?? null)
    } catch {
      setActionError('하위 태스크 상태 변경에 실패했습니다.')
    }
  }

  async function handleDelete(id: number) {
    setActionError(null)
    try {
      await deleteSubtask(id)
      setSubtasks((prev) => prev?.filter((s) => s.id !== id) ?? null)
    } catch {
      setActionError('하위 태스크 삭제에 실패했습니다.')
    }
  }

  async function handleAdd() {
    const title = newTitle.trim()
    if (!title || addingRef.current) return
    addingRef.current = true
    setNewTitle('')
    setActionError(null)
    try {
      const created = await createSubtask(issueId, title)
      setSubtasks((prev) => [...(prev ?? []), created])
    } catch {
      setActionError('하위 태스크 추가에 실패했습니다.')
      setNewTitle(title)
    } finally {
      addingRef.current = false
    }
  }

  if (loadError) {
    return <p className={`text-xs text-red-600 ml-6 ${BOX}`}>하위 태스크를 불러오지 못했습니다.</p>
  }
  if (subtasks === null) {
    return <p className="text-xs text-zinc-400 ml-6">불러오는 중...</p>
  }

  return (
    <ul className="ml-6 space-y-2 list-none">
      {actionError && <li className={`text-xs text-red-600 ${BOX}`}>{actionError}</li>}
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
      <li className={BOX}>
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || e.nativeEvent.isComposing) return
            e.preventDefault()
            void handleAdd()
          }}
          placeholder="+ 새 하위 항목"
          className="w-full text-sm text-zinc-500 placeholder:text-zinc-400 bg-transparent outline-none"
        />
      </li>
    </ul>
  )
}
```

- [ ] **Step 2: 삭제한 컴포넌트가 더 이상 참조되지 않는지 확인**

Run: `cd apps/issue-board && grep -rn "SubtaskNoteSidebar" src/`
Expected: `IssueSubtasks.tsx`에서 삭제됐으므로 아무 결과 없음 (아직 `SubtaskNoteSidebar.tsx` 파일 자체는 Task 2에서 지운다 — 지금은 참조만 사라진 상태)

- [ ] **Step 3: 커밋**

```bash
git add apps/issue-board/src/components/IssueSubtasks.tsx
git commit -m "refactor(issue-board): remove doc sidebar wiring from IssueSubtasks, revert to plain checklist"
```

---

## Task 2: `SubtaskNoteSidebar.tsx` 삭제

**Files:**
- Delete: `apps/issue-board/src/components/SubtaskNoteSidebar.tsx`

- [ ] **Step 1: 파일 삭제**

```bash
git rm apps/issue-board/src/components/SubtaskNoteSidebar.tsx
```

- [ ] **Step 2: 타입 체크**

Run: `cd apps/issue-board && npx tsc --noEmit`
Expected: 에러 없음 (Task 1에서 이미 참조를 제거했으므로 깨지는 곳 없어야 함)

- [ ] **Step 3: 커밋**

```bash
git commit -m "refactor(issue-board): delete SubtaskNoteSidebar (replaced by docs split view)"
```

---

## Task 3: `IssueList.tsx` — `projectId` 복귀 + "문서 보기 →" 링크

**Files:**
- Modify: `apps/issue-board/src/components/IssueList.tsx`

- [ ] **Step 1: `projectId` prop 복귀**

`apps/issue-board/src/components/IssueList.tsx`에서 (현재 18~24번 줄) 아래 텍스트를:

```tsx
export default function IssueList({
  issues,
  plans,
}: {
  issues: Issue[]
  plans: Plan[]
}) {
```

아래로 교체한다:

```tsx
export default function IssueList({
  issues,
  plans,
  projectId,
}: {
  issues: Issue[]
  plans: Plan[]
  projectId: number
}) {
```

- [ ] **Step 2: "문서 보기 →" 링크 추가**

같은 파일에서 (현재 108~110번 줄) 아래 텍스트를:

```tsx
                  </div>
                  <p className="text-xs text-zinc-500">{issue.description}</p>
                </div>
```

아래로 교체한다:

```tsx
                  </div>
                  <p className="text-xs text-zinc-500">{issue.description}</p>
                  <div className="mt-2">
                    <a
                      href={`/projects/${projectId}/issues?issueId=${issue.id}`}
                      className="text-xs text-indigo-600"
                    >
                      문서 보기 →
                    </a>
                  </div>
                </div>
```

- [ ] **Step 3: 타입 체크**

Run: `cd apps/issue-board && npx tsc --noEmit`
Expected: `projectId`를 안 넘기는 호출부(`page.tsx`) 때문에 에러 발생 — Task 5에서 고친다. 지금 단계에서 에러가 나는 게 정상이다.

- [ ] **Step 4: 커밋**

```bash
git add apps/issue-board/src/components/IssueList.tsx
git commit -m "feat(issue-board): add projectId prop and doc link back to IssueList"
```

---

## Task 4: `IssueDocsBoard.tsx` 신규 컴포넌트

**Files:**
- Create: `apps/issue-board/src/components/IssueDocsBoard.tsx`

이 저장소는 컴포넌트 자동 테스트(RTL 등)를 쓰지 않는다 — 타입 체크와 Task 6의 수동 브라우저 검증으로 확인한다.

- [ ] **Step 1: 구현**

`apps/issue-board/src/components/IssueDocsBoard.tsx` 새로 작성:

```tsx
'use client'

// src/components/IssueDocsBoard.tsx
import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { updateSubtask, type Issue, type Subtask } from '@/lib/api'

const MIN_LIST_WIDTH = 220
const DOC_PANE_MIN_MARGIN = 320

export default function IssueDocsBoard({
  projectId,
  issue,
  subtasks: initialSubtasks,
}: {
  projectId: number
  issue: Issue
  subtasks: Subtask[]
}) {
  const [subtasks, setSubtasks] = useState(initialSubtasks)
  const [selectedId, setSelectedId] = useState<number | null>(initialSubtasks[0]?.id ?? null)
  const [draft, setDraft] = useState(initialSubtasks[0]?.notes ?? '')
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [listWidth, setListWidth] = useState(340)
  const containerRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)

  const selected = subtasks.find((s) => s.id === selectedId) ?? null
  const dirty = selected != null && draft !== selected.notes

  function selectSubtask(id: number) {
    if (id === selectedId) return
    if (dirty && !window.confirm('저장되지 않은 문서 변경이 있습니다. 이동할까요?')) return
    const target = subtasks.find((s) => s.id === id)
    setSelectedId(id)
    setDraft(target?.notes ?? '')
    setMode('edit')
    setSaveError(null)
  }

  async function handleSave() {
    if (!selected) return
    setSaving(true)
    setSaveError(null)
    try {
      const updated = await updateSubtask(selected.id, { notes: draft })
      setSubtasks((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
    } catch {
      setSaveError('저장에 실패했습니다. 다시 시도하세요.')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (dirty) void handleSave()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, draft, selected])

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!draggingRef.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const raw = e.clientX - rect.left
      const max = rect.width - DOC_PANE_MIN_MARGIN
      setListWidth(Math.max(MIN_LIST_WIDTH, Math.min(max, raw)))
    }
    function onMouseUp() {
      draggingRef.current = false
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  return (
    <div className="max-w-5xl">
      <a href={`/projects/${projectId}/issues`} className="text-xs text-indigo-600">
        ← 이슈 목록
      </a>
      <div className="flex items-center gap-2 mt-1 mb-3">
        <span className="font-mono text-sm text-indigo-700">#{issue.number}</span>
        <h1 className="font-semibold text-base flex-1">{issue.title}</h1>
      </div>

      {subtasks.length === 0 ? (
        <p className="text-sm text-zinc-400">하위 태스크가 없습니다.</p>
      ) : (
        <div ref={containerRef} className="flex border border-zinc-200 rounded-xl overflow-hidden h-[70vh]">
          <div
            style={{ width: listWidth }}
            className="shrink-0 border-r border-zinc-200 overflow-y-auto p-2 space-y-1.5 bg-white"
          >
            {subtasks.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => selectSubtask(s.id)}
                className={`w-full text-left border rounded-lg p-2.5 ${
                  s.id === selectedId ? 'border-indigo-500 ring-2 ring-indigo-100 bg-indigo-50/30' : 'border-zinc-200'
                }`}
              >
                <div className="flex items-start gap-2 mb-1.5">
                  <span className={`flex-1 text-[13px] ${s.done ? 'line-through text-zinc-400' : 'text-zinc-800'}`}>
                    {s.title}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                      s.done ? 'bg-indigo-50 text-indigo-700' : 'bg-zinc-100 text-zinc-500'
                    }`}
                  >
                    {s.done ? '완료' : '미완료'}
                  </span>
                </div>
                <span
                  className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded border ${
                    s.notes ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-zinc-200 text-zinc-400'
                  }`}
                >
                  {s.notes && <span className="w-1 h-1 rounded-full bg-indigo-500" />}
                  {s.notes ? '문서 있음' : '문서 없음'}
                </span>
              </button>
            ))}
          </div>

          <div
            onMouseDown={(e) => {
              e.preventDefault()
              draggingRef.current = true
            }}
            className="w-1.5 shrink-0 cursor-col-resize bg-zinc-100 hover:bg-indigo-500 transition-colors"
          />

          <div className="flex-1 min-w-0 flex flex-col bg-zinc-50">
            {selected && (
              <>
                <div className="bg-white border-b border-zinc-200 px-4 py-2.5 shrink-0">
                  <p className="text-[11px] text-zinc-400 mb-1">
                    #{issue.number} {issue.title} › {selected.title}
                  </p>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold flex-1">{selected.title}</h2>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ${
                        selected.done ? 'bg-indigo-50 text-indigo-700' : 'bg-zinc-100 text-zinc-500'
                      }`}
                    >
                      {selected.done ? '완료' : '미완료'}
                    </span>
                  </div>
                </div>

                <div className="flex bg-white border-b border-zinc-200 shrink-0">
                  <button
                    type="button"
                    onClick={() => setMode('edit')}
                    className={`text-xs px-3.5 py-2 border-b-2 ${
                      mode === 'edit'
                        ? 'border-indigo-600 text-indigo-700 font-medium'
                        : 'border-transparent text-zinc-500'
                    }`}
                  >
                    편집
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('preview')}
                    className={`text-xs px-3.5 py-2 border-b-2 ${
                      mode === 'preview'
                        ? 'border-indigo-600 text-indigo-700 font-medium'
                        : 'border-transparent text-zinc-500'
                    }`}
                  >
                    미리보기
                  </button>
                </div>

                <div className="flex-1 min-h-0 p-4">
                  {mode === 'edit' ? (
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="문서를 마크다운으로 작성하세요"
                      className="w-full h-full text-sm border border-zinc-200 rounded-lg p-3.5 font-mono resize-none outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 bg-white"
                    />
                  ) : (
                    <div className="w-full h-full overflow-y-auto border border-zinc-200 rounded-lg p-5 bg-white text-sm">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => <p className="my-1.5 leading-relaxed text-zinc-700">{children}</p>,
                          ul: ({ children }) => (
                            <ul className="my-1.5 ml-4 list-disc space-y-0.5 text-zinc-700">{children}</ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="my-1.5 ml-4 list-decimal space-y-0.5 text-zinc-700">{children}</ol>
                          ),
                          strong: ({ children }) => <strong className="font-semibold text-zinc-900">{children}</strong>,
                          code: ({ children }) => <code className="text-xs bg-zinc-100 rounded px-1 py-0.5">{children}</code>,
                        }}
                      >
                        {draft || '_아직 작성된 내용이 없습니다._'}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>

                <div className="bg-white border-t border-zinc-200 px-4 py-2.5 flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!dirty || saving}
                    className="text-xs px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white disabled:opacity-40"
                  >
                    {saving ? '저장 중...' : '저장'}
                  </button>
                  {saveError ? (
                    <span className="text-xs text-red-600">{saveError}</span>
                  ) : (
                    <span className={`text-xs ${dirty ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {dirty ? '수정됨' : '저장됨 ✓'}
                    </span>
                  )}
                  <span className="text-[11px] text-zinc-400 ml-auto">⌘/Ctrl+S 저장</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 타입 체크**

Run: `cd apps/issue-board && npx tsc --noEmit`
Expected: 에러 없음 (이 컴포넌트는 아직 아무 곳에서도 import 안 됨 — Task 5에서 연결)

- [ ] **Step 3: 커밋**

```bash
git add apps/issue-board/src/components/IssueDocsBoard.tsx
git commit -m "feat(issue-board): add IssueDocsBoard split-view component"
```

---

## Task 5: `issues/page.tsx` — `?issueId=` 분기 연결

**Files:**
- Modify: `apps/issue-board/src/app/projects/[id]/issues/page.tsx`

- [ ] **Step 1: 전체 교체**

`apps/issue-board/src/app/projects/[id]/issues/page.tsx`의 전체 내용을 아래로 교체한다:

```tsx
// src/app/projects/[id]/issues/page.tsx
import ConnectionErrorBanner from '@/components/ConnectionErrorBanner'
import IssueDocsBoard from '@/components/IssueDocsBoard'
import IssueList from '@/components/IssueList'
import { fetchIssue, fetchIssues, fetchPlans, fetchSubtasks } from '@/lib/api'

export default async function IssuesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ issueId?: string }>
}) {
  const { id } = await params
  const projectId = Number(id)
  const { issueId } = await searchParams

  try {
    if (issueId) {
      const issue = await fetchIssue(Number(issueId))
      const subtasks = await fetchSubtasks(issue.id)
      return <IssueDocsBoard projectId={projectId} issue={issue} subtasks={subtasks} />
    }

    const [issues, plans] = await Promise.all([fetchIssues(projectId), fetchPlans(projectId)])
    return <IssueList issues={issues} plans={plans} projectId={projectId} />
  } catch {
    return <ConnectionErrorBanner />
  }
}
```

- [ ] **Step 2: 타입 체크**

Run: `cd apps/issue-board && npx tsc --noEmit`
Expected: 에러 없음 (Task 3에서 나던 `projectId` 누락 에러가 이제 해결됨)

- [ ] **Step 3: 프론트 전체 테스트**

Run: `cd apps/issue-board && npx vitest run`
Expected: 전체 PASS (이 태스크는 서버 컴포넌트 라우팅 변경이라 이 저장소에 있는 `lib/api.test.ts`, `lib/plan-rounds.test.ts`에는 영향 없어야 함)

- [ ] **Step 4: 커밋**

```bash
git add "apps/issue-board/src/app/projects/[id]/issues/page.tsx"
git commit -m "feat(issue-board): route ?issueId= to the new docs split view"
```

---

## Task 6: 수동 브라우저 검증

**Files:** 없음 (검증 전용)

- [ ] **Step 1: 서버 기동 확인**

```bash
curl -sf http://localhost:4000/api/projects -o /dev/null -w "issue-board-mcp: %{http_code}\n" || echo "cd apps/issue-board-mcp && npm run dev"
curl -sf http://localhost:5173 -o /dev/null -w "issue-board: %{http_code}\n" || echo "cd apps/issue-board && npm run dev"
```

- [ ] **Step 2: 대시보드에서 확인**

`http://localhost:5173/projects/<projectId>/issues`를 열어:

- 이슈 카드에 더 이상 📄 문서 아이콘이 없는지 (하위 태스크 펼쳐도 체크리스트만 보임)
- 카드 설명 아래 "문서 보기 →" 링크가 있는지, 클릭하면 `?issueId=`가 붙은 전용 화면으로 이동하는지
- 좌측에 하위 태스크 목록(제목, 완료/미완료 칩, 문서 있음/없음 필)이 보이는지, 상태 변경 UI가 없는지(읽기 전용)
- 하위 태스크를 클릭하면 우측 패널이 그 항목의 문서로 바뀌는지
- 편집 탭에서 마크다운 입력 → 저장 버튼 활성화("수정됨" 표시) → 저장 클릭 → "저장됨 ✓"로 바뀌는지
- 미리보기 탭 클릭 → 마크다운이 렌더링되는지
- `⌘/Ctrl+S`로도 저장되는지
- 저장 안 한 채 다른 하위 태스크 클릭 → confirm 창이 뜨는지, 취소하면 그대로 남아있는지
- 가운데 리사이저를 드래그하면 좌우 패널 너비가 바뀌는지
- "← 이슈 목록" 클릭하면 목록으로 돌아가는지
- 새로고침해도 저장한 문서 내용이 유지되는지

- [ ] **Step 3: 결과 보고**

문제 없으면 완료 보고. 문제가 있으면 어떤 화면에서 무엇이 어긋났는지 기록하고 해당 Task로 돌아가 수정한다.
