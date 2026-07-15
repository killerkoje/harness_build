// src/lib/plan-rounds.ts
import type { Issue, Plan } from './api'

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
  const done = planIssues.filter((i) => i.status === 'done').length
  return { done, total: planIssues.length }
}
