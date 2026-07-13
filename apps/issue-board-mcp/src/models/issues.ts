// src/models/issues.ts
import type Database from 'better-sqlite3'
import type { Issue, IssueStatus, MvpFeature } from '../types.js'

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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
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

  const created: Issue[] = []
  const now = new Date().toISOString()
  for (const feature of features) {
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
