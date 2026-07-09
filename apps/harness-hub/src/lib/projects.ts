import fs from 'fs'
import path from 'path'

export interface HarnessProject {
  id: string
  name: string
  rootPath: string
  stack: string
  harnessVersion: string | null
  patternCount: number
  specCount: number
  screenCount: number
}

export function encodeProjectId(rootPath: string): string {
  return Buffer.from(rootPath).toString('base64url')
}

export function decodeProjectId(id: string): string | null {
  try {
    return Buffer.from(id, 'base64url').toString('utf-8')
  } catch {
    return null
  }
}

function readStack(root: string): string {
  for (const rel of ['harness.config.yaml', 'harness_global/harness.config.yaml']) {
    const configPath = path.join(root, rel)
    if (!fs.existsSync(configPath)) continue
    const line = fs.readFileSync(configPath, 'utf-8').match(/^stack:\s*(\S+)/m)
    if (line?.[1]) return line[1].replace(/["']/g, '')
  }
  return 'unknown'
}

function readHarnessVersion(root: string): string | null {
  for (const rel of ['.harness-version', 'harness_global/VERSION']) {
    const versionPath = path.join(root, rel)
    if (!fs.existsSync(versionPath)) continue
    const v = fs.readFileSync(versionPath, 'utf-8').trim()
    if (v) return v
  }
  return null
}

function countYamlPatterns(root: string): number {
  const patternsRoot = path.join(root, '.harness/patterns')
  if (!fs.existsSync(patternsRoot)) return 0

  const dirs: string[] = []
  const teamDir = path.join(patternsRoot, 'team')
  const localDir = path.join(patternsRoot, 'local')
  if (fs.existsSync(teamDir)) dirs.push(teamDir)
  if (fs.existsSync(localDir)) dirs.push(localDir)
  if (dirs.length === 0) dirs.push(patternsRoot)

  let count = 0
  for (const dir of dirs) {
    if (!fs.statSync(dir).isDirectory()) continue
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.yaml')) continue
      try {
        const raw = fs.readFileSync(path.join(dir, file), 'utf-8')
        const matches = raw.match(/^\s+-\s+id:/gm)
        count += matches?.length ?? 0
      } catch {
        /* skip */
      }
    }
  }
  return count
}

function countWorkspaceSpecs(root: string): number {
  const workspace = path.join(root, '_workspace')
  if (!fs.existsSync(workspace)) return 0
  return fs.readdirSync(workspace).filter((d) => {
    return fs.existsSync(path.join(workspace, d, '01_spec.md'))
  }).length
}

function countScreensEstimate(root: string): number {
  const workspace = path.join(root, '_workspace')
  if (!fs.existsSync(workspace)) return 0
  const seen = new Set<string>()
  for (const dir of fs.readdirSync(workspace)) {
    const impl = path.join(workspace, dir, '02_implementation.md')
    if (!fs.existsSync(impl)) continue
    const content = fs.readFileSync(impl, 'utf-8')
    const matches = content.matchAll(
      /(?:app\/|pages\/|src\/app\/|src\/pages\/|screens\/)[^\s`]+\.(tsx|jsx|vue)/gi
    )
    for (const m of matches) seen.add(m[0])
  }
  return seen.size
}

function isHarnessProject(root: string): boolean {
  return (
    fs.existsSync(path.join(root, 'harness.config.yaml')) ||
    fs.existsSync(path.join(root, '.harness-version')) ||
    fs.existsSync(path.join(root, '.harness')) ||
    fs.existsSync(path.join(root, 'harness_global/VERSION'))
  )
}

function toProject(root: string): HarnessProject {
  const name = path.basename(root)
  return {
    id: encodeProjectId(root),
    name,
    rootPath: root,
    stack: readStack(root),
    harnessVersion: readHarnessVersion(root),
    patternCount: countYamlPatterns(root),
    specCount: countWorkspaceSpecs(root) + (fs.existsSync(path.join(root, '.harness/docs/prd.md')) ? 1 : 0),
    screenCount: countScreensEstimate(root),
  }
}

function discoverFromEnv(): string[] {
  const raw = process.env.HARNESS_PROJECTS?.trim()
  if (!raw) return []
  return raw
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => fs.existsSync(p) && isHarnessProject(p))
}

function discoverFromRoot(): string[] {
  const root = process.env.PROJECTS_ROOT?.trim()
  if (!root || !fs.existsSync(root)) return []

  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => path.join(root, e.name))
    .filter(isHarnessProject)
}

export function discoverProjects(): HarnessProject[] {
  const paths = new Set<string>([...discoverFromEnv(), ...discoverFromRoot()])

  if (paths.size === 0) {
    const fallback = path.resolve(process.cwd(), '../..')
    if (isHarnessProject(fallback)) paths.add(fallback)
  }

  return Array.from(paths)
    .map(toProject)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function getProjectById(id: string): HarnessProject | null {
  const root = decodeProjectId(id)
  if (!root || !fs.existsSync(root) || !isHarnessProject(root)) return null
  return toProject(root)
}
