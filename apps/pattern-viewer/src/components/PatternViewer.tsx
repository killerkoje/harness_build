'use client'

import { useState, useMemo } from 'react'
import type { CategoryPatterns, Pattern } from '@/lib/patterns'

interface Props {
  categories: CategoryPatterns[]
}

const CATEGORY_ICONS: Record<string, string> = {
  hooks: '⚙',
  components: '◈',
  services: '⬡',
  naming: '◎',
}

function ConfidenceBadge({ confidence }: { confidence: Pattern['confidence'] }) {
  const styles = {
    high: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    medium: 'bg-amber-50 text-amber-700 border border-amber-200',
    low: 'bg-zinc-100 text-zinc-500 border border-zinc-200',
  }
  return (
    <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${styles[confidence]}`}>
      {confidence}
    </span>
  )
}

function SourceBadge({ source }: { source: string[] }) {
  const isUserApproved = source.includes('user_approved')
  return (
    <span
      className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${
        isUserApproved
          ? 'bg-violet-50 text-violet-700 border border-violet-200'
          : 'bg-sky-50 text-sky-700 border border-sky-200'
      }`}
    >
      {isUserApproved ? '✓ approved' : 'qa_pass'}
    </span>
  )
}

function PatternCard({ pattern }: { pattern: Pattern }) {
  const [open, setOpen] = useState(false)

  return (
    <div
      className={`rounded-xl border transition-all duration-200 overflow-hidden ${
        open
          ? 'border-indigo-200 bg-indigo-50/40 shadow-sm shadow-indigo-100'
          : 'border-zinc-200 bg-white hover:border-indigo-200 hover:shadow-sm hover:shadow-zinc-100'
      }`}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-5 py-4 flex items-start gap-4 cursor-pointer group"
      >
        <div
          className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-xs transition-colors ${
            open
              ? 'bg-indigo-100 text-indigo-600'
              : 'bg-zinc-100 text-zinc-400 group-hover:bg-indigo-50 group-hover:text-indigo-500'
          }`}
        >
          {open ? '▾' : '▸'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="font-mono text-sm text-zinc-800 font-semibold tracking-tight">
              {pattern.id}
            </span>
            <ConfidenceBadge confidence={pattern.confidence} />
            <SourceBadge source={pattern.source} />
            {pattern.deprecated && (
              <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-red-50 text-red-600 border border-red-200">
                deprecated
              </span>
            )}
          </div>
          <p className="text-sm text-zinc-500 leading-relaxed">{pattern.description}</p>
        </div>
      </button>

      {open && (
        <div className="border-t border-indigo-100 px-5 py-5 space-y-5 bg-white/60">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest">
                Code Example
              </span>
              <div className="flex-1 h-px bg-zinc-100" />
            </div>
            <pre className="bg-zinc-900 rounded-xl p-4 overflow-x-auto text-sm text-zinc-200 font-mono leading-relaxed shadow-inner">
              <code>{pattern.example}</code>
            </pre>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest">
                Why
              </span>
              <div className="flex-1 h-px bg-zinc-100" />
            </div>
            <p className="text-sm text-zinc-500 leading-relaxed">{pattern.reason}</p>
          </div>

          <div className="flex items-center gap-5 pt-1 text-xs text-zinc-400">
            <span>관찰 {pattern.observed}회</span>
            <span>·</span>
            <span>최근 {pattern.last_seen}</span>
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
    () => categories.flatMap((c) => c.patterns),
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
    <div className="min-h-screen flex flex-col">

      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-zinc-200 bg-white/90 backdrop-blur-xl shadow-sm shadow-zinc-100">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
              P
            </div>
            <span className="font-semibold text-sm text-zinc-800 tracking-tight">
              Team Patterns
            </span>
            <span className="text-zinc-300">/</span>
            <span className="text-sm text-zinc-400">
              {isSearching
                ? '검색 결과'
                : categories.find((c) => c.category === activeTab)?.label}
            </span>
          </div>

          <span className="text-xs text-zinc-500 bg-zinc-100 border border-zinc-200 px-2 py-1 rounded-md font-medium">
            {totalCount} patterns
          </span>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative border-b border-zinc-100 overflow-hidden bg-gradient-to-br from-indigo-50/80 via-white to-violet-50/50">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-300/40 to-transparent" />
        <div className="max-w-7xl mx-auto px-6 pt-16">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-indigo-200 text-indigo-600 text-xs font-medium mb-6 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              팀 공유 패턴 라이브러리
            </div>
            <p className="text-zinc-500 leading-relaxed mb-8">
              실제 프로젝트에서 QA를 통과하고 팀이 승인한 패턴만 수록됩니다.<br />
              다음 기획 시 code-analyzer가 우선 참조합니다.
            </p>

            {/* Search bar — hero 중앙 */}
            <div className="relative max-w-xl mb-10">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="패턴 ID, 설명, 이유 검색..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-xl pl-11 pr-4 py-3 text-sm text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 shadow-sm transition-all"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors text-lg leading-none"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-10 flex gap-10">

        {/* Sidebar */}
        <aside className="w-52 shrink-0 hidden md:block">
          <div className="sticky top-24 space-y-1">
            <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-3 px-3">
              Categories
            </p>
            {categories.map((cat) => (
              <button
                key={cat.category}
                onClick={() => { setActiveTab(cat.category); setQuery('') }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeTab === cat.category && !isSearching
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{CATEGORY_ICONS[cat.category] ?? '◆'}</span>
                  <span className="font-medium">{cat.label}</span>
                </div>
                <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${
                  activeTab === cat.category && !isSearching
                    ? 'bg-indigo-100 text-indigo-600'
                    : 'bg-zinc-100 text-zinc-500'
                }`}>
                  {cat.patterns.length}
                </span>
              </button>
            ))}

            <div className="pt-4 mt-4 border-t border-zinc-100">
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-3 px-3">
                Stats
              </p>
              <div className="px-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">전체 패턴</span>
                  <span className="text-zinc-700 font-semibold">{totalCount}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">카테고리</span>
                  <span className="text-zinc-700 font-semibold">{categories.length}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">approved</span>
                  <span className="text-emerald-600 font-semibold">
                    {allPatterns.filter(p => p.source.includes('user_approved')).length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6">
            {isSearching ? (
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-zinc-800">검색 결과</h2>
                <span className="text-sm text-zinc-400">
                  {filtered.length > 0 ? `${filtered.length}개` : '없음'}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xl">{CATEGORY_ICONS[activeTab]}</span>
                <h2 className="text-lg font-semibold text-zinc-800">
                  {categories.find((c) => c.category === activeTab)?.label}
                </h2>
                <span className="text-sm text-zinc-400">{currentPatterns.length}개</span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {currentPatterns.map((pattern) => (
              <PatternCard key={pattern.id} pattern={pattern} />
            ))}
            {currentPatterns.length === 0 && (
              <div className="text-center py-24 text-zinc-300">
                <div className="text-4xl mb-3">◎</div>
                <p className="text-sm text-zinc-400">
                  {isSearching ? '검색 결과가 없습니다' : '패턴이 없습니다'}
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-100 bg-zinc-50 mt-auto">
        <div className="max-w-7xl mx-auto px-6 h-12 flex items-center justify-between">
          <span className="text-xs text-zinc-400">Team Patterns · harness v0.3.2</span>
          <span className="text-xs text-zinc-400">.harness/patterns/</span>
        </div>
      </footer>
    </div>
  )
}
