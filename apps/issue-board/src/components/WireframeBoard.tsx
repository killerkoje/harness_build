// src/components/WireframeBoard.tsx
'use client'

import { useState } from 'react'
import type { Issue, WireframeScreen } from '@/lib/api'
import { approveIssue } from '@/lib/api'

const REGION_CLASS: Record<string, string> = {
  nav: 'w-full h-10 bg-zinc-200 rounded flex items-center px-3 text-xs text-zinc-600',
  sidebar: 'w-32 shrink-0 bg-zinc-100 rounded p-2 text-xs text-zinc-600',
  content: 'flex-1 bg-zinc-50 border border-dashed border-zinc-300 rounded p-3 text-xs text-zinc-500',
  footer: 'w-full h-8 bg-zinc-100 rounded flex items-center px-3 text-xs text-zinc-500',
}

function ScreenBox({ screen }: { screen: WireframeScreen }) {
  const nav = screen.layout.regions.find((r) => r.type === 'nav')
  const sidebar = screen.layout.regions.find((r) => r.type === 'sidebar')
  const rest = screen.layout.regions.filter((r) => r.type !== 'nav' && r.type !== 'sidebar')

  return (
    <div className="border border-zinc-200 rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{screen.name}</h3>
        {screen.route && <span className="text-xs font-mono text-indigo-600">{screen.route}</span>}
      </div>
      <div className="space-y-2">
        {nav && <div className={REGION_CLASS.nav}>{nav.label}</div>}
        <div className="flex gap-2">
          {sidebar && <div className={REGION_CLASS.sidebar}>{sidebar.label}</div>}
          <div className="flex-1 space-y-2">
            {rest.map((r, i) => (
              <div key={i} className={REGION_CLASS[r.type] ?? REGION_CLASS.content}>
                {r.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function WireframeBoard({
  issue,
  screens,
}: {
  issue: Issue
  screens: WireframeScreen[]
}) {
  const [status, setStatus] = useState(issue.status)
  const [pending, setPending] = useState(false)

  async function handleApprove() {
    setPending(true)
    try {
      const updated = await approveIssue(issue.id)
      setStatus(updated.status)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">
          #{issue.number} {issue.title}
        </h1>
        {status === 'dev_approved' ? (
          <span className="text-xs px-3 py-1.5 rounded bg-emerald-50 text-emerald-700">개발 승인됨</span>
        ) : (
          <button
            onClick={handleApprove}
            disabled={pending}
            className="text-sm px-3 py-1.5 rounded-lg bg-indigo-600 text-white disabled:opacity-50"
          >
            {pending ? '승인 중...' : '개발 승인'}
          </button>
        )}
      </div>

      {screens.length === 0 ? (
        <p className="text-sm text-zinc-400">아직 와이어프레임이 없습니다. `/ib-wireframe`으로 생성하세요.</p>
      ) : (
        <div className="space-y-4">
          {screens.map((s, i) => (
            <ScreenBox key={i} screen={s} />
          ))}
        </div>
      )}
    </div>
  )
}
