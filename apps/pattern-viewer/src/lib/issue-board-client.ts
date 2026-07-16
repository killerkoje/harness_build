const BASE_URL = process.env.ISSUE_BOARD_API_URL ?? 'http://localhost:4000'

export interface Project {
  id: number
  rootPath: string
  name: string
  description?: string
  devUrl: string | null
}

export async function fetchProject(id: number): Promise<Project | null> {
  const res = await fetch(`${BASE_URL}/api/projects/${id}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`request failed: ${res.status}`)
  return res.json()
}

export async function fetchProjects(): Promise<Project[]> {
  const res = await fetch(`${BASE_URL}/api/projects`)
  if (!res.ok) throw new Error(`request failed: ${res.status}`)
  return res.json()
}
