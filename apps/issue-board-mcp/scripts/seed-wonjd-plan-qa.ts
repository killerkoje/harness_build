// Seed wonjd_CRM plan (id=1) with the operating-criteria doc and split the QA
// checklist into issues + subtasks. Idempotent: re-running only adds what is missing.
// Usage: npm run seed:plan-qa
import fs from 'node:fs'
import path from 'node:path'

const appRoot = path.join(import.meta.dirname, '..')
try {
  process.loadEnvFile(path.join(appRoot, '.env'))
} catch {
  // already loaded
}

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing in .env')

const PROJECT_ID = 1
const PLAN_ID = 1
const PLAN_TITLE = 'CRM 신규계정 성장·유지 관리 지표 운영 기준'
const PLAN_FILE = path.join(appRoot, 'content/wonjd-operating-plan.md')
const QA_FILE = path.join(appRoot, 'content/wonjd-qa-checklist.md')

async function sbFetch(apiPath: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers)
  headers.set('apikey', key!)
  headers.set('Authorization', `Bearer ${key}`)
  if (!headers.has('Content-Type') && init.body) headers.set('Content-Type', 'application/json')
  return fetch(`${url}/rest/v1${apiPath}`, { ...init, headers })
}

async function sbJson<T>(apiPath: string, init: RequestInit = {}, label = apiPath): Promise<T> {
  const res = await sbFetch(apiPath, init)
  if (!res.ok) throw new Error(`${label}: ${res.status} ${await res.text()}`)
  return (await res.json()) as T
}

function readDoc(file: string): string {
  if (!fs.existsSync(file)) throw new Error(`missing content file: ${file}`)
  return fs.readFileSync(file, 'utf8')
}

