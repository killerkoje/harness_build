// src/models/issues.ts
import type Database from 'better-sqlite3'
import type { Issue, IssueStatus, MvpFeature, NotionStatus, Priority } from '../types.js'
import { getProject } from './projects.js'
import { seedIssueYaml } from '../handoff.js'
import { pushIssueToNotion } from './notion.js'

function rowToIssue(row: any): Issue {
  return {
    id: row.id,
    projectId: row.project_id,
    number: row.number,
    planId: row.plan_id,
    title: row.title,
    priority: row.priority,
    description: row.description,
    status: row.status,
    notionPageId: row.notion_page_id,
    notionStatus: row.notion_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function setIssueNotionPageId(db: Database.Database, id: number, notionPageId: string): void {
  db.prepare('UPDATE issues SET notion_page_id = ?, updated_at = ? WHERE id = ?').run(
    notionPageId,
    new Date().toISOString(),
    id
  )
}

/** null이면 자동 매핑(STATUS_MAP[issue.status])으로 되돌린다 */
export function setIssueNotionStatus(
  db: Database.Database,
  id: number,
  notionStatus: NotionStatus | null
): void {
  db.prepare('UPDATE issues SET notion_status = ?, updated_at = ? WHERE id = ?').run(
    notionStatus,
    new Date().toISOString(),
    id
  )
}

export function createIssuesFromPlan(
  db: Database.Database,
  projectId: number,
  planId: number,
  features: MvpFeature[]
): Issue[] {
  const insert = db.prepare(
    `INSERT INTO issues (project_id, number, plan_id, title, priority, description, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'planned', ?, ?)`
  )
  const nextNumber = () => {
    const row = db
      .prepare('SELECT COALESCE(MAX(number), 0) as maxNumber FROM issues WHERE project_id = ?')
      .get(projectId) as { maxNumber: number }
    return row.maxNumber + 1
  }

  const now = new Date().toISOString()
  const insertAll = db.transaction((featuresToInsert: MvpFeature[]) => {
    const created: Issue[] = []
    for (const feature of featuresToInsert) {
      const number = nextNumber()
      const result = insert.run(
        projectId,
        number,
        planId,
        feature.title,
        feature.priority,
        feature.description,
        now,
        now
      )
      created.push(getIssue(db, Number(result.lastInsertRowid))!)
    }
    return created
  })
  return insertAll(features)
}

export function getIssue(db: Database.Database, id: number): Issue | null {
  const row = db.prepare('SELECT * FROM issues WHERE id = ?').get(id)
  return row ? rowToIssue(row) : null
}

export function listIssuesByProject(db: Database.Database, projectId: number): Issue[] {
  const rows = db
    .prepare('SELECT * FROM issues WHERE project_id = ? ORDER BY number ASC')
    .all(projectId) as any[]
  return rows.map(rowToIssue)
}

export function setIssueStatus(db: Database.Database, id: number, status: IssueStatus): void {
  db.prepare('UPDATE issues SET status = ?, updated_at = ? WHERE id = ?').run(
    status,
    new Date().toISOString(),
    id
  )
}

export function getIssueByNumber(
  db: Database.Database,
  projectId: number,
  number: number
): Issue | null {
  const row = db
    .prepare('SELECT * FROM issues WHERE project_id = ? AND number = ?')
    .get(projectId, number)
  return row ? rowToIssue(row) : null
}

export function updateIssueFields(
  db: Database.Database,
  id: number,
  fields: { title?: string; priority?: Priority; description?: string }
): void {
  const issue = getIssue(db, id)
  if (!issue) return
  const now = new Date().toISOString()
  db.prepare(
    `UPDATE issues SET title = ?, priority = ?, description = ?, updated_at = ? WHERE id = ?`
  ).run(
    fields.title ?? issue.title,
    fields.priority ?? issue.priority,
    fields.description ?? issue.description,
    now,
    id
  )
}

/**
 * Approves an issue for dev handoff: flips its status to `dev_approved` and
 * seeds `.harness/issues/{number}.yaml` so the existing dev pipeline picks it
 * up. Shared by the REST route and the MCP `approve_issue` tool so the two
 * surfaces can't drift out of sync.
 *
 * The status update is a DB write, but seeding the yaml is filesystem I/O —
 * it must stay outside any db.transaction() (transactions are DB-only).
 * Returns null if the issue doesn't exist; callers decide how to signal
 * not-found in their own transport.
 */
export async function approveIssueForDev(db: Database.Database, issueId: number): Promise<Issue | null> {
  const issue = getIssue(db, issueId)
  if (!issue) return null

  setIssueStatus(db, issueId, 'dev_approved')
  const updated = getIssue(db, issueId)!
  const project = getProject(db, updated.projectId)!
  seedIssueYaml(project.rootPath, updated)
  await pushIssueToNotion(db, updated)
  return updated
}

/**
 * Marks an issue as done once the dev pipeline (harness `/dev`) commits its
 * implementation. Called from outside this DB (Phase 4's harness-report.sh
 * step), not from any issue-board-mcp tool — there's no local file to seed
 * here, just the status flip + Notion push.
 */
export async function completeIssue(db: Database.Database, issueId: number): Promise<Issue | null> {
  const issue = getIssue(db, issueId)
  if (!issue) return null

  setIssueStatus(db, issueId, 'done')
  const updated = getIssue(db, issueId)!
  await pushIssueToNotion(db, updated)
  return updated
}
