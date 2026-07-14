// src/models/plans.sync.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import type Database from 'better-sqlite3'
import type { Issue } from '../types.js'
import { createDb } from '../db.js'
import { getOrCreateProject } from './projects.js'
import { createPlan, approvePlanAndCreateIssues, updatePlanSections, syncIssuesFromPlan } from './plans.js'
import { getIssue, listIssuesByProject } from './issues.js'
import { upsertWireframe, getWireframeByIssue } from './wireframes.js'

describe('syncIssuesFromPlan', () => {
  let db: Database.Database
  let planId: number
  let projectId: number

  beforeEach(async () => {
    db = createDb(':memory:')
    projectId = getOrCreateProject(db, '/tmp/sync-plan').id
    const plan = createPlan(db, projectId, 'p', {
      overview: 'o',
      targetUsers: 't',
      mvpFeatures: [
        { priority: '높음', title: '홈', description: '피드' },
        { priority: '보통', title: '검색', description: '필터' },
      ],
      outOfScope: 'x',
    })
    planId = plan.id
    await approvePlanAndCreateIssues(db, planId)
  })

  it('creates issues for newly added MVP features', async () => {
    updatePlanSections(db, planId, {
      overview: 'o',
      targetUsers: 't',
      mvpFeatures: [
        { priority: '높음', title: '홈', description: '피드' },
        { priority: '보통', title: '검색', description: '필터' },
        { priority: '낮음', title: '마이', description: '프로필' },
      ],
      outOfScope: 'x',
    })
    const result = await syncIssuesFromPlan(db, planId)
    expect(result.created).toHaveLength(1)
    expect(result.created[0].title).toBe('마이')
    expect(listIssuesByProject(db, projectId)).toHaveLength(3)
  })

  it('updates changed features and invalidates wireframes', async () => {
    const home = listIssuesByProject(db, projectId).find((i) => i.title === '홈')!
    upsertWireframe(db, home.id, [
      { name: '홈', route: '/home', html: '<div>old</div>' },
    ])

    updatePlanSections(db, planId, {
      overview: 'o',
      targetUsers: 't',
      mvpFeatures: [
        { priority: '높음', title: '홈', description: '피드 + 배너' },
        { priority: '보통', title: '검색', description: '필터' },
      ],
      outOfScope: 'x',
    })

    const result = await syncIssuesFromPlan(db, planId)
    expect(result.updated).toHaveLength(1)
    expect(result.wireframesInvalidated).toContain(home.id)
    expect(getWireframeByIssue(db, home.id)).toBeNull()
    expect(getIssue(db, home.id)?.status).toBe('planned')
    expect(getIssue(db, home.id)?.description).toBe('피드 + 배너')
  })

  it('reports orphaned issues when features are removed (does not delete)', async () => {
    updatePlanSections(db, planId, {
      overview: 'o',
      targetUsers: 't',
      mvpFeatures: [{ priority: '높음', title: '홈', description: '피드' }],
      outOfScope: 'x',
    })
    const result = await syncIssuesFromPlan(db, planId)
    expect(result.orphaned.map((i: Issue) => i.title)).toEqual(['검색'])
    expect(listIssuesByProject(db, projectId)).toHaveLength(2)
  })
})
