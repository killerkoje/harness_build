import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'

export interface Pattern {
  id: string
  description: string
  example: string
  reason: string
  observed: number
  last_seen: string
  source: string[]
  confidence: 'high' | 'medium' | 'low'
  deprecated: boolean
  origin?: 'team' | 'local'
}

export interface PatternFile {
  version: number
  patterns: Pattern[]
}

export interface CategoryPatterns {
  category: string
  label: string
  patterns: Pattern[]
}

const CATEGORY_LABELS: Record<string, string> = {
  hooks: 'Hooks',
  components: 'Components',
  services: 'Services',
  naming: 'Naming',
  schemas: 'Schemas',
  routers: 'Routers',
  dto: 'DTO',
}

const CATEGORY_ORDER = ['hooks', 'components', 'services', 'schemas', 'routers', 'dto', 'naming']

function loadPatternsFromDir(dir: string, origin: 'team' | 'local'): CategoryPatterns[] {
  if (!fs.existsSync(dir)) return []

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.yaml'))

  return files.map((file) => {
    const category = file.replace('.yaml', '')
    const raw = fs.readFileSync(path.join(dir, file), 'utf-8')
    const parsed = yaml.load(raw) as PatternFile
    const patterns = (parsed?.patterns ?? []).map((p) => ({ ...p, origin }))

    return {
      category,
      label: CATEGORY_LABELS[category] ?? category,
      patterns,
    }
  })
}

function mergeCategories(team: CategoryPatterns[], local: CategoryPatterns[]): CategoryPatterns[] {
  const byCategory = new Map<string, CategoryPatterns>()

  for (const cat of team) {
    byCategory.set(cat.category, { ...cat, patterns: [...cat.patterns] })
  }

  for (const cat of local) {
    const existing = byCategory.get(cat.category)
    if (!existing) {
      byCategory.set(cat.category, { ...cat, patterns: [...cat.patterns] })
      continue
    }

    const byId = new Map(existing.patterns.map((p) => [p.id, p]))
    for (const p of cat.patterns) {
      byId.set(p.id, p)
    }
    existing.patterns = Array.from(byId.values())
  }

  return Array.from(byCategory.values()).sort(
    (a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)
  )
}

export function loadPatterns(patternsDir: string): CategoryPatterns[] {
  const teamDir = path.join(patternsDir, 'team')
  const localDir = path.join(patternsDir, 'local')

  if (fs.existsSync(teamDir) || fs.existsSync(localDir)) {
    return mergeCategories(
      loadPatternsFromDir(teamDir, 'team'),
      loadPatternsFromDir(localDir, 'local')
    )
  }

  if (!fs.existsSync(patternsDir)) return []

  const files = fs.readdirSync(patternsDir).filter((f) => f.endsWith('.yaml'))

  return files
    .map((file) => {
      const category = file.replace('.yaml', '')
      const raw = fs.readFileSync(path.join(patternsDir, file), 'utf-8')
      const parsed = yaml.load(raw) as PatternFile

      return {
        category,
        label: CATEGORY_LABELS[category] ?? category,
        patterns: parsed?.patterns ?? [],
      }
    })
    .sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category))
}
