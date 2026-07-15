'use client'

// src/components/ProjectQuickLinks.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateProjectDevUrl } from '@/lib/api'

const PATTERN_VIEWER_URL = process.env.NEXT_PUBLIC_PATTERN_VIEWER_URL ?? 'http://localhost:3100'

interface Props {
  projectId: number
  devUrl: string | null
}

export default function ProjectQuickLinks({ projectId, devUrl }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  async function handleDevProjectClick(e: React.MouseEvent) {
    if (devUrl) return // let the anchor's href navigate normally
    e.preventDefault()
    const input = window.prompt('개발 프로젝트 dev 서버 URL을 입력하세요 (예: http://localhost:3000)')
    if (!input) return
    setSaving(true)
    try {
      await updateProjectDevUrl(projectId, input)
      router.refresh()
      window.open(input, '_blank', 'noopener,noreferrer')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5 px-2 sm:px-4 md:px-6 py-1.5">
      <a
        href={PATTERN_VIEWER_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 rounded-md border border-zinc-200 px-2.5 py-1 text-xs text-zinc-600 hover:bg-zinc-50 whitespace-nowrap"
      >
        패턴확인
      </a>
      <a
        href={devUrl ?? '#'}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleDevProjectClick}
        aria-busy={saving}
        title={devUrl ?? 'dev 서버 URL 설정 필요'}
        className="shrink-0 rounded-md border border-zinc-200 px-2.5 py-1 text-xs text-zinc-600 hover:bg-zinc-50 whitespace-nowrap"
      >
        개발 프로젝트
      </a>
    </div>
  )
}
