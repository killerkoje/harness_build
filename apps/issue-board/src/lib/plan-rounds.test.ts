// src/lib/plan-rounds.test.ts
import { describe, it, expect } from 'vitest'
import { roundLabel, roundShortLabel, roundIndexOf, planIssueProgress } from './plan-rounds.js'
import type { Plan, Issue, NotionStatus } from './api.js'

function makePlan(id: number): Plan {
  return {
    id,
    projectId: 1,
    title: `plan-${id}`,
    status: 'draft',
    sections: { overview: '', targetUsers: '', mvpFeatures: [], outOfScope: '' },
  }
}

function makeIssue(
  id: number,
  planId: number | null,
  status: Issue['status'],
  notionStatus: NotionStatus | null = null
): Issue {
  return {
    id,
    projectId: 1,
    number: id,
    planId,
    title: `issue-${id}`,
    priority: '보통',
    description: '',
    status,
    notionPageId: null,
    notionStatus,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('plan-rounds', () => {
  it('roundLabel numbers rounds starting from 1', () => {
    expect(roundLabel(0)).toBe('1차기획')
    expect(roundLabel(2)).toBe('3차기획')
  })

  it('roundShortLabel numbers rounds starting from 1', () => {
    expect(roundShortLabel(0)).toBe('1차')
    expect(roundShortLabel(1)).toBe('2차')
  })

  it('roundIndexOf finds a plan position by id', () => {
    const plans = [makePlan(10), makePlan(20), makePlan(30)]
    expect(roundIndexOf(plans, 20)).toBe(1)
  })

  it('roundIndexOf returns -1 for an unknown or null planId', () => {
    const plans = [makePlan(10)]
    expect(roundIndexOf(plans, 999)).toBe(-1)
    expect(roundIndexOf(plans, null)).toBe(-1)
  })

  it('planIssueProgress counts an issue as complete when its status auto-maps to Notion 완료', () => {
    const issues = [
      makeIssue(1, 10, 'planned'),
      makeIssue(2, 10, 'dev_approved'),
      makeIssue(3, 10, 'done'),
      makeIssue(4, 20, 'planned'),
    ]
    expect(planIssueProgress(10, issues)).toEqual({ done: 1, total: 3 })
  })

  it('planIssueProgress counts a manually-overridden Notion status of 완료 even if status is not done', () => {
    const issues = [makeIssue(1, 10, 'dev_approved', '완료'), makeIssue(2, 10, 'planned')]
    expect(planIssueProgress(10, issues)).toEqual({ done: 1, total: 2 })
  })

  it('planIssueProgress does not count status=done if the Notion status was manually overridden away from 완료', () => {
    const issues = [makeIssue(1, 10, 'done', '보류'), makeIssue(2, 10, 'planned')]
    expect(planIssueProgress(10, issues)).toEqual({ done: 0, total: 2 })
  })

  it('planIssueProgress returns null when the plan has no issues', () => {
    expect(planIssueProgress(999, [])).toBeNull()
  })
})
