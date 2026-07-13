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
