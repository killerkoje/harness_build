// src/models/plans.ts
import type Database from 'better-sqlite3'
import type { Issue, Plan, PlanSections, PlanSnapshot } from '../types.js'
import { createIssuesFromPlan } from './issues.js'

function rowToPlan(row: any): Plan {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    sections: JSON.parse(row.sections),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function createPlan(
  db: Database.Database,
  projectId: number,
  title: string,
  sections: PlanSections
): Plan {
  const now = new Date().toISOString()
  const result = db
    .prepare(
      `INSERT INTO plans (project_id, title, sections, status, created_at, updated_at)
       VALUES (?, ?, ?, 'draft', ?, ?)`
    )
    .run(projectId, title, JSON.stringify(sections), now, now)
  return getPlan(db, Number(result.lastInsertRowid))!
}

export function getPlan(db: Database.Database, id: number): Plan | null {
  const row = db.prepare('SELECT * FROM plans WHERE id = ?').get(id)
  return row ? rowToPlan(row) : null
}

export function updatePlanSections(db: Database.Database, id: number, sections: PlanSections): void {
  db.prepare('UPDATE plans SET sections = ?, updated_at = ? WHERE id = ?').run(
    JSON.stringify(sections),
    new Date().toISOString(),
    id
  )
}

export function approvePlan(db: Database.Database, id: number): void {
  const now = new Date().toISOString()
  db.prepare("UPDATE plans SET status = 'approved', updated_at = ? WHERE id = ?").run(now, id)
  snapshotPlan(db, id, 'approved')
}

export function snapshotPlan(db: Database.Database, planId: number, label: string): PlanSnapshot {
  const plan = getPlan(db, planId)
  if (!plan) throw new Error(`plan ${planId} not found`)
  const now = new Date().toISOString()
  const result = db
    .prepare('INSERT INTO plan_snapshots (plan_id, label, content, created_at) VALUES (?, ?, ?, ?)')
    .run(planId, label, JSON.stringify(plan.sections), now)
  return { id: Number(result.lastInsertRowid), planId, label, content: plan.sections, createdAt: now }
}

/**
 * Approves a plan and creates one issue per MVP feature row, atomically.
 * Shared by the REST handler and the MCP `update_plan` tool so the two
 * surfaces can't drift out of sync.
 */
export function approvePlanAndCreateIssues(
  db: Database.Database,
  planId: number
): { plan: Plan; issues: Issue[] } {
  const run = db.transaction(() => {
    approvePlan(db, planId)
    const plan = getPlan(db, planId)
    if (!plan) throw new Error(`plan ${planId} not found`)
    const issues = createIssuesFromPlan(db, plan.projectId, planId, plan.sections.mvpFeatures)
    return { plan, issues }
  })
  return run()
}

export function listSnapshots(db: Database.Database, planId: number): PlanSnapshot[] {
  const rows = db
    .prepare('SELECT * FROM plan_snapshots WHERE plan_id = ? ORDER BY id ASC')
    .all(planId) as any[]
  return rows.map((r) => ({
    id: r.id,
    planId: r.plan_id,
    label: r.label,
    content: JSON.parse(r.content),
    createdAt: r.created_at,
  }))
}
