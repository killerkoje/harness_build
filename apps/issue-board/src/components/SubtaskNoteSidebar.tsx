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
