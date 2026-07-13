// src/handoff.ts
import fs from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'
import type { Issue } from './types.js'

export function seedIssueYaml(projectRoot: string, issue: Issue): void {
  const dir = path.join(projectRoot, '.harness/issues')
  fs.mkdirSync(dir, { recursive: true })

  const filePath = path.join(dir, `${issue.number}.yaml`)
  const doc = {
    version: 1,
    id: issue.number,
    title: issue.title,
    status: 'active',
    created_at: issue.createdAt,
    updated_at: issue.updatedAt,
    runs: [],
    files: [],
  }

  fs.writeFileSync(filePath, yaml.dump(doc), 'utf-8')
}
