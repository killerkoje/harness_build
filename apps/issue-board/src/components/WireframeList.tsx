// src/components/WireframeList.tsx
import type { WireframeSummary } from '@/lib/api'

export default function WireframeList({
  projectId,
  wireframes,
}: {
  projectId: number
  wireframes: WireframeSummary[]
}) {
  if (wireframes.length === 0) {
    return (
      <p className="text-sm text-zinc-400">
        아직 생성된 와이어프레임이 없습니다. `/ib-wireframe`으로 생성하세요.
      </p>
    )
  }

  return (
    <ul className="max-w-2xl space-y-2">
      {wireframes.map((w) => (
        <li key={w.issueId}>
          <a
            href={`/projects/${projectId}/wireframe?issueId=${w.issueId}`}
            className="flex items-center justify-between bg-white border border-zinc-200 rounded-xl p-4 hover:border-indigo-300"
          >
            <span className="min-w-0 truncate">
              <span className="font-mono text-sm text-indigo-700 mr-2">#{w.issueNumber}</span>
              <span className="font-medium text-sm">{w.issueTitle}</span>
            </span>
            <span className="shrink-0 text-xs text-zinc-400 ml-3">화면 {w.screenCount}개</span>
          </a>
        </li>
      ))}
    </ul>
  )
}
