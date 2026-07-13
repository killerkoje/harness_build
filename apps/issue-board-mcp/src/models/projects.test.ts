// src/models/projects.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import type Database from 'better-sqlite3'
import { createDb } from '../db.js'
import { getOrCreateProject, getProject } from './projects.js'

describe('projects model', () => {
  let db: Database.Database
  beforeEach(() => {
    db = createDb(':memory:')
  })

  it('creates a project on first call and reuses it on second', () => {
    const p1 = getOrCreateProject(db, '/tmp/my-project')
    const p2 = getOrCreateProject(db, '/tmp/my-project')
    expect(p1.id).toBe(p2.id)
    expect(p1.name).toBe('my-project')
  })

  it('getProject returns null for unknown id', () => {
    expect(getProject(db, 999)).toBeNull()
  })
})
