// src/components/WireframeBoard.tsx
'use client'

import { useState } from 'react'
import type { Issue, WireframeScreen } from '@/lib/api'
import { approveIssue } from '@/lib/api'
import ScreenPreview from '@/components/wireframe-preview/ScreenPreview'

export default function WireframeBoard({
  issue,
  screens,
  tokens,
}: {
  issue: Issue
  screens: WireframeScreen[]
  tokens?: Record<string, unknown> | null
}) {
  const [status, setStatus] = useState(issue.status)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleApprove() {
    setPending(true)
    setError(null)
    try {
      const updated = await approveIssue(issue.id)
      setStatus(updated.status)
    } catch {
      setError('승인에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="w-full min-w-0 max-w-3xl mx-auto space-y-4 sm:space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-semibold truncate">
            #{issue.number} {issue.title}
          </h1>
          <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5">화면 프리뷰 · 클릭으로 플로우 체험</p>
        </div>
        <div className="shrink-0 self-start">
          {status === 'dev_approved' ? (
            <span className="inline-flex text-[11px] sm:text-xs px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md bg-emerald-50 text-emerald-700">
              개발 승인됨
            </span>
          ) : (
            <div className="flex items-center gap-2">
              {error && <span className="text-[11px] text-red-600">{error}</span>}
              <button
                onClick={handleApprove}
                disabled={pending}
                className="text-xs sm:text-sm px-3 py-1.5 rounded-lg bg-zinc-900 text-white disabled:opacity-50"
              >
                {pending ? '승인 중...' : '개발 승인'}
              </button>
            </div>
          )}
        </div>
      </header>

      {screens.length === 0 ? (
        <p className="text-sm text-zinc-400">아직 와이어프레임이 없습니다. `/ib-wireframe`으로 생성하세요.</p>
      ) : (
        <ScreenPreview screens={screens} tokens={tokens} />
      )}
    </div>
  )
}
