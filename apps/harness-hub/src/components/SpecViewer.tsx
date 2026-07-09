'use client'

import { useState } from 'react'
import type { SpecDoc } from '@/lib/specs'
import MarkdownDoc from './MarkdownDoc'

interface Props {
  specs: SpecDoc[]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function SpecViewer({ specs }: Props) {
  const [selectedId, setSelectedId] = useState(specs[0]?.id ?? '')
  const selected = specs.find((s) => s.id === selectedId)

  if (specs.length === 0) {
    return (
      <div className="text-center py-20 text-zinc-400">
        <p className="text-sm">기획 문서가 없습니다.</p>
        <p className="text-xs mt-2">
          <code className="bg-zinc-100 px-1 rounded">.harness/docs/prd.md</code> 또는{' '}
          <code className="bg-zinc-100 px-1 rounded">_workspace/*/01_spec.md</code>
        </p>
      </div>
    )
  }

  return (
    <div className="flex gap-6">
      <aside className="w-64 shrink-0 space-y-1">
        {specs.map((spec) => (
          <button
            key={spec.id}
            onClick={() => setSelectedId(spec.id)}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
              selectedId === spec.id
                ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                : 'text-zinc-600 hover:bg-white border border-transparent'
            }`}
          >
            <div className="font-medium truncate">{spec.title}</div>
            <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400">
              <span>{spec.source === 'prd' ? 'PRD' : spec.runId}</span>
              <span>·</span>
              <span>{formatDate(spec.updatedAt)}</span>
            </div>
          </button>
        ))}
      </aside>
      <div className="flex-1 min-w-0">
        {selected && (
          <>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-zinc-900">{selected.title}</h2>
              <p className="text-xs text-zinc-400 mt-1">
                {selected.source === 'prd' ? '프로젝트 기획' : `run: ${selected.runId}`}
              </p>
            </div>
            <MarkdownDoc content={selected.content} />
          </>
        )}
      </div>
    </div>
  )
}
