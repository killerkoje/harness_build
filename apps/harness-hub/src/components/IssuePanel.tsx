'use client'

import { useState } from 'react'
import type { FeatureIssue, IssueRun, IssueTask, RunStatus, TaskStatus } from '@/lib/issues'

interface Props {
  issues: FeatureIssue[]
}

const FEATURE_STATUS: Record<FeatureIssue['status'], string> = {
  draft: '초안',
  active: '진행',
  done: '완료',
}

const RUN_STATUS: Record<RunStatus, string> = {
  draft: '초안',
  in_progress: '진행 중',
  qa_pass: 'QA 통과',
  qa_fail: 'QA 실패',
}

const RUN_STYLE: Record<RunStatus, string> = {
  draft: 'bg-zinc-100 text-zinc-600',
  in_progress: 'bg-blue-50 text-blue-700',
  qa_pass: 'bg-emerald-50 text-emerald-700',
  qa_fail: 'bg-red-50 text-red-700',
}

const TASK_ICON: Record<TaskStatus, string> = {
  pending: '○',
  done: '✓',
  skipped: '—',
  fail: '✕',
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function TaskRow({ task }: { task: IssueTask }) {
  return (
    <div className="flex items-center gap-3 py-1 text-sm">
      <span className="w-5 text-center text-xs text-zinc-400">{TASK_ICON[task.status]}</span>
      <span className="w-8 text-xs text-zinc-400 font-mono">P{task.phase}</span>
      <span className="flex-1 text-zinc-600">{task.label}</span>
    </div>
  )
}

function RunBlock({ run, selected, onSelect }: { run: IssueRun; selected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
        selected ? 'border-indigo-200 bg-indigo-50' : 'border-zinc-100 hover:bg-zinc-50'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-zinc-500 truncate">{run.runId}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${RUN_STYLE[run.status]}`}>
          {RUN_STATUS[run.status]}
        </span>
      </div>
      <div className="flex gap-2 mt-1 text-xs text-zinc-400">
        <span>{run.kind === 'amendment' ? '수정' : '최초'}</span>
        {run.parentRunId && <span>← {run.parentRunId}</span>}
      </div>
    </button>
  )
}

export default function IssuePanel({ issues }: Props) {
  const [openIssueId, setOpenIssueId] = useState(issues[0]?.id ?? 0)
  const [openRunId, setOpenRunId] = useState(issues[0]?.runs[0]?.runId ?? '')

  if (issues.length === 0) {
    return (
      <div className="text-center py-20 text-zinc-400">
        <p className="text-sm">기능 이슈가 없습니다.</p>
        <p className="text-xs mt-2">
          dev 파이프라인 후{' '}
          <code className="bg-zinc-100 px-1 rounded">bash .harness/scripts/harness-report.sh</code>
        </p>
      </div>
    )
  }

  const selectedIssue = issues.find((i) => i.id === openIssueId)
  const selectedRun = selectedIssue?.runs.find((r) => r.runId === openRunId) ?? selectedIssue?.runs[0]

  return (
    <div className="flex gap-6">
      <aside className="w-56 shrink-0 space-y-2">
        {issues.map((issue) => (
          <button
            key={issue.id}
            onClick={() => {
              setOpenIssueId(issue.id)
              setOpenRunId(issue.runs[0]?.runId ?? '')
            }}
            className={`w-full text-left px-3 py-3 rounded-xl border transition-colors ${
              openIssueId === issue.id
                ? 'border-indigo-200 bg-indigo-50'
                : 'border-zinc-200 bg-white hover:border-zinc-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm font-semibold text-indigo-700">#{issue.id}</span>
              <span className="font-medium text-sm text-zinc-900 truncate flex-1">{issue.title}</span>
            </div>
            <p className="text-xs text-zinc-400">
              run {issue.runs.length} · 파일 {issue.files.length}
            </p>
          </button>
        ))}
      </aside>

      {selectedIssue && (
        <div className="flex-1 min-w-0 space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-lg font-semibold text-indigo-700">#{selectedIssue.id}</span>
              <h2 className="text-lg font-semibold text-zinc-900">{selectedIssue.title}</h2>
              <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">
                {FEATURE_STATUS[selectedIssue.status]}
              </span>
            </div>
            <p className="text-xs text-zinc-400">갱신 {formatDate(selectedIssue.updatedAt)}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-xs font-semibold text-zinc-400 uppercase mb-3">실행 이력 (run)</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {selectedIssue.runs.length === 0 ? (
                  <p className="text-sm text-zinc-400">run 없음</p>
                ) : (
                  selectedIssue.runs.map((run) => (
                    <RunBlock
                      key={run.runId}
                      run={run}
                      selected={selectedRun?.runId === run.runId}
                      onSelect={() => setOpenRunId(run.runId)}
                    />
                  ))
                )}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-xs font-semibold text-zinc-400 uppercase mb-3">누적 변경 파일</p>
              {selectedIssue.files.length === 0 ? (
                <p className="text-sm text-zinc-400">02_implementation.md 후 report sync</p>
              ) : (
                <ul className="space-y-1 max-h-64 overflow-y-auto">
                  {selectedIssue.files.map((f) => (
                    <li key={f.path} className="text-xs font-mono text-zinc-600 truncate">
                      {f.path}
                      <span className="text-zinc-400 ml-2">({f.firstRunId})</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {selectedRun && (
            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-xs font-semibold text-zinc-400 uppercase mb-2">
                선택 run Phase 태스크 — {selectedRun.runId}
              </p>
              {selectedRun.tasks.map((task) => (
                <TaskRow key={task.phase} task={task} />
              ))}
            </div>
          )}

          <p className="text-xs text-zinc-400">
            이슈 = 기능 단위(고정 #{selectedIssue.id}) · run = 파이프라인 1회 · 「이슈 {selectedIssue.id}번
            수정」 시 amendment run이 같은 이슈에 추가됨
          </p>
        </div>
      )}
    </div>
  )
}
