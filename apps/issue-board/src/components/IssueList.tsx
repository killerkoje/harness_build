// src/components/IssueList.tsx
import type { Issue } from '@/lib/api'

const STATUS_LABEL: Record<Issue['status'], string> = {
  planned: '기획됨',
  wireframed: '와이어프레임 완료',
  dev_approved: '개발 승인됨',
}

const STATUS_STYLE: Record<Issue['status'], string> = {
  planned: 'bg-zinc-100 text-zinc-600',
  wireframed: 'bg-blue-50 text-blue-700',
  dev_approved: 'bg-emerald-50 text-emerald-700',
}

export default function IssueList({ issues, projectId }: { issues: Issue[]; projectId: number }) {
  if (issues.length === 0) {
    return <p className="text-sm text-zinc-400">이슈가 없습니다. 기획을 먼저 확정하세요.</p>
  }

  return (
    <ul className="space-y-2 max-w-2xl">
      {issues.map((issue) => (
        <li key={issue.id} className="border border-zinc-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-sm text-indigo-700">#{issue.number}</span>
            <span className="font-medium text-sm flex-1">{issue.title}</span>
            <span className={`text-xs px-2 py-0.5 rounded ${STATUS_STYLE[issue.status]}`}>
              {STATUS_LABEL[issue.status]}
            </span>
          </div>
          <p className="text-xs text-zinc-500">{issue.description}</p>
          <a
            href={`/projects/${projectId}/wireframe?issueId=${issue.id}`}
            className="text-xs text-indigo-600 mt-2 inline-block"
          >
            와이어프레임 보기 →
          </a>
        </li>
      ))}
    </ul>
  )
}
