// src/components/IssueList.tsx
'use client'

import { useMemo, useState } from 'react'
import {
  NOTION_STATUS_OPTIONS,
  setIssueNotionStatus,
  type Issue,
  type NotionStatus,
  type Plan,
} from '@/lib/api'
import { roundIndexOf, roundLabel, roundShortLabel } from '@/lib/plan-rounds'
import IssueSubtasks from './IssueSubtasks'

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

function progressLabel(progress: NonNullable<Issue['subtaskProgress']>): string {
  if (progress.done === progress.total) return '완료'
  const percent = Math.round((progress.done / progress.total) * 100)
  return `${percent}% (${progress.done}/${progress.total})`
}

export default function IssueList({
  issues,
  plans,
  projectId,
}: {
  issues: Issue[]
  plans: Plan[]
  projectId: number
}) {
  const [items, setItems] = useState(issues)
  const [error, setError] = useState<string | null>(null)
  const [roundFilter, setRoundFilter] = useState<number | 'all'>('all')
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())

  const filteredItems = useMemo(
    () => (roundFilter === 'all' ? items : items.filter((i) => i.planId === roundFilter)),
    [items, roundFilter]
  )

  if (items.length === 0) {
    return <p className="text-sm text-zinc-400">이슈가 없습니다. 기획을 먼저 확정하세요.</p>
  }

  async function handleNotionStatusChange(issueId: number, value: string) {
    const notionStatus = (value || null) as NotionStatus | null
    setError(null)
    try {
      const updated = await setIssueNotionStatus(issueId, notionStatus)
      // setIssueNotionStatus의 응답(getIssue 기반)에는 subtaskProgress 키가 아예 없다.
      // 통째로 교체(updated)하면 그 이슈의 진행도 배지가 사라진다 — 병합으로 기존 값을 보존한다.
      setItems((prev) => prev.map((i) => (i.id === issueId ? { ...i, ...updated } : i)))
    } catch {
      setError('Notion 상태 변경에 실패했습니다. 잠시 후 다시 시도하세요.')
    }
  }

  function toggleExpanded(issueId: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(issueId)) next.delete(issueId)
      else next.add(issueId)
      return next
    })
  }

  function updateIssueProgress(issueId: number, progress: Issue['subtaskProgress']) {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== issueId) return i
        // 하위 태스크가 전부 완료되면 백엔드가 이슈 status도 자동으로 done으로
        // 바꾼다(maybeAutoCompleteIssue) — 화면도 같은 방향으로만 맞춰준다.
        const autoDone = progress != null && progress.done === progress.total && i.status !== 'done'
        return { ...i, subtaskProgress: progress, status: autoDone ? 'done' : i.status }
      })
    )
  }

  return (
    <div className="max-w-2xl">
      {plans.length > 1 && (
        <label className="block text-xs text-zinc-500 mb-3">
          기획 차수
          <select
            className="ml-2 text-xs border border-zinc-200 rounded px-2 py-1 text-zinc-700"
            value={roundFilter}
            onChange={(e) => setRoundFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          >
            <option value="all">전체</option>
            {plans.map((plan, index) => (
              <option key={plan.id} value={plan.id}>
                {roundLabel(index)}
              </option>
            ))}
          </select>
        </label>
      )}
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      {filteredItems.length === 0 ? (
        <p className="text-sm text-zinc-400">해당 차수의 이슈가 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {filteredItems.map((issue) => {
            const roundIndex = roundIndexOf(plans, issue.planId)
            const isExpanded = expandedIds.has(issue.id)
            return (
              <li key={issue.id} className="border border-zinc-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <button
                    onClick={() => toggleExpanded(issue.id)}
                    className="text-zinc-400 hover:text-zinc-700 w-4 shrink-0"
                    aria-label={isExpanded ? '하위 태스크 접기' : '하위 태스크 펼치기'}
                  >
                    {isExpanded ? '▼' : '▶'}
                  </button>
                  <span className="font-mono text-sm text-indigo-700">#{issue.number}</span>
                  {roundIndex >= 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500">
                      {roundShortLabel(roundIndex)}
                    </span>
                  )}
                  <span className="font-medium text-sm flex-1">{issue.title}</span>
                  {issue.subtaskProgress && (
                    <span className="text-xs text-zinc-400">{progressLabel(issue.subtaskProgress)}</span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded ${STATUS_STYLE[issue.status]}`}>
                    {STATUS_LABEL[issue.status]}
                  </span>
                </div>
                <p className="text-xs text-zinc-500">{issue.description}</p>
                {isExpanded && (
                  <IssueSubtasks
                    issueId={issue.id}
                    onProgressChange={(progress) => updateIssueProgress(issue.id, progress)}
                  />
                )}
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
            )
          })}
        </ul>
      )}
    </div>
  )
}
