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
  notionStatus: NotionStatus | null = null,
  subtaskProgress: Issue['subtaskProgress'] = null
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
    subtaskProgress,
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

  it('planIssueProgress counts an issue complete when all subtasks are done', () => {
    const issues = [
      makeIssue(1, 10, 'dev_approved', null, { total: 3, done: 3 }),
      makeIssue(2, 10, 'dev_approved', null, { total: 2, done: 1 }),
      makeIssue(3, 20, 'dev_approved', null, { total: 1, done: 1 }),
    ]
    expect(planIssueProgress(10, issues)).toEqual({ done: 1, total: 2 })
  })

  it('planIssueProgress counts status=done when the issue has no subtasks', () => {
    const issues = [
      makeIssue(1, 10, 'planned'),
      makeIssue(2, 10, 'done'),
      makeIssue(3, 10, 'dev_approved'),
    ]
    expect(planIssueProgress(10, issues)).toEqual({ done: 1, total: 3 })
  })

  it('planIssueProgress ignores notionStatus override — completion follows subtasks or status', () => {
    const issues = [
      makeIssue(1, 10, 'dev_approved', '완료', { total: 2, done: 0 }),
      makeIssue(2, 10, 'planned', '완료'),
    ]
    expect(planIssueProgress(10, issues)).toEqual({ done: 0, total: 2 })
  })

  it('planIssueProgress returns null when the plan has no issues', () => {
    expect(planIssueProgress(999, [])).toBeNull()
  })
})
