// src/models/projects.ts
import type Database from 'better-sqlite3'
import path from 'node:path'
import type { Plan, Project } from '../types.js'
import { listIssuesByProject } from './issues.js'

function ensureDescriptionColumn(db: Database.Database) {
  const cols = db.prepare('PRAGMA table_info(projects)').all() as { name: string }[]
  if (!cols.some((c) => c.name === 'description')) {
    db.exec('ALTER TABLE projects ADD COLUMN description TEXT NOT NULL DEFAULT \"\"')
  }
}

function rowToProject(row: any): Project {
  return {
    id: row.id,
    rootPath: row.root_path ?? row.rootPath,
    name: row.name,
    description: row.description ?? '',
  }
}

export function getOrCreateProject(db: Database.Database, rootPath: string): Project {
  ensureDescriptionColumn(db)
  const existing = db.prepare('SELECT * FROM projects WHERE root_path = ?').get(rootPath)
  if (existing) return rowToProject(existing)

  const name = path.basename(rootPath)
  const result = db
    .prepare('INSERT INTO projects (root_path, name, description) VALUES (?, ?, ?)')
    .run(rootPath, name, '')
  return getProject(db, Number(result.lastInsertRowid))!
}

export function createProject(
  db: Database.Database,
  opts: { name: string; description?: string; repoPath: string }
): Project {
  ensureDescriptionColumn(db)
  const existing = db.prepare('SELECT * FROM projects WHERE root_path = ?').get(opts.repoPath)
  if (existing) {
    db.prepare('UPDATE projects SET name = ?, description = ? WHERE id = ?').run(
      opts.name,
      opts.description ?? '',
      (existing as any).id
    )
    return getProject(db, (existing as any).id)!
  }
  const result = db
    .prepare('INSERT INTO projects (root_path, name, description) VALUES (?, ?, ?)')
    .run(opts.repoPath, opts.name, opts.description ?? '')
  return getProject(db, Number(result.lastInsertRowid))!
}

export function getProject(db: Database.Database, id: number): Project | null {
  ensureDescriptionColumn(db)
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id)
  return row ? rowToProject(row) : null
}

export function listProjects(db: Database.Database): Project[] {
  ensureDescriptionColumn(db)
  const rows = db.prepare('SELECT * FROM projects ORDER BY id ASC').all()
  return rows.map(rowToProject)
}

/**
 * Deletes a project and everything scoped to it. Tables don't have
 * ON DELETE CASCADE set up, so child rows are removed bottom-up by hand
 * inside one transaction: wireframes -> issues -> plan_snapshots -> plans
 * -> design_systems -> the project row itself.
 */
export function deleteProject(db: Database.Database, id: number): boolean {
  const existing = db.prepare('SELECT id FROM projects WHERE id = ?').get(id)
  if (!existing) return false

  const run = db.transaction((projectId: number) => {
    db.prepare(
      `DELETE FROM wireframes WHERE issue_id IN (SELECT id FROM issues WHERE project_id = ?)`
    ).run(projectId)
    db.prepare(
      `DELETE FROM plan_snapshots WHERE plan_id IN (SELECT id FROM plans WHERE project_id = ?)`
    ).run(projectId)
    db.prepare('DELETE FROM issues WHERE project_id = ?').run(projectId)
    db.prepare('DELETE FROM plans WHERE project_id = ?').run(projectId)
    db.prepare('DELETE FROM design_systems WHERE project_id = ?').run(projectId)
    db.prepare('DELETE FROM projects WHERE id = ?').run(projectId)
  })
  run(id)
  return true
}

export function getProjectByRootPath(db: Database.Database, rootPath: string): Project | null {
  ensureDescriptionColumn(db)
  const row = db.prepare('SELECT * FROM projects WHERE root_path = ?').get(rootPath)
  return row ? rowToProject(row) : null
}

export function getProjectContext(db: Database.Database, repoPath: string) {
  const project = getProjectByRootPath(db, repoPath)
  if (!project) {
    return { project: null, plans: [] as Plan[], issues: [] }
  }
  const planRows = db
    .prepare('SELECT * FROM plans WHERE project_id = ? ORDER BY id DESC')
    .all(project.id)
  const plans = planRows.map((row: any) => ({
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    sections: JSON.parse(row.sections),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })) as Plan[]
  const issues = listIssuesByProject(db, project.id)
  return { project, plans, issues }
}
