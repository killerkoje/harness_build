// src/lib/api.ts
export interface Issue {
  id: number
  projectId: number
  number: number
  planId: number | null
  title: string
  priority: '높음' | '보통' | '낮음'
  description: string
  status: 'planned' | 'wireframed' | 'dev_approved'
  createdAt: string
  updatedAt: string
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
  components: DesignSystemComponent[]
}

const BASE_URL = process.env.NEXT_PUBLIC_ISSUE_BOARD_API_URL ?? 'http://localhost:4000'

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`request failed: ${res.status}`)
  return res.json() as Promise<T>
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

export async function fetchWireframe(issueId: number): Promise<Wireframe | null> {
  const res = await fetch(`${BASE_URL}/api/issues/${issueId}/wireframe`)
  if (res.status === 404) return null
  return json(res)
}

export async function approveIssue(issueId: number): Promise<Issue> {
  return json(await fetch(`${BASE_URL}/api/issues/${issueId}/approve`, { method: 'POST' }))
}

export async function fetchDesignSystem(projectId: number): Promise<DesignSystem | null> {
  const res = await fetch(`${BASE_URL}/api/projects/${projectId}/design-system`)
  if (res.status === 404) return null
  return json(res)
}
