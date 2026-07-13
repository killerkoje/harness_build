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

function RegionBox({
  type,
  label,
  component,
}: {
  type: string
  label: string
  component?: string
}) {
  return (
    <div className={REGION_CLASS[type] ?? REGION_CLASS.content}>
      <div className="flex items-center justify-between gap-2">
        <span>{label}</span>
        {component && (
          <span className="shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
            {component}
          </span>
        )}
      </div>
    </div>
  )
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
        {nav && <RegionBox type="nav" label={nav.label} component={nav.component} />}
        <div className="flex gap-2">
          {sidebar && (
            <RegionBox type="sidebar" label={sidebar.label} component={sidebar.component} />
          )}
          <div className="flex-1 space-y-2">
            {rest.map((r, i) => (
              <RegionBox key={i} type={r.type} label={r.label} component={r.component} />
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
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">
          #{issue.number} {issue.title}
        </h1>
        {status === 'dev_approved' ? (
          <span className="text-xs px-3 py-1.5 rounded bg-emerald-50 text-emerald-700">개발 승인됨</span>
        ) : (
          <div className="flex items-center gap-2">
            {error && <span className="text-xs text-red-600">{error}</span>}
            <button
              onClick={handleApprove}
              disabled={pending}
              className="text-sm px-3 py-1.5 rounded-lg bg-indigo-600 text-white disabled:opacity-50"
            >
              {pending ? '승인 중...' : '개발 승인'}
            </button>
          </div>
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
