'use client'

import { useState, useMemo } from 'react'
import type { CategoryPatterns, Pattern } from '@/lib/patterns'

interface Props {
  categories: CategoryPatterns[]
}

function ConfidenceBadge({ confidence }: { confidence: Pattern['confidence'] }) {
  const styles = {
    high: 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30',
    medium: 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30',
    low: 'bg-zinc-500/15 text-zinc-400 ring-1 ring-zinc-500/30',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[confidence]}`}>
      {confidence}
    </span>
  )
}

function SourceBadge({ source }: { source: string[] }) {
  const isUserApproved = source.includes('user_approved')
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
        isUserApproved
          ? 'bg-violet-500/15 text-violet-400 ring-1 ring-violet-500/30'
          : 'bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30'
      }`}
    >
      {isUserApproved ? 'user_approved' : 'qa_pass'}
    </span>
  )
}

function PatternCard({ pattern }: { pattern: Pattern }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden hover:border-zinc-700 transition-colors">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-5 py-4 flex items-start gap-3 cursor-pointer"
      >
        <span className="mt-0.5 text-zinc-600 text-sm font-mono select-none w-4 shrink-0">
          {open ? '▾' : '▸'}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-mono text-sm text-zinc-300 font-medium">{pattern.id}</span>
            <ConfidenceBadge confidence={pattern.confidence} />
            <SourceBadge source={pattern.source} />
            {pattern.deprecated && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/15 text-red-400 ring-1 ring-red-500/30">
                deprecated
              </span>
            )}
          </div>
          <p className="text-sm text-zinc-400 leading-relaxed">{pattern.description}</p>
        </div>
      </button>

      {open && (
        <div className="border-t border-zinc-800 px-5 py-4 space-y-4">
          <div>
            <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
              예시 코드
            </div>
            <pre className="bg-zinc-950 rounded-lg p-4 overflow-x-auto text-sm text-zinc-300 font-mono leading-relaxed border border-zinc-800">
              <code>{pattern.example}</code>
            </pre>
          </div>

          <div>
            <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">
              채택 이유
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed">{pattern.reason}</p>
          </div>

          <div className="flex gap-4 text-xs text-zinc-600">
            <span>관찰 횟수: {pattern.observed}회</span>
            <span>최근 사용: {pattern.last_seen}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PatternViewer({ categories }: Props) {
  const [activeTab, setActiveTab] = useState(categories[0]?.category ?? '')
  const [query, setQuery] = useState('')

  const allPatterns = useMemo(
    () => categories.flatMap((c) => c.patterns.map((p) => ({ ...p, _category: c.category }))),
    [categories]
  )

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

  const currentPatterns = isSearching
    ? filtered
    : categories.find((c) => c.category === activeTab)?.patterns ?? []

  const totalCount = allPatterns.length

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-baseline gap-3 mb-1">
          <h1 className="text-xl font-semibold text-zinc-100">Team Patterns</h1>
          <span className="text-sm text-zinc-500">{totalCount}개 패턴</span>
        </div>
        <p className="text-sm text-zinc-500">팀이 검증하고 채택한 코드 패턴 모음</p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="패턴 검색... (id, 설명, 이유)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
        />
      </div>

      {/* Tabs */}
      {!isSearching && (
        <div className="flex gap-1 mb-6 border-b border-zinc-800 pb-0">
          {categories.map((cat) => (
            <button
              key={cat.category}
              onClick={() => setActiveTab(cat.category)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors -mb-px border-b-2 ${
                activeTab === cat.category
                  ? 'text-zinc-100 border-zinc-400'
                  : 'text-zinc-500 border-transparent hover:text-zinc-300'
              }`}
            >
              {cat.label}
              <span className="ml-2 text-xs text-zinc-600">{cat.patterns.length}</span>
            </button>
          ))}
        </div>
      )}

      {/* Search results header */}
      {isSearching && (
        <div className="mb-4 text-sm text-zinc-500">
          {filtered.length > 0 ? (
            <span>
              <span className="text-zinc-300">{filtered.length}개</span> 검색됨
            </span>
          ) : (
            <span>검색 결과 없음</span>
          )}
        </div>
      )}

      {/* Pattern list */}
      <div className="space-y-3">
        {currentPatterns.map((pattern) => (
          <PatternCard key={pattern.id} pattern={pattern} />
        ))}
        {currentPatterns.length === 0 && !isSearching && (
          <div className="text-center py-12 text-zinc-600 text-sm">패턴이 없습니다</div>
        )}
      </div>
    </div>
  )
}
