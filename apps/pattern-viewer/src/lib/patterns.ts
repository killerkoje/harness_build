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

export function loadPatterns(patternsDir: string): CategoryPatterns[] {
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
    .sort((a, b) => {
      const order = ['hooks', 'components', 'services', 'schemas', 'routers', 'dto', 'naming']
      return order.indexOf(a.category) - order.indexOf(b.category)
    })
}
