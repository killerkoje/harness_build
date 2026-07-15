// src/lib/plan-rounds.ts
import type { Issue, Plan } from './api'

/**
 * 이슈의 상태를 Notion에 반영할 때 쓰는 자동 매핑 — apps/issue-board-mcp/src/models/notion.ts의
 * STATUS_MAP과 반드시 동일하게 유지한다 (백엔드가 Notion에 실제로 쓰는 값과 여기서 "완료"를
 * 판단하는 값이 어긋나면 안 됨).
 */
const AUTO_NOTION_STATUS: Record<Issue['status'], string> = {
  planned: '기획 중',
  wireframed: '시작 전',
  dev_approved: '진행 중',
  done: '완료',
}

/** 대시보드에서 수동으로 덮어쓴 Notion 상태가 있으면 그걸, 없으면 status 기반 자동 매핑값을 쓴다. */
function effectiveNotionStatus(issue: Issue): string {
  return issue.notionStatus ?? AUTO_NOTION_STATUS[issue.status]
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
  const done = planIssues.filter((i) => effectiveNotionStatus(i) === '완료').length
  return { done, total: planIssues.length }
}
