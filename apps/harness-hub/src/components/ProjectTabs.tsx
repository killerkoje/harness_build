'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: 'patterns', label: '패턴' },
  { href: 'specs', label: '기획' },
  { href: 'screens', label: '화면' },
] as const

interface Props {
  projectId: string
  projectName: string
  children: React.ReactNode
}

export default function ProjectTabs({ projectId, projectName, children }: Props) {
  const pathname = usePathname()
  const active = pathname.split('/').pop() ?? 'patterns'

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-200 bg-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="h-14 flex items-center gap-3">
            <Link href="/" className="text-zinc-400 hover:text-zinc-600 text-sm">
              ← 프로젝트
            </Link>
            <span className="text-zinc-300">/</span>
            <span className="font-semibold text-sm text-zinc-800">{projectName}</span>
          </div>
          <nav className="flex gap-1 -mb-px">
            {TABS.map((tab) => (
              <Link
                key={tab.href}
                href={`/projects/${projectId}/${tab.href}`}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  active === tab.href
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800'
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">{children}</main>
    </div>
  )
}
