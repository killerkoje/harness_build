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

const BASE_URL = process.env.NEXT_PUBLIC_ISSUE_BOARD_API_URL ?? 'http://localhost:4000'

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`request failed: ${res.status}`)
  return res.json() as Promise<T>
}

export async function fetchProjects(): Promise<Project[]> {
  return json(await fetch(`${BASE_URL}/api/projects`))
}

export async function deleteProject(projectId: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/projects/${projectId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`request failed: ${res.status}`)
}

export async function updateProjectDevUrl(projectId: number, devUrl: string | null): Promise<Project> {
  return json(
    await fetch(`${BASE_URL}/api/projects/${projectId}/dev-url`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ devUrl }),
    })
  )
}

export async function fetchIssues(projectId: number): Promise<Issue[]> {
  return json(await fetch(`${BASE_URL}/api/projects/${projectId}/issues`))
}

export async function fetchIssue(issueId: number): Promise<Issue> {
  return json(await fetch(`${BASE_URL}/api/issues/${issueId}`))
}

export async function fetchPlan(planId: number): Promise<Plan> {
  return json(await fetch(`${BASE_URL}/api/plans/${planId}`))
}

export async function fetchLatestPlan(projectId: number): Promise<Plan | null> {
  const res = await fetch(`${BASE_URL}/api/projects/${projectId}/plans/latest`)
  if (res.status === 404) return null
  return json(res)
}

export async function fetchPlans(projectId: number): Promise<Plan[]> {
  return json(await fetch(`${BASE_URL}/api/projects/${projectId}/plans`))
}

export async function fetchWireframe(issueId: number): Promise<Wireframe | null> {
  const res = await fetch(`${BASE_URL}/api/issues/${issueId}/wireframe`)
  if (res.status === 404) return null
  return json(res)
}

export async function approveIssue(issueId: number): Promise<Issue> {
  return json(await fetch(`${BASE_URL}/api/issues/${issueId}/approve`, { method: 'POST' }))
}

export async function setIssueNotionStatus(issueId: number, notionStatus: NotionStatus | null): Promise<Issue> {
  return json(
    await fetch(`${BASE_URL}/api/issues/${issueId}/notion-status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notionStatus }),
    })
  )
}

export async function fetchDesignSystem(projectId: number): Promise<DesignSystem | null> {
  const res = await fetch(`${BASE_URL}/api/projects/${projectId}/design-system`)
  if (res.status === 404) return null
  return json(res)
}

export interface Subtask {
  id: number
  issueId: number
  title: string
  done: boolean
}

export async function fetchSubtasks(issueId: number): Promise<Subtask[]> {
  return json(await fetch(`${BASE_URL}/api/issues/${issueId}/subtasks`))
}

export async function createSubtask(issueId: number, title: string): Promise<Subtask> {
  return json(
    await fetch(`${BASE_URL}/api/issues/${issueId}/subtasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
  )
}

export async function updateSubtask(
  id: number,
  fields: { title?: string; done?: boolean }
): Promise<Subtask> {
  return json(
    await fetch(`${BASE_URL}/api/subtasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
  )
}

export async function deleteSubtask(id: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/subtasks/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`request failed: ${res.status}`)
}
