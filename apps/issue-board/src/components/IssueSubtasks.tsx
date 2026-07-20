'use client'

// src/components/IssueSubtasks.tsx
import { useEffect, useRef, useState } from 'react'
import { createSubtask, deleteSubtask, fetchSubtasks, updateSubtask, type Subtask } from '@/lib/api'
import SubtaskNoteSidebar from './SubtaskNoteSidebar'

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
  const [noteSubtaskId, setNoteSubtaskId] = useState<number | null>(null)
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

  const noteTarget = noteSubtaskId === null ? null : (subtasks.find((s) => s.id === noteSubtaskId) ?? null)

  return (
    <div>
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
          <button
            type="button"
            onClick={() => setNoteSubtaskId(subtask.id)}
            className={`text-sm px-1 shrink-0 ${
              subtask.notes
                ? 'text-indigo-500 hover:text-indigo-700 opacity-100'
                : 'text-zinc-300 hover:text-zinc-500 opacity-30 hover:opacity-60'
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
    {noteTarget && (
      <SubtaskNoteSidebar
        key={noteTarget.id}
        subtask={noteTarget}
        onClose={() => setNoteSubtaskId(null)}
        onSaved={(updated) => {
          setSubtasks((prev) => prev?.map((s) => (s.id === updated.id ? updated : s)) ?? null)
        }}
      />
    )}
    </div>
  )
}
