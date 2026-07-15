// src/db.ts
import Database from 'better-sqlite3'

export function createDb(filename: string): Database.Database {
  const db = new Database(filename)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      root_path TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id),
      title TEXT NOT NULL,
      sections TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS plan_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id INTEGER NOT NULL REFERENCES plans(id),
      label TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id),
      number INTEGER NOT NULL,
      plan_id INTEGER REFERENCES plans(id),
      title TEXT NOT NULL,
      priority TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'planned',
      notion_page_id TEXT,
      notion_status TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(project_id, number)
    );

    CREATE TABLE IF NOT EXISTS wireframes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_id INTEGER NOT NULL UNIQUE REFERENCES issues(id),
      screens TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS design_systems (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL UNIQUE REFERENCES projects(id),
      name TEXT NOT NULL,
      version TEXT NOT NULL,
      package_name TEXT NOT NULL,
      storybook_path TEXT NOT NULL,
      tokens TEXT NOT NULL,
      components TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `)

  const issueCols = db.prepare('PRAGMA table_info(issues)').all() as { name: string }[]
  if (!issueCols.some((c) => c.name === 'notion_page_id')) {
    db.exec('ALTER TABLE issues ADD COLUMN notion_page_id TEXT')
  }
  if (!issueCols.some((c) => c.name === 'notion_status')) {
    db.exec('ALTER TABLE issues ADD COLUMN notion_status TEXT')
  }

  const planCols = db.prepare('PRAGMA table_info(plans)').all() as { name: string }[]
  if (!planCols.some((c) => c.name === 'notion_epic_page_id')) {
    db.exec('ALTER TABLE plans ADD COLUMN notion_epic_page_id TEXT')
  }

  const projectCols = db.prepare('PRAGMA table_info(projects)').all() as { name: string }[]
  if (!projectCols.some((c) => c.name === 'dev_url')) {
    db.exec('ALTER TABLE projects ADD COLUMN dev_url TEXT')
  }

  return db
}
