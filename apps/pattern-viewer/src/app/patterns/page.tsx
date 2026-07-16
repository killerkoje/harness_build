// src/app/patterns/page.tsx
import path from 'path'
import { loadPatterns } from '@/lib/patterns'
import { fetchProject, fetchProjects } from '@/lib/issue-board-client'
import PatternViewer from '@/components/PatternViewer'
import ProjectPicker from '@/components/ProjectPicker'

// Reads pattern YAML from disk on every request instead of at build time,
// since files under .harness/patterns change without a rebuild/redeploy.
export const dynamic = 'force-dynamic'

const CONNECTION_ERROR = (
  <p className="text-sm text-red-600 mt-16 text-center">
    issue-board-mcp 서버에 연결할 수 없습니다. 서버가 떠 있는지 확인하세요.
  </p>
)

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>
}) {
  const { projectId: projectIdQuery } = await searchParams
  const projectId = projectIdQuery ? Number(projectIdQuery) : null

  if (projectId == null) {
    try {
      const projects = await fetchProjects()
      return <ProjectPicker projects={projects} />
    } catch {
      return CONNECTION_ERROR
    }
  }

  let project
  try {
    project = await fetchProject(projectId)
  } catch {
    return CONNECTION_ERROR
  }

  if (!project) {
    const projects = await fetchProjects().catch(() => [])
    return (
      <ProjectPicker projects={projects} notice={`프로젝트(id=${projectId})를 찾을 수 없습니다.`} />
    )
  }

  const patternsDir = path.join(project.rootPath, '.harness/patterns')
  const categories = loadPatterns(patternsDir)

  return (
    <div>
      <div className="max-w-5xl mx-auto px-4 pt-4">
        <p className="text-xs text-zinc-400">{project.name}</p>
      </div>
      <PatternViewer categories={categories} />
    </div>
  )
}
