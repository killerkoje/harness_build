// src/models/design-systems.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import type Database from 'better-sqlite3'
import { createDb } from '../db.js'
import { getOrCreateProject } from './projects.js'
import { getDesignSystemByProject, upsertDesignSystem } from './design-systems.js'

describe('design-systems', () => {
  let db: Database.Database
  let projectId: number

  beforeEach(() => {
    db = createDb(':memory:')
    projectId = getOrCreateProject(db, '/tmp/musinsa-ds').id
  })

  it('upserts a design system for a project', () => {
    const created = upsertDesignSystem(db, projectId, {
      name: 'Musinsa Store DS',
      version: '0.1.0',
      packageName: '@musinsa/ui',
      storybookPath: 'apps/docs',
      tokens: { color: { brand: { primary: '#111111' } } },
      components: [
        {
          name: 'Button',
          packageExport: '@musinsa/ui/button',
          description: 'primary CTA',
          issueNumbers: [4, 5],
        },
      ],
    })

    expect(created.id).toBeGreaterThan(0)
    expect(created.packageName).toBe('@musinsa/ui')
    expect(created.components[0].issueNumbers).toEqual([4, 5])

    const fetched = getDesignSystemByProject(db, projectId)
    expect(fetched?.version).toBe('0.1.0')
    expect((fetched?.tokens as any).color.brand.primary).toBe('#111111')
  })

  it('defaults components to an empty array when omitted', () => {
    const created = upsertDesignSystem(db, projectId, {
      name: 'Musinsa Store DS',
      version: '0.1.0',
      packageName: '@musinsa/ui',
      storybookPath: 'apps/docs',
      tokens: { color: { brand: { primary: '#111111' } } },
    })

    expect(created.components).toEqual([])
    expect(getDesignSystemByProject(db, projectId)?.components).toEqual([])
  })

  it('updates in place on second upsert (one DS per project)', () => {
    upsertDesignSystem(db, projectId, {
      name: 'A',
      version: '0.1.0',
      packageName: '@musinsa/ui',
      storybookPath: 'apps/docs',
      tokens: {},
      components: [],
    })
    const updated = upsertDesignSystem(db, projectId, {
      name: 'B',
      version: '0.2.0',
      packageName: '@musinsa/ui',
      storybookPath: 'apps/docs',
      tokens: { x: 1 },
      components: [],
    })
    expect(updated.name).toBe('B')
    expect(updated.version).toBe('0.2.0')
    expect(getDesignSystemByProject(db, projectId)?.id).toBe(updated.id)
  })
})
