// src/models/issues.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import type Database from 'better-sqlite3'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import yaml from 'js-yaml'
import { createDb } from '../db.js'
import { getOrCreateProject } from './projects.js'
import { createPlan } from './plans.js'
import {
  createIssuesFromPlan,
  listIssuesByProject,
  getIssue,
  setIssueStatus,
  approveIssueForDev,
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

  it('is atomic: a failure partway through the loop leaves no partial rows', () => {
    const badFeatures = [
      sections.mvpFeatures[0],
      // undefined is not bindable by better-sqlite3 and throws mid-transaction
      { ...sections.mvpFeatures[1], description: undefined as unknown as string },
    ]
    expect(() => createIssuesFromPlan(db, projectId, planId, badFeatures)).toThrow()
    expect(listIssuesByProject(db, projectId)).toHaveLength(0)
  })

  describe('approveIssueForDev', () => {
    let projectRoot: string
    let issuesProjectId: number
    let issuesPlanId: number

    beforeEach(() => {
      projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'issue-board-model-'))
      issuesProjectId = getOrCreateProject(db, projectRoot).id
      issuesPlanId = createPlan(db, issuesProjectId, 'p', sections).id
    })

    it('sets status to dev_approved and seeds the handoff yaml with correct content', () => {
      const [issue] = createIssuesFromPlan(db, issuesProjectId, issuesPlanId, [sections.mvpFeatures[0]])

      const updated = approveIssueForDev(db, issue.id)

      expect(updated?.status).toBe('dev_approved')
      expect(getIssue(db, issue.id)?.status).toBe('dev_approved')

      const yamlPath = path.join(projectRoot, '.harness/issues', `${issue.number}.yaml`)
      expect(fs.existsSync(yamlPath)).toBe(true)
      const doc = yaml.load(fs.readFileSync(yamlPath, 'utf-8')) as any
      expect(doc.id).toBe(issue.number)
      expect(doc.title).toBe(issue.title)
    })

    it('returns null for a nonexistent issue', () => {
      expect(approveIssueForDev(db, 999999)).toBeNull()
    })
  })
})
