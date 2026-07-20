// src/lib/plan-rounds.ts
import type { Issue, Plan } from './api'

/**
 * 이슈 탭·기획 탭이 같은 기준으로 "완료"를 본다.
 * - 하위 태스크가 있으면: 전부 완료일 때만 완료
 * - 없으면: status가 done일 때 완료 (하네스 completeIssue 등)
 */
export function isIssueComplete(issue: Issue): boolean {
  if (issue.subtaskProgress != null) {
    return issue.subtaskProgress.done === issue.subtaskProgress.total
  }
  return issue.status === 'done'
}

/** plans는 생성 순서(id ASC)로 정렬돼 있다고 가정 — fetchPlans가 이를 보장한다. */
export function roundLabel(index: number): string {
  return `${index + 1}차기획`
}

export function roundShortLabel(index: number): string {
  return `${index + 1}차`
}

export function roundIndexOf(plans: Plan[], planId: number | null): number {
  if (planId == null) return -1
  return plans.findIndex((p) => p.id === planId)
}

export function planIssueProgress(
  planId: number,
  issues: Issue[]
): { done: number; total: number } | null {
  const planIssues = issues.filter((i) => i.planId === planId)
  if (planIssues.length === 0) return null
  const done = planIssues.filter(isIssueComplete).length
  return { done, total: planIssues.length }
}
