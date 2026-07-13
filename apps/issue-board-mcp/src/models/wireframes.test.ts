// src/models/wireframes.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import type Database from 'better-sqlite3'
import { createDb } from '../db.js'
import { getOrCreateProject } from './projects.js'
import { createPlan } from './plans.js'
import { createIssuesFromPlan } from './issues.js'
import { upsertWireframe, getWireframeByIssue } from './wireframes.js'
import type { PlanSections, WireframeScreen } from '../types.js'

const sections: PlanSections = {
  overview: 'o',
  targetUsers: 't',
  mvpFeatures: [{ priority: '높음', title: '로그인', description: 'd' }],
  outOfScope: 'x',
}

const screens: WireframeScreen[] = [
  {
    name: '로그인 화면',
    route: '/login',
    html: '<div><nav>상단 네비</nav><form>로그인 폼</form></div>',
  },
]

describe('wireframes model', () => {
  let db: Database.Database
  let issueId: number
  beforeEach(() => {
    db = createDb(':memory:')
    const projectId = getOrCreateProject(db, '/tmp/p').id
    const planId = createPlan(db, projectId, 'p', sections).id
    issueId = createIssuesFromPlan(db, projectId, planId, sections.mvpFeatures)[0].id
  })

  it('returns null when no wireframe exists yet', () => {
    expect(getWireframeByIssue(db, issueId)).toBeNull()
  })

  it('upsertWireframe creates then updates the same row', () => {
    const first = upsertWireframe(db, issueId, screens)
    expect(first.screens).toHaveLength(1)

    const updatedScreens = [...screens, { ...screens[0], name: '로그인 화면 v2', route: '/login2' }]
    const second = upsertWireframe(db, issueId, updatedScreens)
    expect(second.id).toBe(first.id)
    expect(second.screens).toHaveLength(2)
    expect(getWireframeByIssue(db, issueId)?.screens).toHaveLength(2)
  })
})
