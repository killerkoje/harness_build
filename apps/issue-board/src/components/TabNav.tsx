'use client'

// src/components/TabNav.tsx
import { usePathname } from 'next/navigation'

const TABS = [
  { href: 'plan', label: '기획' },
  { href: 'issues', label: '이슈' },
  { href: 'wireframe', label: '와이어프레임' },
] as const

export default function TabNav({ projectId }: { projectId: number }) {
  const pathname = usePathname()

  return (
    <nav className="flex gap-1 border-b border-zinc-200 px-6">
      {TABS.map((tab) => {
        const isActive = pathname.endsWith(`/${tab.href}`)
        return (
          <a
            key={tab.href}
            href={`/projects/${projectId}/${tab.href}`}
            className={`px-4 py-3 text-sm border-b-2 -mb-px ${
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
