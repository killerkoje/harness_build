// src/db.test.ts
import { describe, it, expect } from 'vitest'
import { createDb } from './db.js'

describe('createDb', () => {
  it('creates all required tables', () => {
    const db = createDb(':memory:')
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all()
      .map((r: any) => r.name)

    expect(tables).toContain('projects')
    expect(tables).toContain('plans')
    expect(tables).toContain('plan_snapshots')
    expect(tables).toContain('issues')
    expect(tables).toContain('wireframes')
    expect(tables).toContain('design_systems')
  })

  it('enforces unique (project_id, number) on issues', () => {
    const db = createDb(':memory:')
    db.prepare(
      "INSERT INTO projects (root_path, name) VALUES ('/tmp/p', 'p')"
    ).run()
    const now = new Date().toISOString()
    db.prepare(
      `INSERT INTO issues (project_id, number, plan_id, title, priority, description, status, created_at, updated_at)
       VALUES (1, 1, NULL, 't', '보통', 'd', 'planned', ?, ?)`
    ).run(now, now)

    expect(() =>
      db
        .prepare(
          `INSERT INTO issues (project_id, number, plan_id, title, priority, description, status, created_at, updated_at)
           VALUES (1, 1, NULL, 't2', '보통', 'd2', 'planned', ?, ?)`
        )
        .run(now, now)
    ).toThrow()
  })
})
