import fs from 'fs'
import path from 'path'

export interface ScreenItem {
  id: string
  name: string
  filePath: string
  route: string | null
  runId: string
  status: 'implemented' | 'planned'
}

const FILE_RE =
  /(?:^|\s|`|\/)(app\/|pages\/|src\/app\/|src\/pages\/|screens\/|components\/)([^\s`]+\.(tsx|jsx|vue))/gi

const ROUTE_RE = /(?:route|path|페이지|화면)[:\s]*[`'"]?(\/[a-z0-9\-/_\[\]]+)/gi

function fileToRoute(filePath: string): string | null {
  const normalized = filePath.replace(/\\/g, '/')

  const appMatch = normalized.match(/(?:src\/)?app\/(.+)\/page\.(tsx|jsx)/)
  if (appMatch) {
    const segments = appMatch[1].replace(/\/page$/, '')
    return segments ? `/${segments}` : '/'
  }

  const pagesMatch = normalized.match(/(?:src\/)?pages\/(.+)\.(tsx|jsx)/)
  if (pagesMatch) {
    const seg = pagesMatch[1].replace(/\/index$/, '').replace(/^index$/, '')
    return seg ? `/${seg}` : '/'
  }

  const screenMatch = normalized.match(/screens\/([^/]+)\./)
  if (screenMatch) return `/${screenMatch[1]}`

  return null
}

function nameFromPath(filePath: string): string {
  const base = path.basename(filePath, path.extname(filePath))
  if (base === 'page' || base === 'index') {
    return path.basename(path.dirname(filePath))
  }
  return base
}

function extractFromContent(content: string, runId: string, status: ScreenItem['status']): ScreenItem[] {
  const items: ScreenItem[] = []
  const seen = new Set<string>()

  for (const match of content.matchAll(FILE_RE)) {
    const filePath = `${match[1]}${match[2]}`
    if (seen.has(filePath)) continue
    seen.add(filePath)

    items.push({
      id: `${runId}:${filePath}`,
      name: nameFromPath(filePath),
      filePath,
      route: fileToRoute(filePath),
      runId,
      status,
    })
  }

  return items
}

export function loadProjectScreens(projectRoot: string): ScreenItem[] {
  const workspace = path.join(projectRoot, '_workspace')
  if (!fs.existsSync(workspace)) return []

  const byKey = new Map<string, ScreenItem>()

  for (const dir of fs.readdirSync(workspace)) {
    const runDir = path.join(workspace, dir)
    if (!fs.statSync(runDir).isDirectory()) continue

    const specPath = path.join(runDir, '01_spec.md')
    const implPath = path.join(runDir, '02_implementation.md')

    if (fs.existsSync(specPath)) {
      const content = fs.readFileSync(specPath, 'utf-8')
      for (const item of extractFromContent(content, dir, 'planned')) {
        byKey.set(item.filePath, item)
      }
    }

    if (fs.existsSync(implPath)) {
      const content = fs.readFileSync(implPath, 'utf-8')
      for (const item of extractFromContent(content, dir, 'implemented')) {
        byKey.set(item.filePath, item)
      }
    }
  }

  return Array.from(byKey.values()).sort((a, b) => {
    if (a.status !== b.status) return a.status === 'implemented' ? -1 : 1
    return (a.route ?? a.filePath).localeCompare(b.route ?? b.filePath)
  })
}
