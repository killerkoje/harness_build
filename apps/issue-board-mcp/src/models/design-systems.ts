// src/models/design-systems.ts
import type Database from 'better-sqlite3'
import type { DesignSystem, DesignSystemComponent } from '../types.js'

function rowToDesignSystem(row: any): DesignSystem {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    version: row.version,
    packageName: row.package_name,
    storybookPath: row.storybook_path,
    tokens: JSON.parse(row.tokens),
    components: JSON.parse(row.components) as DesignSystemComponent[],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function getDesignSystemByProject(
  db: Database.Database,
  projectId: number
): DesignSystem | null {
  const row = db.prepare('SELECT * FROM design_systems WHERE project_id = ?').get(projectId)
  return row ? rowToDesignSystem(row) : null
}

export function upsertDesignSystem(
  db: Database.Database,
  projectId: number,
  input: {
    name: string
    version: string
    packageName: string
    storybookPath: string
    tokens: Record<string, unknown>
    components?: DesignSystemComponent[]
  }
): DesignSystem {
  const components = input.components ?? []
  const existing = getDesignSystemByProject(db, projectId)
  const now = new Date().toISOString()
  const tokensJson = JSON.stringify(input.tokens)
  const componentsJson = JSON.stringify(components)

  if (existing) {
    db.prepare(
      `UPDATE design_systems
       SET name = ?, version = ?, package_name = ?, storybook_path = ?,
           tokens = ?, components = ?, updated_at = ?
       WHERE project_id = ?`
    ).run(
      input.name,
      input.version,
      input.packageName,
      input.storybookPath,
      tokensJson,
      componentsJson,
      now,
      projectId
    )
    return getDesignSystemByProject(db, projectId)!
  }

  const result = db
    .prepare(
      `INSERT INTO design_systems
       (project_id, name, version, package_name, storybook_path, tokens, components, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      projectId,
      input.name,
      input.version,
      input.packageName,
      input.storybookPath,
      tokensJson,
      componentsJson,
      now,
      now
    )

  return {
    id: Number(result.lastInsertRowid),
    projectId,
    name: input.name,
    version: input.version,
    packageName: input.packageName,
    storybookPath: input.storybookPath,
    tokens: input.tokens,
    components,
    createdAt: now,
    updatedAt: now,
  }
}
