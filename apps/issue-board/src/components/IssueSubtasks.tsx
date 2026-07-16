'use client'

// src/components/IssueSubtasks.tsx
import { useEffect, useState } from 'react'
import { createSubtask, deleteSubtask, fetchSubtasks, updateSubtask, type Subtask } from '@/lib/api'

export default function IssueSubtasks({ issueId }: { issueId: number }) {
  const [subtasks, setSubtasks] = useState<Subtask[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')

  useEffect(() => {
    fetchSubtasks(issueId)
      .then(setSubtasks)
      .catch(() => setLoadError(true))
  }, [issueId])

  async function handleToggle(subtask: Subtask) {
    setActionError(null)
    try {
      const updated = await updateSubtask(subtask.id, { done: !subtask.done })
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
    if (!title) return
    setActionError(null)
    try {
      const created = await createSubtask(issueId, title)
      setSubtasks((prev) => [...(prev ?? []), created])
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
