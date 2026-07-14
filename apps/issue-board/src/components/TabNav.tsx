'use client'

// src/components/TabNav.tsx
import { usePathname } from 'next/navigation'

const TABS = [
  { href: 'plan', label: '기획' },
  { href: 'issues', label: '이슈' },
  { href: 'design-system', label: '디자인시스템' },
  { href: 'wireframe', label: '와이어프레임' },
] as const

export default function TabNav({ projectId }: { projectId: number }) {
  const pathname = usePathname()

  return (
    <nav className="flex gap-0.5 sm:gap-1 border-b border-zinc-200 px-2 sm:px-4 md:px-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {TABS.map((tab) => {
        const isActive = pathname.endsWith(`/${tab.href}`)
        return (
          <a
            key={tab.href}
            href={`/projects/${projectId}/${tab.href}`}
            className={`shrink-0 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm border-b-2 -mb-px whitespace-nowrap ${
              isActive
                ? 'border-indigo-600 text-indigo-700 font-medium'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            {tab.label}
          </a>
        )
      })}
    </nav>
  )
}
