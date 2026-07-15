// src/models/projects.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import type Database from 'better-sqlite3'
import { createDb } from '../db.js'
import {
  getOrCreateProject,
  getProject,
  listProjects,
  deleteProject,
  updateProjectDevUrl,
} from './projects.js'
import { createPlan, approvePlanAndCreateIssues } from './plans.js'
import { getIssue } from './issues.js'
import { upsertWireframe, getWireframeByIssue } from './wireframes.js'
import { upsertDesignSystem, getDesignSystemByProject } from './design-systems.js'

describe('projects model', () => {
  let db: Database.Database
  beforeEach(() => {
    db = createDb(':memory:')
  })

  it('creates a project on first call and reuses it on second', () => {
    const p1 = getOrCreateProject(db, '/tmp/my-project')
    const p2 = getOrCreateProject(db, '/tmp/my-project')
    expect(p1.id).toBe(p2.id)
    expect(p1.name).toBe('my-project')
  })

  it('getProject returns null for unknown id', () => {
    expect(getProject(db, 999)).toBeNull()
  })

  it('listProjects returns every registered project in creation order', () => {
    const p1 = getOrCreateProject(db, '/tmp/proj-a')
    const p2 = getOrCreateProject(db, '/tmp/proj-b')
    expect(listProjects(db).map((p) => p.id)).toEqual([p1.id, p2.id])
  })

  it('deleteProject returns false for an unknown id', () => {
    expect(deleteProject(db, 999)).toBe(false)
  })

  it('new projects have a null devUrl until set', () => {
    const project = getOrCreateProject(db, '/tmp/proj-dev-url')
    expect(project.devUrl).toBeNull()
  })

  it('updateProjectDevUrl sets and clears the dev server URL', () => {
    const project = getOrCreateProject(db, '/tmp/proj-dev-url-2')
    const updated = updateProjectDevUrl(db, project.id, 'http://localhost:3000')
    expect(updated?.devUrl).toBe('http://localhost:3000')

    const cleared = updateProjectDevUrl(db, project.id, null)
    expect(cleared?.devUrl).toBeNull()
  })

  it('updateProjectDevUrl returns null for an unknown id', () => {
    expect(updateProjectDevUrl(db, 999, 'http://localhost:3000')).toBeNull()
  })

  it('deleteProject removes the project and all of its plans/issues/wireframes/design system', async () => {
    const project = getOrCreateProject(db, '/tmp/proj-c')
    const plan = createPlan(db, project.id, 'p', {
      overview: 'o',
      targetUsers: 't',
      mvpFeatures: [{ priority: '높음', title: '로그인', description: 'd' }],
      outOfScope: 'x',
    })
    const { issues } = await approvePlanAndCreateIssues(db, plan.id)
    upsertWireframe(db, issues[0].id, [{ name: '로그인', route: '/login', html: '<div/>' }])
    upsertDesignSystem(db, project.id, {
      name: 'DS',
      version: '0.1.0',
      packageName: '@x/ui',
      storybookPath: 'apps/docs',
      tokens: {},
      components: [],
    })

    expect(deleteProject(db, project.id)).toBe(true)

    expect(getProject(db, project.id)).toBeNull()
    expect(getDesignSystemByProject(db, project.id)).toBeNull()
    expect(getIssue(db, issues[0].id)).toBeNull()
    expect(getWireframeByIssue(db, issues[0].id)).toBeNull()
    const remainingPlans = db.prepare('SELECT * FROM plans WHERE project_id = ?').all(project.id)
    expect(remainingPlans).toHaveLength(0)
    const remainingIssues = db.prepare('SELECT * FROM issues WHERE project_id = ?').all(project.id)
    expect(remainingIssues).toHaveLength(0)
    const remainingSnapshots = db.prepare('SELECT * FROM plan_snapshots WHERE plan_id = ?').all(plan.id)
    expect(remainingSnapshots).toHaveLength(0)
  })
})
