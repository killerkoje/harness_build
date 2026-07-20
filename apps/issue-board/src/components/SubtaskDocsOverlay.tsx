'use client'

// src/components/SubtaskDocsOverlay.tsx
import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { updateSubtask, type Subtask } from '@/lib/api'

const MIN_LIST_WIDTH = 220
const DOC_PANE_MIN_MARGIN = 320

export default function SubtaskDocsOverlay({
  subtasks,
  initialSubtaskId,
  onClose,
  onSaved,
}: {
  subtasks: Subtask[]
  initialSubtaskId: number
  onClose: () => void
  onSaved: (updated: Subtask) => void
}) {
  const initial = subtasks.find((s) => s.id === initialSubtaskId) ?? subtasks[0] ?? null
  const [selectedId, setSelectedId] = useState<number | null>(initial?.id ?? null)
  const [draft, setDraft] = useState(initial?.notes ?? '')
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [listWidth, setListWidth] = useState(280)
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

  function handleClose() {
    if (dirty && !window.confirm('저장되지 않은 문서 변경이 있습니다. 닫을까요?')) return
    onClose()
  }

  async function handleSave() {
    if (!selected) return
    setSaving(true)
    setSaveError(null)
    try {
      const updated = await updateSubtask(selected.id, { notes: draft })
      onSaved(updated)
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
      } else if (e.key === 'Escape') {
        handleClose()
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
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4" onClick={handleClose}>
      <div
        ref={containerRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl h-[80vh] bg-white rounded-xl shadow-xl border border-zinc-200 flex overflow-hidden"
      >
        <div
          style={{ width: listWidth }}
          className="shrink-0 border-r border-zinc-200 overflow-y-auto p-2 space-y-1.5 bg-zinc-50"
        >
          {subtasks.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => selectSubtask(s.id)}
              className={`w-full text-left border rounded-lg p-2.5 bg-white ${
                s.id === selectedId ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-zinc-200'
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

        <div className="flex-1 min-w-0 flex flex-col">
          {selected && (
            <>
              <div className="border-b border-zinc-200 px-4 py-2.5 shrink-0 flex items-center gap-2">
                <h2 className="text-sm font-semibold flex-1 truncate">{selected.title}</h2>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                    selected.done ? 'bg-indigo-50 text-indigo-700' : 'bg-zinc-100 text-zinc-500'
                  }`}
                >
                  {selected.done ? '완료' : '미완료'}
                </span>
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-zinc-400 hover:text-zinc-700 text-sm px-1 shrink-0"
                  aria-label="닫기"
                >
                  ×
                </button>
              </div>

              <div className="flex border-b border-zinc-200 shrink-0">
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
                    className="w-full h-full text-sm border border-zinc-200 rounded-lg p-3.5 font-mono resize-none outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                  />
                ) : (
                  <div className="w-full h-full overflow-y-auto border border-zinc-200 rounded-lg p-5 text-sm">
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

              <div className="border-t border-zinc-200 px-4 py-2.5 flex items-center gap-3 shrink-0">
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
                <span className="text-[11px] text-zinc-400 ml-auto">⌘/Ctrl+S 저장 · Esc 닫기</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
