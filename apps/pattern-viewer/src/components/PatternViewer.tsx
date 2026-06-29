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
    high: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    medium: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    low: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  }
  return (
    <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium tracking-wide ${styles[confidence]}`}>
      {confidence}
    </span>
  )
}

function SourceBadge({ source }: { source: string[] }) {
  const isUserApproved = source.includes('user_approved')
  return (
    <span
      className={`px-2 py-0.5 rounded-md text-[11px] font-medium tracking-wide ${
        isUserApproved
          ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
          : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
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
          ? 'border-indigo-500/30 bg-gradient-to-b from-indigo-950/20 to-zinc-900/60'
          : 'border-zinc-800/60 bg-zinc-900/40 hover:border-zinc-700/60 hover:bg-zinc-900/70'
      }`}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-5 py-4 flex items-start gap-4 cursor-pointer group"
      >
        <div
          className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-xs transition-colors ${
            open ? 'bg-indigo-500/20 text-indigo-400' : 'bg-zinc-800 text-zinc-500 group-hover:text-zinc-400'
          }`}
        >
          {open ? '▾' : '▸'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="font-mono text-sm text-zinc-200 font-semibold tracking-tight">
              {pattern.id}
            </span>
            <ConfidenceBadge confidence={pattern.confidence} />
            <SourceBadge source={pattern.source} />
            {pattern.deprecated && (
              <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                deprecated
              </span>
            )}
          </div>
          <p className="text-sm text-zinc-400 leading-relaxed">{pattern.description}</p>
        </div>
      </button>

      {open && (
        <div className="border-t border-zinc-800/60 px-5 py-5 space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">
                Code Example
              </span>
              <div className="flex-1 h-px bg-zinc-800" />
            </div>
            <pre className="bg-zinc-950 rounded-lg p-4 overflow-x-auto text-sm text-zinc-300 font-mono leading-relaxed border border-zinc-800/80">
              <code>{pattern.example}</code>
            </pre>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">
                Why
              </span>
              <div className="flex-1 h-px bg-zinc-800" />
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed">{pattern.reason}</p>
          </div>

          <div className="flex items-center gap-5 pt-1 text-xs text-zinc-600">
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
      <nav className="sticky top-0 z-50 border-b border-zinc-800/60 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white">
              P
            </div>
            <span className="font-semibold text-sm text-zinc-100 tracking-tight">
              Team Patterns
            </span>
            <span className="text-zinc-700">/</span>
            <span className="text-sm text-zinc-500">
              {isSearching ? '검색 결과' : categories.find((c) => c.category === activeTab)?.label}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="패턴 검색..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-52 bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:bg-zinc-900 transition-colors"
              />
            </div>
            <span className="text-xs text-zinc-600 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded-md">
              {totalCount} patterns
            </span>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative border-b border-zinc-800/60 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/30 via-transparent to-violet-950/20 pointer-events-none" />
        <div className="absolute top-0 left-1/4 w-96 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              팀 공유 패턴 라이브러리
            </div>
            <h1 className="text-4xl font-bold text-zinc-100 tracking-tight leading-tight mb-4">
              팀이 검증한<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
                코드 패턴 모음
              </span>
            </h1>
            <p className="text-zinc-400 leading-relaxed mb-8">
              실제 프로젝트에서 QA를 통과하고 팀이 승인한 패턴만 수록됩니다.<br />
              다음 기획 시 code-analyzer가 우선 참조합니다.
            </p>
            <div className="flex flex-wrap gap-6">
              {categories.map((cat) => (
                <button
                  key={cat.category}
                  onClick={() => { setActiveTab(cat.category); setQuery('') }}
                  className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors group"
                >
                  <span className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-base group-hover:border-indigo-500/40 transition-colors">
                    {CATEGORY_ICONS[cat.category] ?? '◆'}
                  </span>
                  <div className="text-left">
                    <div className="font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors text-sm">{cat.label}</div>
                    <div className="text-xs text-zinc-600">{cat.patterns.length}개</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Body: Sidebar + Content */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-10 flex gap-10">
        {/* Sidebar */}
        <aside className="w-52 shrink-0 hidden md:block">
          <div className="sticky top-24 space-y-1">
            <p className="text-[11px] font-semibold text-zinc-600 uppercase tracking-widest mb-3 px-3">
              Categories
            </p>
            {categories.map((cat) => (
              <button
                key={cat.category}
                onClick={() => { setActiveTab(cat.category); setQuery('') }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeTab === cat.category && !isSearching
                    ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{CATEGORY_ICONS[cat.category] ?? '◆'}</span>
                  <span className="font-medium">{cat.label}</span>
                </div>
                <span className={`text-xs px-1.5 py-0.5 rounded-md ${
                  activeTab === cat.category && !isSearching
                    ? 'bg-indigo-500/20 text-indigo-400'
                    : 'bg-zinc-800 text-zinc-600'
                }`}>
                  {cat.patterns.length}
                </span>
              </button>
            ))}

            <div className="pt-4 mt-4 border-t border-zinc-800">
              <p className="text-[11px] font-semibold text-zinc-600 uppercase tracking-widest mb-3 px-3">
                Stats
              </p>
              <div className="px-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-600">전체 패턴</span>
                  <span className="text-zinc-300 font-medium">{totalCount}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-600">카테고리</span>
                  <span className="text-zinc-300 font-medium">{categories.length}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-600">approved</span>
                  <span className="text-emerald-400 font-medium">
                    {allPatterns.filter(p => p.source.includes('user_approved')).length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {/* Content header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              {isSearching ? (
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-zinc-100">검색 결과</h2>
                  <span className="text-sm text-zinc-500">
                    {filtered.length > 0 ? `${filtered.length}개` : '없음'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xl">{CATEGORY_ICONS[activeTab]}</span>
                  <h2 className="text-lg font-semibold text-zinc-100">
                    {categories.find((c) => c.category === activeTab)?.label}
                  </h2>
                  <span className="text-sm text-zinc-500">{currentPatterns.length}개</span>
                </div>
              )}
            </div>
          </div>

          {/* Pattern list */}
          <div className="space-y-3">
            {currentPatterns.map((pattern) => (
              <PatternCard key={pattern.id} pattern={pattern} />
            ))}
            {currentPatterns.length === 0 && (
              <div className="text-center py-24 text-zinc-700">
                <div className="text-4xl mb-3">◎</div>
                <p className="text-sm">
                  {isSearching ? '검색 결과가 없습니다' : '패턴이 없습니다'}
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-800/60 mt-auto">
        <div className="max-w-7xl mx-auto px-6 h-12 flex items-center justify-between">
          <span className="text-xs text-zinc-700">Team Patterns · harness v0.3.2</span>
          <span className="text-xs text-zinc-700">.harness/patterns/</span>
        </div>
      </footer>
    </div>
  )
}
