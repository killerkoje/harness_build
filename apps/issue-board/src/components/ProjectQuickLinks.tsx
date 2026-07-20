'use client'

// src/components/ProjectQuickLinks.tsx
const PATTERN_VIEWER_URL = process.env.NEXT_PUBLIC_PATTERN_VIEWER_URL ?? 'http://localhost:3100'

interface Props {
  projectId: number
  devUrl: string | null
}

// most projects' dev servers all default to the same localhost port, so tag the
// URL with projectId to tell tabs apart, mirroring the pattern-viewer link below
function withProjectId(url: string, projectId: number): string {
  try {
    const parsed = new URL(url)
    parsed.searchParams.set('projectId', String(projectId))
    return parsed.toString()
  } catch {
    return url
  }
}

export default function ProjectQuickLinks({ projectId, devUrl }: Props) {
  const devHref = devUrl ? withProjectId(devUrl, projectId) : null

  return (
    <div className="flex shrink-0 items-center gap-1.5 px-2 sm:px-4 md:px-6 py-1.5">
      <a
        href={`${PATTERN_VIEWER_URL}/patterns?projectId=${projectId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 rounded-md border border-zinc-200 px-2.5 py-1 text-xs text-zinc-600 hover:bg-zinc-50 whitespace-nowrap"
      >
        패턴확인
      </a>
      {devHref ? (
        <a
          href={devHref}
          target="_blank"
          rel="noopener noreferrer"
          title={devHref}
          className="shrink-0 rounded-md border border-zinc-200 px-2.5 py-1 text-xs text-zinc-600 hover:bg-zinc-50 whitespace-nowrap"
        >
          프로젝트
        </a>
      ) : (
        <span
          aria-disabled="true"
          title="dev 서버 URL 없음"
          className="shrink-0 cursor-not-allowed rounded-md border border-zinc-100 px-2.5 py-1 text-xs text-zinc-300 whitespace-nowrap"
        >
          프로젝트 미구현
        </span>
      )}
    </div>
  )
}
