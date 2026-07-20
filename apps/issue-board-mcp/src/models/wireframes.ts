// src/models/wireframes.ts
import type Database from 'better-sqlite3'
import type { Wireframe, WireframeScreen } from '../types.js'

function rowToWireframe(row: any): Wireframe {
  return {
    id: row.id,
    issueId: row.issue_id,
    screens: JSON.parse(row.screens),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function getWireframeByIssue(db: Database.Database, issueId: number): Wireframe | null {
  const row = db.prepare('SELECT * FROM wireframes WHERE issue_id = ?').get(issueId)
  return row ? rowToWireframe(row) : null
}

export function upsertWireframe(
  db: Database.Database,
  issueId: number,
  screens: WireframeScreen[]
): Wireframe {
  const existing = getWireframeByIssue(db, issueId)
  const now = new Date().toISOString()

  if (existing) {
    db.prepare('UPDATE wireframes SET screens = ?, updated_at = ? WHERE issue_id = ?').run(
      JSON.stringify(screens),
      now,
      issueId
    )
    return getWireframeByIssue(db, issueId)!
  }

  const result = db
    .prepare('INSERT INTO wireframes (issue_id, screens, created_at, updated_at) VALUES (?, ?, ?, ?)')
    .run(issueId, JSON.stringify(screens), now, now)
  return { id: Number(result.lastInsertRowid), issueId, screens, createdAt: now, updatedAt: now }
}

export function deleteWireframeByIssue(db: Database.Database, issueId: number): boolean {
  const result = db.prepare('DELETE FROM wireframes WHERE issue_id = ?').run(issueId)
  return result.changes > 0
}

export interface WireframeSummary {
  issueId: number
  issueNumber: number
  issueTitle: string
  screenCount: number
  updatedAt: string
}

export function listWireframesByProject(db: Database.Database, projectId: number): WireframeSummary[] {
  const rows = db
    .prepare(
      `SELECT w.issue_id, w.screens, w.updated_at, i.number AS issue_number, i.title AS issue_title
       FROM wireframes w
       JOIN issues i ON i.id = w.issue_id
       WHERE i.project_id = ?
       ORDER BY i.number ASC`
    )
    .all(projectId) as any[]
  return rows.map((row) => ({
    issueId: row.issue_id,
    issueNumber: row.issue_number,
    issueTitle: row.issue_title,
    screenCount: JSON.parse(row.screens).length,
    updatedAt: row.updated_at,
  }))
}
