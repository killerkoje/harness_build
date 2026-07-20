// src/components/IssueList.tsx
'use client'

import { useMemo, useState } from 'react'
import { type Issue, type Plan } from '@/lib/api'
import { roundIndexOf, roundLabel, roundShortLabel, isIssueComplete } from '@/lib/plan-rounds'
import IssueSubtasks from './IssueSubtasks'

function progressLabel(progress: NonNullable<Issue['subtaskProgress']>): string {
  const percent = Math.round((progress.done / progress.total) * 100)
  return `${percent}% (${progress.done}/${progress.total})`
}

function allSubtasksDone(issue: Issue): boolean {
  return isIssueComplete(issue) && issue.subtaskProgress != null
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
  const [roundFilter, setRoundFilter] = useState<number | 'all'>('all')
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())

  const filteredItems = useMemo(
    () => (roundFilter === 'all' ? items : items.filter((i) => i.planId === roundFilter)),
    [items, roundFilter]
  )

  if (items.length === 0) {
    return <p className="text-sm text-zinc-400">이슈가 없습니다. 기획을 먼저 확정하세요.</p>
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
      {filteredItems.length === 0 ? (
        <p className="text-sm text-zinc-400">해당 차수의 이슈가 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {filteredItems.map((issue) => {
            const roundIndex = roundIndexOf(plans, issue.planId)
            const isExpanded = expandedIds.has(issue.id)
            const done = allSubtasksDone(issue)
            return (
              <li key={issue.id} className="space-y-2">
                <div className="bg-white border border-zinc-200 rounded-xl p-4">
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
                    {issue.subtaskProgress && !done && (
                      <span className="text-xs text-zinc-400">{progressLabel(issue.subtaskProgress)}</span>
                    )}
                    {done && (
                      <span className="text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">완료</span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500">{issue.description}</p>
                  <div className="mt-2">
                    <a
                      href={`/projects/${projectId}/wireframe?issueId=${issue.id}`}
                      className="text-xs text-indigo-600"
                    >
                      와이어프레임 보기 →
                    </a>
                  </div>
                </div>

                {isExpanded && (
                  <IssueSubtasks
                    issueId={issue.id}
                    onProgressChange={(progress) => updateIssueProgress(issue.id, progress)}
                  />
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
