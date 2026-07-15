// src/models/plans.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import type Database from 'better-sqlite3'
import { createDb } from '../db.js'
import { getOrCreateProject } from './projects.js'
import {
  createPlan,
  updatePlanSections,
  approvePlan,
  snapshotPlan,
  getPlan,
  listSnapshots,
  listPlansByProject,
  approvePlanAndCreateIssues,
} from './plans.js'
import { listIssuesByProject } from './issues.js'
import type { PlanSections } from '../types.js'

const sections: PlanSections = {
  overview: '개요',
  targetUsers: '타깃',
  mvpFeatures: [{ priority: '높음', title: '로그인', description: '이메일 로그인' }],
  outOfScope: '없음',
}

describe('plans model', () => {
  let db: Database.Database
  let projectId: number
  beforeEach(() => {
    db = createDb(':memory:')
    projectId = getOrCreateProject(db, '/tmp/p').id
  })

  it('creates a draft plan', () => {
    const plan = createPlan(db, projectId, '내 프로젝트', sections)
    expect(plan.status).toBe('draft')
    expect(plan.sections.mvpFeatures).toHaveLength(1)
  })

  it('updatePlanSections overwrites sections without creating a snapshot', () => {
    const plan = createPlan(db, projectId, '내 프로젝트', sections)
    updatePlanSections(db, plan.id, { ...sections, overview: '수정된 개요' })
    expect(getPlan(db, plan.id)?.sections.overview).toBe('수정된 개요')
    expect(listSnapshots(db, plan.id)).toHaveLength(0)
  })

  it('approvePlan sets status=approved and creates an automatic snapshot', () => {
    const plan = createPlan(db, projectId, '내 프로젝트', sections)
    approvePlan(db, plan.id)
    expect(getPlan(db, plan.id)?.status).toBe('approved')
    const snaps = listSnapshots(db, plan.id)
    expect(snaps).toHaveLength(1)
    expect(snaps[0].label).toBe('approved')
  })

  it('snapshotPlan adds a manual snapshot with given label', () => {
    const plan = createPlan(db, projectId, '내 프로젝트', sections)
    snapshotPlan(db, plan.id, 'MVP 범위 축소')
    expect(listSnapshots(db, plan.id).map((s) => s.label)).toEqual(['MVP 범위 축소'])
  })

  it('approvePlanAndCreateIssues approves the plan and creates one issue per mvpFeatures row', async () => {
    const plan = createPlan(db, projectId, '내 프로젝트', sections)
    const result = await approvePlanAndCreateIssues(db, plan.id)
    expect(result.plan.status).toBe('approved')
    expect(result.issues).toHaveLength(1)
    expect(result.issues[0].title).toBe('로그인')
    expect(listIssuesByProject(db, projectId)).toHaveLength(1)
  })

  it('approvePlanAndCreateIssues throws for a nonexistent plan and creates no issues', async () => {
    await expect(approvePlanAndCreateIssues(db, 999999)).rejects.toThrow()
    expect(listIssuesByProject(db, projectId)).toHaveLength(0)
  })

  it('listPlansByProject returns all plans for a project ordered by creation (id ASC)', () => {
    const p1 = createPlan(db, projectId, '1차', sections)
    const p2 = createPlan(db, projectId, '2차', sections)
    expect(listPlansByProject(db, projectId).map((p) => p.id)).toEqual([p1.id, p2.id])
  })

  it('listPlansByProject returns an empty array for a project with no plans', () => {
    expect(listPlansByProject(db, projectId)).toEqual([])
  })
})
