'use client'

import { useState, useMemo } from 'react'
import type { CategoryPatterns, Pattern } from '@/lib/patterns'

interface Props {
  categories: CategoryPatterns[]
}

function PatternCard({ pattern }: { pattern: Pattern }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-4 py-3 flex items-start gap-3 cursor-pointer"
      >
        <span className="text-zinc-400 text-xs mt-1">{open ? '▾' : '▸'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-mono text-sm font-semibold text-zinc-800">{pattern.id}</span>
            {pattern.origin && (
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">
                {pattern.origin}
              </span>
            )}
          </div>
          <p className="text-sm text-zinc-500">{pattern.description}</p>
        </div>
      </button>
      {open && (
        <div className="border-t border-zinc-100 px-4 py-4 space-y-3 bg-zinc-50">
          <pre className="bg-zinc-900 rounded-lg p-3 text-xs text-zinc-200 overflow-x-auto">
            <code>{pattern.example}</code>
          </pre>
          <p className="text-sm text-zinc-500">{pattern.reason}</p>
        </div>
      )}
    </div>
  )
}

export default function PatternPanel({ categories }: Props) {
  const [activeTab, setActiveTab] = useState(categories[0]?.category ?? '')
  const [query, setQuery] = useState('')

  const allPatterns = useMemo(() => categories.flatMap((c) => c.patterns), [categories])
  const isSearching = query.trim().length > 0

  const filtered = useMemo(() => {
    if (!isSearching) return []
    const q = query.toLowerCase()
    return allPatterns.filter(
      (p) =>
        p.id.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.reason.toLowerCase().includes(q)
    )
  }, [query, allPatterns, isSearching])

  const current = isSearching
    ? filtered
    : categories.find((c) => c.category === activeTab)?.patterns ?? []

  if (categories.length === 0) {
    return (
      <div className="text-center py-20 text-zinc-400">
        <p className="text-sm">패턴이 없습니다.</p>
        <p className="text-xs mt-2">
          <code className="bg-zinc-100 px-1 rounded">.harness/patterns/team</code> ·{' '}
          <code className="bg-zinc-100 px-1 rounded">local</code>
        </p>
      </div>
    )
  }

  return (
    <div className="flex gap-6">
      <aside className="w-48 shrink-0 hidden md:block space-y-1">
        {categories.map((cat) => (
          <button
            key={cat.category}
            onClick={() => {
              setActiveTab(cat.category)
              setQuery('')
            }}
            className={`w-full flex justify-between px-3 py-2 rounded-lg text-sm ${
              activeTab === cat.category && !isSearching
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                : 'text-zinc-600 hover:bg-white'
            }`}
          >
            <span>{cat.label}</span>
            <span className="text-xs text-zinc-400">{cat.patterns.length}</span>
          </button>
        ))}
      </aside>
      <div className="flex-1 min-w-0">
        <input
          type="search"
          placeholder="패턴 검색..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full mb-4 px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:border-indigo-400"
        />
        <div className="space-y-2">
          {current.map((p) => (
            <PatternCard key={p.id} pattern={p} />
          ))}
        </div>
      </div>
    </div>
  )
}