/** First ~500 chars of "## 1. 문서 목적" body, used as the plan overview. */
function extractOverview(markdown: string): string {
  const afterHeading =
    markdown.split(/^##\s+1\.\s+개요\s*\/\s*목적\s*$/m)[1] ??
    markdown.split(/^##\s+1\.\s+문서 목적\s*$/m)[1] ??
    markdown
  const body = afterHeading.split(/^##\s+/m)[0] ?? afterHeading
  return body.trim().slice(0, 500)
}

interface QaBlock {
  id: string
  title: string
  items: Array<{ title: string; done: boolean }>
}

const HEADING_RE = /^(#{1,6})\s+(.*\S)\s*$/
const NUMBERED_RE = /^(\d+(?:\.\d+)*)\.?\s+(.+)$/
const SCENARIO_RE = /^시나리오\s+([A-Za-z가-힣])\.\s*(.+)$/
const CHECKBOX_RE = /^\s*[-*]\s*\[([ xX])\]\s*(.+)$/

/**
 * Every heading that directly owns `- [ ]` items becomes one QA block:
 * `## N.N 제목`, `### 시나리오 X. 제목`, and top-level `# N. 제목` sections
 * (including `# 16. QA 완료 기준`, whose checkboxes hang off the section itself).
 */
function parseQaBlocks(markdown: string): QaBlock[] {
  const blocks: QaBlock[] = []
  let current: QaBlock | null = null
  let topNumber = ''

  for (const line of markdown.split('\n')) {
    const heading = HEADING_RE.exec(line)
    if (heading) {
      if (current && current.items.length > 0) blocks.push(current)
      current = null

      const text = heading[2]!.trim()
      const numbered = NUMBERED_RE.exec(text)
      if (numbered) {
        const id = numbered[1]!
        topNumber = id.split('.')[0]!
        current = { id, title: numbered[2]!.trim(), items: [] }
        continue
      }
      const scenario = SCENARIO_RE.exec(text)
      if (scenario) {
        current = {
          id: topNumber ? `${topNumber}.${scenario[1]}` : scenario[1]!,
          title: scenario[2]!.trim(),
          items: [],
        }
      }
      continue
    }

    const checkbox = CHECKBOX_RE.exec(line)
    if (checkbox && current) {
      current.items.push({ title: checkbox[2]!.trim(), done: checkbox[1]!.toLowerCase() === 'x' })
    }
  }
  if (current && current.items.length > 0) blocks.push(current)

  return blocks
}

async function updatePlan(planMarkdown: string): Promise<void> {
  const existing = await sbJson<Array<{ id: number; project_id: number }>>(
    `/plans?select=id,project_id&id=eq.${PLAN_ID}&limit=1`,
    {},
    'plans lookup'
  )
  if (existing.length === 0) throw new Error(`plan ${PLAN_ID} not found`)
  if (Number(existing[0]!.project_id) !== PROJECT_ID) {
    throw new Error(`plan ${PLAN_ID} belongs to project ${existing[0]!.project_id}, expected ${PROJECT_ID}`)
  }

  const sections = {
    overview: extractOverview(planMarkdown),
    targetUsers: '운영·영업·지표 관리',
    mvpFeatures: [],
    outOfScope: 'QA 검증은 이슈 태스크로 분리',
    markdown: planMarkdown,
  }

  const res = await sbFetch(`/plans?id=eq.${PLAN_ID}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      title: PLAN_TITLE,
      sections,
      updated_at: new Date().toISOString(),
    }),
  })
  if (!res.ok) throw new Error(`plans update: ${res.status} ${await res.text()}`)
}

async function seedIssues(blocks: QaBlock[]): Promise<{ issues: number; subtasks: number }> {
  const existingIssues = await sbJson<Array<{ id: number; number: number; title: string }>>(
    `/issues?select=id,number,title&project_id=eq.${PROJECT_ID}`,
    {},
    'issues lookup'
  )
  const issueByTitle = new Map(existingIssues.map((issue) => [issue.title, issue]))
  let nextNumber = existingIssues.reduce((max, issue) => Math.max(max, Number(issue.number)), 0) + 1

  let issuesCreated = 0
  let subtasksCreated = 0

  for (const block of blocks) {
    const title = `QA ${block.id} ${block.title}`
    let issueId = issueByTitle.get(title)?.id

    if (issueId === undefined) {
      const inserted = await sbJson<Array<{ id: number }>>(
        '/issues',
        {
          method: 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({
            project_id: PROJECT_ID,
            plan_id: PLAN_ID,
            number: nextNumber,
            title,
            priority: '보통',
            description: `QA 체크리스트 ${block.id} ${block.title} (content/wonjd-qa-checklist.md)`,
            status: 'planned',
          }),
        },
        `issues insert (${title})`
      )
      issueId = Number(inserted[0]!.id)
      nextNumber += 1
      issuesCreated += 1
    }

    const existingSubtasks = await sbJson<Array<{ title: string }>>(
      `/issue_subtasks?select=title&issue_id=eq.${issueId}`,
      {},
      `subtasks lookup (${title})`
    )
    const seen = new Set(existingSubtasks.map((subtask) => subtask.title))
    const pending: Array<{ issue_id: number; title: string; done: boolean }> = []
    for (const item of block.items) {
      if (seen.has(item.title)) continue
      seen.add(item.title)
      pending.push({ issue_id: issueId, title: item.title, done: item.done })
    }

    if (pending.length > 0) {
      const res = await sbFetch('/issue_subtasks', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(pending),
      })
      if (!res.ok) throw new Error(`subtasks insert (${title}): ${res.status} ${await res.text()}`)
      subtasksCreated += pending.length
    }
  }

  return { issues: issuesCreated, subtasks: subtasksCreated }
}

const planMarkdown = readDoc(PLAN_FILE)
const qaMarkdown = readDoc(QA_FILE)
const blocks = parseQaBlocks(qaMarkdown)
const totalItems = blocks.reduce((sum, block) => sum + block.items.length, 0)

await updatePlan(planMarkdown)
console.log(`plan updated: id=${PLAN_ID} "${PLAN_TITLE}"`)
console.log(`parsed QA blocks: ${blocks.length} issues / ${totalItems} checklist items`)

const counts = await seedIssues(blocks)
console.log(`issues created: ${counts.issues} (existing reused: ${blocks.length - counts.issues})`)
console.log(`subtasks created: ${counts.subtasks} (existing skipped: ${totalItems - counts.subtasks})`)
console.log('done')
