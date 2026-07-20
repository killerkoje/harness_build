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

// Coerces one raw YAML entry into a safe Pattern, or drops it if it has no id.
// Pattern YAML files are written by the harness pipeline, not hand-authored,
// so a partially-written or schema-drifted entry must not crash the viewer.
function sanitizePattern(raw: unknown, origin: 'team' | 'local' | undefined): Pattern | null {
  if (!raw || typeof raw !== 'object') return null
  const p = raw as Record<string, unknown>
  if (typeof p.id !== 'string' || p.id.length === 0) return null

  return {
    id: p.id,
    description: typeof p.description === 'string' ? p.description : '',
    example: typeof p.example === 'string' ? p.example : '',
    reason: typeof p.reason === 'string' ? p.reason : '',
    observed: typeof p.observed === 'number' ? p.observed : 0,
    last_seen: typeof p.last_seen === 'string' ? p.last_seen : '',
    source: Array.isArray(p.source) ? p.source.filter((s): s is string => typeof s === 'string') : [],
    confidence:
      p.confidence === 'high' || p.confidence === 'medium' || p.confidence === 'low'
        ? p.confidence
        : 'low',
    deprecated: typeof p.deprecated === 'boolean' ? p.deprecated : false,
    origin,
  }
}

// Parses one pattern YAML file's contents. Never throws: malformed YAML,
// a non-array `patterns` field, or an unreadable file all resolve to [].
function parsePatternFile(raw: string, origin: 'team' | 'local' | undefined): Pattern[] {
  let parsed: unknown
  try {
    parsed = yaml.load(raw)
  } catch {
    return []
  }

  const patternsField = (parsed as { patterns?: unknown } | null | undefined)?.patterns
  if (!Array.isArray(patternsField)) return []

  return patternsField
    .map((p) => sanitizePattern(p, origin))
    .filter((p): p is Pattern => p !== null)
}

function readPatternFile(dir: string, file: string, origin: 'team' | 'local' | undefined): Pattern[] {
  try {
    const raw = fs.readFileSync(path.join(dir, file), 'utf-8')
    return parsePatternFile(raw, origin)
  } catch {
    return []
  }
}

function loadPatternsFromDir(dir: string, origin: 'team' | 'local'): CategoryPatterns[] {
  if (!fs.existsSync(dir)) return []

  let files: string[]
  try {
    files = fs.readdirSync(dir).filter((f) => f.endsWith('.yaml'))
  } catch {
    return []
  }

  return files.map((file) => {
    const category = file.replace('.yaml', '')
    return {
      category,
      label: CATEGORY_LABELS[category] ?? category,
      patterns: readPatternFile(dir, file, origin),
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
  try {
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
        return {
          category,
          label: CATEGORY_LABELS[category] ?? category,
          patterns: readPatternFile(patternsDir, file, undefined),
        }
      })
      .sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category))
  } catch {
    return []
  }
}
