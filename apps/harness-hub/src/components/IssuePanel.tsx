'use client'

import { useState } from 'react'
import type { HarnessIssue, IssueTask, TaskStatus } from '@/lib/issues'

interface Props {
  issues: HarnessIssue[]
}

const STATUS_LABEL: Record<HarnessIssue['status'], string> = {
  draft: '초안',
  in_progress: '진행 중',
  qa_pass: 'QA 통과',
  qa_fail: 'QA 실패',
  done: '완료',
}

const STATUS_STYLE: Record<HarnessIssue['status'], string> = {
  draft: 'bg-zinc-100 text-zinc-600',
  in_progress: 'bg-blue-50 text-blue-700',
  qa_pass: 'bg-emerald-50 text-emerald-700',
  qa_fail: 'bg-red-50 text-red-700',
  done: 'bg-indigo-50 text-indigo-700',
}

const TASK_STYLE: Record<TaskStatus, string> = {
  pending: 'bg-zinc-100 text-zinc-500',
  done: 'bg-emerald-50 text-emerald-700',
  skipped: 'bg-zinc-50 text-zinc-400',
  fail: 'bg-red-50 text-red-700',
}

const TASK_ICON: Record<TaskStatus, string> = {
  pending: '○',
  done: '✓',
  skipped: '—',
  fail: '✕',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function TaskRow({ task }: { task: IssueTask }) {
  return (
    <div className="flex items-center gap-3 py-1.5 text-sm">
      <span className={`w-6 text-center text-xs font-mono ${TASK_STYLE[task.status]}`}>
        {TASK_ICON[task.status]}
      </span>
      <span className="w-10 text-xs text-zinc-400 font-mono">P{task.phase}</span>
      <span className="flex-1 text-zinc-700">{task.label}</span>
      {task.artifact && (
        <span className="text-xs font-mono text-zinc-400 truncate max-w-[140px]">{task.artifact}</span>
      )}
    </div>
  )
}

export default function IssuePanel({ issues }: Props) {
  const [openId, setOpenId] = useState(issues[0]?.id ?? '')

  if (issues.length === 0) {
    return (
      <div className="text-center py-20 text-zinc-400">
        <p className="text-sm">이슈가 없습니다.</p>
        <p className="text-xs mt-2">
          dev 파이프라인 실행 시 <code className="bg-zinc-100 px-1 rounded">_workspace/</code> 폴더가
          이슈 1건으로 생성됩니다.
        </p>
      </div>
    )
  }

  const selected = issues.find((i) => i.id === openId)

  return (
    <div className="flex gap-6">
      <aside className="w-72 shrink-0 space-y-2">
        {issues.map((issue) => (
          <button
            key={issue.id}
            onClick={() => setOpenId(issue.id)}
            className={`w-full text-left px-3 py-3 rounded-xl border transition-colors ${
              openId === issue.id
                ? 'border-indigo-200 bg-indigo-50'
                : 'border-zinc-200 bg-white hover:border-zinc-300'
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className="font-medium text-sm text-zinc-900 truncate">{issue.title}</span>
              <span
                className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded font-medium ${STATUS_STYLE[issue.status]}`}
              >
                {STATUS_LABEL[issue.status]}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              {issue.externalId && <span className="font-mono">{issue.externalId}</span>}
              <span className="truncate font-mono">{issue.id}</span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">{formatDate(issue.updatedAt)}</p>
          </button>
        ))}
      </aside>

      {selected && (
        <div className="flex-1 min-w-0">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-semibold text-zinc-900">{selected.title}</h2>
              {selected.externalId && (
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">
                  {selected.externalId}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 font-mono">{selected.workspaceDir}</p>
            {selected.skipTests && (
              <p className="text-xs text-amber-600 mt-1">SKIP_TESTS: true — Phase 1.5 생략</p>
            )}
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">
              Phase 태스크
            </p>
            {selected.tasks.map((task) => (
              <TaskRow key={task.phase} task={task} />
            ))}
          </div>

          <p className="text-xs text-zinc-400 mt-4">
            이슈 1건 = 사용자 지시 1회 · 태스크 = dev 파이프라인 Phase 단위
          </p>
        </div>
      )}
    </div>
  )
}
