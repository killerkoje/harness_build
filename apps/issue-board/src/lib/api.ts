// src/lib/api.ts
export const NOTION_STATUS_OPTIONS = ['기획 중', '시작 전', '보류', '진행 중', '반영 대기', '완료'] as const
export type NotionStatus = (typeof NOTION_STATUS_OPTIONS)[number]

export interface Issue {
  id: number
  projectId: number
  number: number
  planId: number | null
  title: string
  priority: '높음' | '보통' | '낮음'
  description: string
  status: 'planned' | 'wireframed' | 'dev_approved' | 'done'
  notionPageId: string | null
  notionStatus: NotionStatus | null
  // GET /api/projects/:id/issues에서만 채워진다 — 단건 조회(getIssue 기반)
  // 라우트들의 응답에는 이 키 자체가 없다. 상태 갱신 시 전체 교체 대신
  // { ...prev, ...updated } 형태로 병합해서 값을 잃지 않도록 한다.
  subtaskProgress?: { total: number; done: number } | null
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: number
  rootPath: string
  name: string
  description: string
  devUrl: string | null
}

export interface WireframeScreen {
  name: string
  route: string | null
  html: string
}

export interface Wireframe {
  id: number
  issueId: number
  screens: WireframeScreen[]
}

export interface WireframeSummary {
  issueId: number
  issueNumber: number
  issueTitle: string
  screenCount: number
  updatedAt: string
}

export interface Plan {
  id: number
  projectId: number
  title: string
  status: 'draft' | 'approved'
  sections: {
    overview: string
    targetUsers: string
    mvpFeatures: { priority: string; title: string; description: string }[]
    outOfScope: string
    markdown?: string
  }
}

export interface DesignSystemComponent {
  name: string
  packageExport: string
  description: string
  issueNumbers: number[]
}

export interface DesignSystem {
  id: number
  projectId: number
  name: string
  version: string
  packageName: string
  storybookPath: string
  tokens: Record<string, unknown>
  components?: DesignSystemComponent[]
}

function supabaseConfig(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing')
  return { url, key }
}

function restHeaders(extra?: HeadersInit): Headers {
  const { key } = supabaseConfig()
  const headers = new Headers(extra)
  headers.set('apikey', key)
  headers.set('Authorization', `Bearer ${key}`)
  return headers
}

async function sb(path: string, init: RequestInit = {}): Promise<Response> {
  const { url } = supabaseConfig()
  return fetch(`${url}/rest/v1${path}`, { ...init, headers: restHeaders(init.headers) })
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`request failed: ${res.status}`)
  return res.json() as Promise<T>
}

function num(v: unknown): number {
  return typeof v === 'number' ? v : Number(v)
}

function jsonVal<T>(v: unknown): T {
  return (typeof v === 'string' ? JSON.parse(v) : v) as T
}

function toProject(row: Record<string, unknown>): Project {
  return {
    id: num(row.id),
    rootPath: String(row.root_path),
    name: String(row.name),
    description: String(row.description ?? ''),
    devUrl: (row.dev_url as string | null) ?? null,
  }
}

function toPlan(row: Record<string, unknown>): Plan {
  return {
    id: num(row.id),
    projectId: num(row.project_id),
    title: String(row.title),
    status: row.status as Plan['status'],
    sections: jsonVal(row.sections),
  }
}

