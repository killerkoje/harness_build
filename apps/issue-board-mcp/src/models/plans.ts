// src/models/plans.ts
import type Database from 'better-sqlite3'
import type { Issue, Plan, PlanSections, PlanSnapshot } from '../types.js'
import {
  createIssuesFromPlan,
  getIssue,
  listIssuesByProject,
  setIssueStatus,
  updateIssueFields,
} from './issues.js'
import { deleteWireframeByIssue } from './wireframes.js'
import { parsePlanMarkdown } from './parse-plan-markdown.js'
import { pushIssueToNotion, pushEpicToNotion } from './notion.js'

function rowToPlan(row: any): Plan {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    sections: JSON.parse(row.sections),
    status: row.status,
    notionEpicPageId: row.notion_epic_page_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function setPlanNotionEpicPageId(db: Database.Database, id: number, notionEpicPageId: string): void {
  db.prepare('UPDATE plans SET notion_epic_page_id = ?, updated_at = ? WHERE id = ?').run(
    notionEpicPageId,
    new Date().toISOString(),
    id
  )
}

/**
 * Ensures a Notion Epic page exists for this plan (creates on first call,
 * patches the same page after), then returns its page id. No-ops (returns
 * null) when Notion sync isn't configured — same optionality as
 * pushIssueToNotion.
 */
async function ensureEpicPageId(db: Database.Database, plan: Plan): Promise<string | null> {
  const epicPageId = await pushEpicToNotion(plan.notionEpicPageId, plan.title)
  if (epicPageId && epicPageId !== plan.notionEpicPageId) {
    setPlanNotionEpicPageId(db, plan.id, epicPageId)
  }
  return epicPageId
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

/**
 * Most recently updated plan for a project. Used as the dashboard's fallback
 * when a plan has no issues yet (draft, pre-approval) so there's no
 * issue.planId to work backward from.
 */
export function getLatestPlanForProject(db: Database.Database, projectId: number): Plan | null {
  const row = db
    .prepare('SELECT * FROM plans WHERE project_id = ? ORDER BY updated_at DESC LIMIT 1')
    .get(projectId)
  return row ? rowToPlan(row) : null
}

export function updatePlanSections(db: Database.Database, id: number, sections: PlanSections): void {
  db.prepare('UPDATE plans SET sections = ?, updated_at = ? WHERE id = ?').run(
    JSON.stringify(sections),
    new Date().toISOString(),
    id
  )
}

export function updatePlanContent(db: Database.Database, id: number, content: string): Plan {
  const sections = parsePlanMarkdown(content)
  updatePlanSections(db, id, sections)
  return getPlan(db, id)!
}

export function createPlanFromMarkdown(
  db: Database.Database,
  projectId: number,
  title: string,
  content: string
): Plan {
  return createPlan(db, projectId, title, parsePlanMarkdown(content))
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
export async function approvePlanAndCreateIssues(
  db: Database.Database,
  planId: number
): Promise<{ plan: Plan; issues: Issue[] }> {
  const run = db.transaction(() => {
    approvePlan(db, planId)
    const plan = getPlan(db, planId)
    if (!plan) throw new Error(`plan ${planId} not found`)
    const issues = createIssuesFromPlan(db, plan.projectId, planId, plan.sections.mvpFeatures)
    return { plan, issues }
  })
  const result = run()
  // Network I/O — must run after the transaction commits, not inside it.
  const epicPageId = await ensureEpicPageId(db, result.plan)
  for (const issue of result.issues) {
    await pushIssueToNotion(db, issue, epicPageId)
  }
  return result
}

/**
 * Sync issues to the plan's current MVP feature table (title match).
 * - New features → create (planned)
 * - Changed priority/description → update + drop wireframe + status planned
 * - Removed from plan → left as orphaned (not deleted)
 */
export async function syncIssuesFromPlan(
  db: Database.Database,
  planId: number
): Promise<{
  plan: Plan
  created: Issue[]
  updated: Issue[]
  unchanged: Issue[]
  orphaned: Issue[]
  wireframesInvalidated: number[]
}> {
  const plan = getPlan(db, planId)
  if (!plan) throw new Error(`plan ${planId} not found`)

  const features = plan.sections.mvpFeatures
  const existing = listIssuesByProject(db, plan.projectId).filter((i) => i.planId === planId)
  const byTitle = new Map(existing.map((i) => [i.title, i]))

  const created: Issue[] = []
  const updated: Issue[] = []
  const unchanged: Issue[] = []
  const wireframesInvalidated: number[] = []
  const matchedIds = new Set<number>()

  const run = db.transaction(() => {
    for (const feature of features) {
      const prev = byTitle.get(feature.title)
      if (!prev) {
        const [issue] = createIssuesFromPlan(db, plan.projectId, planId, [feature])
        created.push(issue)
        matchedIds.add(issue.id)
        continue
      }

      matchedIds.add(prev.id)
      const changed =
        prev.priority !== feature.priority || prev.description !== feature.description

      if (!changed) {
        unchanged.push(prev)
        continue
      }

      updateIssueFields(db, prev.id, {
        priority: feature.priority,
        description: feature.description,
      })
      if (deleteWireframeByIssue(db, prev.id)) {
        wireframesInvalidated.push(prev.id)
      }
      setIssueStatus(db, prev.id, 'planned')
      updated.push(getIssue(db, prev.id)!)
    }
  })
  run()

  // Network I/O — must run after the transaction commits, not inside it.
  const epicPageId = await ensureEpicPageId(db, plan)
  for (const issue of [...created, ...updated]) {
    await pushIssueToNotion(db, issue, epicPageId)
  }

  const orphaned = existing.filter((i) => !matchedIds.has(i.id))
  return {
    plan: getPlan(db, planId)!,
    created,
    updated,
    unchanged,
    orphaned,
    wireframesInvalidated,
  }
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
