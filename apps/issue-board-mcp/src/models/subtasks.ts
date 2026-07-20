// src/models/subtasks.ts
import type Database from 'better-sqlite3'
import type { Subtask } from '../types.js'
import { getIssue, completeIssue } from './issues.js'

function rowToSubtask(row: any): Subtask {
  return {
    id: row.id,
    issueId: row.issue_id,
    title: row.title,
    done: Boolean(row.done),
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function listSubtasksByIssue(db: Database.Database, issueId: number): Subtask[] {
  const rows = db
    .prepare('SELECT * FROM issue_subtasks WHERE issue_id = ? ORDER BY id ASC')
    .all(issueId) as any[]
  return rows.map(rowToSubtask)
}

export function getSubtask(db: Database.Database, id: number): Subtask | null {
  const row = db.prepare('SELECT * FROM issue_subtasks WHERE id = ?').get(id)
  return row ? rowToSubtask(row) : null
}

export function createSubtask(db: Database.Database, issueId: number, title: string): Subtask {
  const now = new Date().toISOString()
  const result = db
    .prepare(
      'INSERT INTO issue_subtasks (issue_id, title, done, created_at, updated_at) VALUES (?, ?, 0, ?, ?)'
    )
    .run(issueId, title, now, now)
  return {
    id: Number(result.lastInsertRowid),
    issueId,
    title,
    done: false,
    notes: '',
    createdAt: now,
    updatedAt: now,
  }
}

export function createSubtasksBulk(
  db: Database.Database,
  issueId: number,
  titles: string[]
): Subtask[] {
  const insertAll = db.transaction((titlesToInsert: string[]) =>
    titlesToInsert.map((title) => createSubtask(db, issueId, title))
  )
  return insertAll(titles)
}

export function updateSubtask(
  db: Database.Database,
  id: number,
  fields: { title?: string; done?: boolean; notes?: string }
): Subtask | null {
  const existing = getSubtask(db, id)
  if (!existing) return null
  const now = new Date().toISOString()
  db.prepare('UPDATE issue_subtasks SET title = ?, done = ?, notes = ?, updated_at = ? WHERE id = ?').run(
    fields.title ?? existing.title,
    (fields.done ?? existing.done) ? 1 : 0,
    fields.notes ?? existing.notes,
    now,
    id
  )
  return getSubtask(db, id)
}

export function deleteSubtask(db: Database.Database, id: number): boolean {
  const result = db.prepare('DELETE FROM issue_subtasks WHERE id = ?').run(id)
  return result.changes > 0
}

export async function maybeAutoCompleteIssue(db: Database.Database, issueId: number): Promise<void> {
  const subtasks = listSubtasksByIssue(db, issueId)
  if (subtasks.length === 0) return
  const allDone = subtasks.every((s) => s.done)
  if (!allDone) return
  const issue = getIssue(db, issueId)
  if (!issue || issue.status === 'done') return
  await completeIssue(db, issueId)
}