function toIssue(row: Record<string, unknown>): Issue {
  return {
    id: num(row.id),
    projectId: num(row.project_id),
    number: num(row.number),
    planId: row.plan_id == null ? null : num(row.plan_id),
    title: String(row.title),
    priority: row.priority as Issue['priority'],
    description: String(row.description),
    status: row.status as Issue['status'],
    notionPageId: (row.notion_page_id as string | null) ?? null,
    notionStatus: (row.notion_status as NotionStatus | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

function toSubtask(row: Record<string, unknown>): Subtask {
  return {
    id: num(row.id),
    issueId: num(row.issue_id),
    title: String(row.title),
    done: Boolean(row.done),
    notes: String(row.notes ?? ''),
  }
}

function toWireframe(row: Record<string, unknown>): Wireframe {
  return {
    id: num(row.id),
    issueId: num(row.issue_id),
    screens: jsonVal(row.screens),
  }
}

function toDesignSystem(row: Record<string, unknown>): DesignSystem {
  return {
    id: num(row.id),
    projectId: num(row.project_id),
    name: String(row.name),
    version: String(row.version),
    packageName: String(row.package_name),
    storybookPath: String(row.storybook_path),
    tokens: jsonVal(row.tokens),
    components: jsonVal(row.components),
  }
}

export async function fetchProjects(): Promise<Project[]> {
  const rows = await json<Record<string, unknown>[]>(await sb('/projects?select=*&order=id'))
  return rows.map(toProject)
}

export async function deleteProject(projectId: number): Promise<void> {
  const res = await sb(`/projects?id=eq.${projectId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`request failed: ${res.status}`)
}

export async function fetchIssues(projectId: number): Promise<Issue[]> {
  const rows = await json<Record<string, unknown>[]>(
    await sb(`/issues?select=*&project_id=eq.${projectId}&order=number`)
  )
  const issues = rows.map(toIssue)
  if (issues.length === 0) return []
  const ids = issues.map((i) => i.id).join(',')
  const subRows = await json<Array<{ issue_id: number; done: boolean }>>(
    await sb(`/issue_subtasks?select=issue_id,done&issue_id=in.(${ids})`)
  )
  const counts = new Map<number, { total: number; done: number }>()
  for (const row of subRows) {
    const id = num(row.issue_id)
    const cur = counts.get(id) ?? { total: 0, done: 0 }
    cur.total += 1
    if (row.done) cur.done += 1
    counts.set(id, cur)
  }
  return issues.map((issue) => ({ ...issue, subtaskProgress: counts.get(issue.id) ?? null }))
}

export async function fetchIssue(issueId: number): Promise<Issue> {
  const rows = await json<Record<string, unknown>[]>(await sb(`/issues?select=*&id=eq.${issueId}`))
  if (rows.length === 0) throw new Error('request failed: 404')
  return toIssue(rows[0]!)
}

export async function fetchPlan(planId: number): Promise<Plan> {
  const rows = await json<Record<string, unknown>[]>(await sb(`/plans?select=*&id=eq.${planId}`))
  if (rows.length === 0) throw new Error('request failed: 404')
  return toPlan(rows[0]!)
}

export async function fetchLatestPlan(projectId: number): Promise<Plan | null> {
  const rows = await json<Record<string, unknown>[]>(
    await sb(`/plans?select=*&project_id=eq.${projectId}&order=id.desc&limit=1`)
  )
  return rows[0] ? toPlan(rows[0]) : null
}

export async function fetchPlans(projectId: number): Promise<Plan[]> {
  const rows = await json<Record<string, unknown>[]>(
    await sb(`/plans?select=*&project_id=eq.${projectId}&order=id`)
  )
  return rows.map(toPlan)
}

export async function fetchWireframe(issueId: number): Promise<Wireframe | null> {
  const rows = await json<Record<string, unknown>[]>(
    await sb(`/wireframes?select=*&issue_id=eq.${issueId}`)
  )
  return rows[0] ? toWireframe(rows[0]) : null
}

export async function fetchWireframesByProject(projectId: number): Promise<WireframeSummary[]> {
  const issues = await json<Record<string, unknown>[]>(
    await sb(`/issues?select=id,number,title&project_id=eq.${projectId}`)
  )
  if (issues.length === 0) return []
  const ids = issues.map((i) => num(i.id)).join(',')
  const rows = await json<Record<string, unknown>[]>(
    await sb(`/wireframes?select=*&issue_id=in.(${ids})`)
  )
  const byIssue = new Map(issues.map((i) => [num(i.id), i]))
  return rows.map((row) => {
    const issue = byIssue.get(num(row.issue_id))!
    const screens = jsonVal<WireframeScreen[]>(row.screens)
    return {
      issueId: num(row.issue_id),
      issueNumber: num(issue.number),
      issueTitle: String(issue.title),
      screenCount: screens.length,
      updatedAt: String(row.updated_at),
    }
  })
}

export async function approveIssue(issueId: number): Promise<Issue> {
  const res = await sb(`/issues?id=eq.${issueId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ status: 'dev_approved', updated_at: new Date().toISOString() }),
  })
  const rows = await json<Record<string, unknown>[]>(res)
  if (rows.length === 0) throw new Error('request failed: 404')
  return toIssue(rows[0]!)
}

export async function setIssueNotionStatus(issueId: number, notionStatus: NotionStatus | null): Promise<Issue> {
  const res = await sb(`/issues?id=eq.${issueId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ notion_status: notionStatus, updated_at: new Date().toISOString() }),
  })
  const rows = await json<Record<string, unknown>[]>(res)
  if (rows.length === 0) throw new Error('request failed: 404')
  return toIssue(rows[0]!)
}

export async function updatePlanStatus(planId: number, status: Plan['status']): Promise<Plan> {
  const res = await sb(`/plans?id=eq.${planId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ status, updated_at: new Date().toISOString() }),
  })
  const rows = await json<Record<string, unknown>[]>(res)
  if (rows.length === 0) throw new Error('request failed: 404')
  return toPlan(rows[0]!)
}

export async function fetchDesignSystem(projectId: number): Promise<DesignSystem | null> {
  const rows = await json<Record<string, unknown>[]>(
    await sb(`/design_systems?select=*&project_id=eq.${projectId}`)
  )
  return rows[0] ? toDesignSystem(rows[0]) : null
}

export interface Subtask {
  id: number
  issueId: number
  title: string
  done: boolean
  notes: string
}

export async function fetchSubtasks(issueId: number): Promise<Subtask[]> {
  const rows = await json<Record<string, unknown>[]>(
    await sb(`/issue_subtasks?select=*&issue_id=eq.${issueId}&order=id`)
  )
  return rows.map(toSubtask)
}

export async function createSubtask(issueId: number, title: string): Promise<Subtask> {
  const now = new Date().toISOString()
  const res = await sb('/issue_subtasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({
      issue_id: issueId,
      title,
      done: false,
      notes: '',
      created_at: now,
      updated_at: now,
    }),
  })
  const rows = await json<Record<string, unknown>[]>(res)
  return toSubtask(rows[0]!)
}

export async function updateSubtask(
  id: number,
  fields: { title?: string; done?: boolean; notes?: string }
): Promise<Subtask> {
  const res = await sb(`/issue_subtasks?id=eq.${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ ...fields, updated_at: new Date().toISOString() }),
  })
  const rows = await json<Record<string, unknown>[]>(res)
  if (rows.length === 0) throw new Error('request failed: 404')
  return toSubtask(rows[0]!)
}

export async function deleteSubtask(id: number): Promise<void> {
  const res = await sb(`/issue_subtasks?id=eq.${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`request failed: ${res.status}`)
}
