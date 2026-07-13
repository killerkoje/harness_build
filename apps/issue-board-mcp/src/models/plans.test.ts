// src/models/plans.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import type Database from 'better-sqlite3'
import { createDb } from '../db.js'
import { getOrCreateProject } from './projects.js'
import { createPlan, updatePlanSections, approvePlan, snapshotPlan, getPlan, listSnapshots } from './plans.js'
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
})
