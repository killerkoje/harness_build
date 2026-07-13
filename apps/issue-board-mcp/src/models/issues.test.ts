// src/models/issues.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import type Database from 'better-sqlite3'
import { createDb } from '../db.js'
import { getOrCreateProject } from './projects.js'
import { createPlan } from './plans.js'
import {
  createIssuesFromPlan,
  listIssuesByProject,
  getIssue,
  setIssueStatus,
} from './issues.js'
import type { PlanSections } from '../types.js'

const sections: PlanSections = {
  overview: 'o',
  targetUsers: 't',
  mvpFeatures: [
    { priority: '높음', title: '로그인', description: '이메일 로그인' },
    { priority: '보통', title: '프로필 편집', description: '이름/사진 수정' },
  ],
  outOfScope: 'x',
}

describe('issues model', () => {
  let db: Database.Database
  let projectId: number
  let planId: number
  beforeEach(() => {
    db = createDb(':memory:')
    projectId = getOrCreateProject(db, '/tmp/p').id
    planId = createPlan(db, projectId, 'p', sections).id
  })

  it('creates one issue per mvpFeatures row, numbered from 1 within the project', () => {
    const issues = createIssuesFromPlan(db, projectId, planId, sections.mvpFeatures)
    expect(issues).toHaveLength(2)
    expect(issues.map((i) => i.number)).toEqual([1, 2])
    expect(issues.every((i) => i.status === 'planned')).toBe(true)
  })

  it('numbers continue from the existing max for the project', () => {
    createIssuesFromPlan(db, projectId, planId, sections.mvpFeatures)
    const more = createIssuesFromPlan(db, projectId, planId, [sections.mvpFeatures[0]])
    expect(more[0].number).toBe(3)
  })

  it('numbering is independent per project', () => {
    const otherProjectId = getOrCreateProject(db, '/tmp/other').id
    const otherPlanId = createPlan(db, otherProjectId, 'p2', sections).id
    createIssuesFromPlan(db, projectId, planId, sections.mvpFeatures)
    const otherIssues = createIssuesFromPlan(db, otherProjectId, otherPlanId, [sections.mvpFeatures[0]])
    expect(otherIssues[0].number).toBe(1)
  })

  it('setIssueStatus updates status and is idempotent', () => {
    const [issue] = createIssuesFromPlan(db, projectId, planId, [sections.mvpFeatures[0]])
    setIssueStatus(db, issue.id, 'wireframed')
    expect(getIssue(db, issue.id)?.status).toBe('wireframed')
    setIssueStatus(db, issue.id, 'wireframed')
    expect(getIssue(db, issue.id)?.status).toBe('wireframed')
  })

  it('listIssuesByProject returns issues ordered by number', () => {
    createIssuesFromPlan(db, projectId, planId, sections.mvpFeatures)
    const list = listIssuesByProject(db, projectId)
    expect(list.map((i) => i.number)).toEqual([1, 2])
  })
})
