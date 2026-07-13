// src/models/projects.ts
import type Database from 'better-sqlite3'
import path from 'node:path'
import type { Project } from '../types.js'

export function getOrCreateProject(db: Database.Database, rootPath: string): Project {
  const existing = db
    .prepare('SELECT id, root_path as rootPath, name FROM projects WHERE root_path = ?')
    .get(rootPath) as Project | undefined
  if (existing) return existing

  const name = path.basename(rootPath)
  const result = db
    .prepare('INSERT INTO projects (root_path, name) VALUES (?, ?)')
    .run(rootPath, name)
  return { id: Number(result.lastInsertRowid), rootPath, name }
}

export function getProject(db: Database.Database, id: number): Project | null {
  const row = db
    .prepare('SELECT id, root_path as rootPath, name FROM projects WHERE id = ?')
    .get(id) as Project | undefined
  return row ?? null
}
