import fs from 'fs'
import path from 'path'

export interface SpecDoc {
  id: string
  title: string
  runId: string | null
  source: 'prd' | 'workspace'
  content: string
  updatedAt: string
}

function extractTitle(content: string, fallback: string): string {
  const fm = content.match(/^---[\s\S]*?title:\s*["']?([^"'\n]+)["']?/m)
  if (fm?.[1]) return fm[1].trim()

  const h1 = content.match(/^#\s+(.+)$/m)
  if (h1?.[1]) return h1[1].trim()

  return fallback
}

function mtimeIso(filePath: string): string {
  return fs.statSync(filePath).mtime.toISOString()
}

export function loadProjectSpecs(projectRoot: string): SpecDoc[] {
  const specs: SpecDoc[] = []

  const prdPath = path.join(projectRoot, '.harness/docs/prd.md')
  if (fs.existsSync(prdPath)) {
    const content = fs.readFileSync(prdPath, 'utf-8')
    specs.push({
      id: 'prd',
      title: extractTitle(content, '프로젝트 PRD'),
      runId: null,
      source: 'prd',
      content,
      updatedAt: mtimeIso(prdPath),
    })
  }

  const workspace = path.join(projectRoot, '_workspace')
  if (fs.existsSync(workspace)) {
    for (const dir of fs.readdirSync(workspace)) {
      const specPath = path.join(workspace, dir, '01_spec.md')
      if (!fs.existsSync(specPath)) continue

      const content = fs.readFileSync(specPath, 'utf-8')
      specs.push({
        id: dir,
        title: extractTitle(content, dir),
        runId: dir,
        source: 'workspace',
        content,
        updatedAt: mtimeIso(specPath),
      })
    }
  }

  return specs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}
