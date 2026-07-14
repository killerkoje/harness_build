// src/components/IssueList.tsx
'use client'

import { useState } from 'react'
import { NOTION_STATUS_OPTIONS, setIssueNotionStatus, type Issue, type NotionStatus } from '@/lib/api'

const STATUS_LABEL: Record<Issue['status'], string> = {
  planned: '기획됨',
  wireframed: '와이어프레임 완료',
  dev_approved: '개발 승인됨',
  done: '완료',
}

const STATUS_STYLE: Record<Issue['status'], string> = {
  planned: 'bg-zinc-100 text-zinc-600',
  wireframed: 'bg-blue-50 text-blue-700',
  dev_approved: 'bg-emerald-50 text-emerald-700',
  done: 'bg-indigo-50 text-indigo-700',
}

export default function IssueList({ issues, projectId }: { issues: Issue[]; projectId: number }) {
  const [items, setItems] = useState(issues)

  if (items.length === 0) {
    return <p className="text-sm text-zinc-400">이슈가 없습니다. 기획을 먼저 확정하세요.</p>
  }

  async function handleNotionStatusChange(issueId: number, value: string) {
    const notionStatus = (value || null) as NotionStatus | null
    const updated = await setIssueNotionStatus(issueId, notionStatus)
    setItems((prev) => prev.map((i) => (i.id === issueId ? updated : i)))
  }

  return (
    <ul className="space-y-2 max-w-2xl">
      {items.map((issue) => (
        <li key={issue.id} className="border border-zinc-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-sm text-indigo-700">#{issue.number}</span>
            <span className="font-medium text-sm flex-1">{issue.title}</span>
            <span className={`text-xs px-2 py-0.5 rounded ${STATUS_STYLE[issue.status]}`}>
              {STATUS_LABEL[issue.status]}
            </span>
          </div>
          <p className="text-xs text-zinc-500">{issue.description}</p>
          <div className="flex items-center gap-2 mt-2">
            <a
              href={`/projects/${projectId}/wireframe?issueId=${issue.id}`}
              className="text-xs text-indigo-600"
            >
              와이어프레임 보기 →
            </a>
            <label className="text-xs text-zinc-400 ml-auto">
              Notion 상태
              <select
                className="ml-1 text-xs border border-zinc-200 rounded px-1 py-0.5 text-zinc-700"
                value={issue.notionStatus ?? ''}
                onChange={(e) => handleNotionStatusChange(issue.id, e.target.value)}
              >
                <option value="">자동 ({STATUS_LABEL[issue.status]} 기준)</option>
                {NOTION_STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </li>
      ))}
    </ul>
  )
}
