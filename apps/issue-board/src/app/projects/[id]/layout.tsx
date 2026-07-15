// src/app/projects/[id]/layout.tsx
import ProjectSidebar from '@/components/ProjectSidebar'
import TabNav from '@/components/TabNav'
import ProjectQuickLinks from '@/components/ProjectQuickLinks'

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const projectId = Number(id)
  const baseUrl = process.env.NEXT_PUBLIC_ISSUE_BOARD_API_URL ?? 'http://localhost:4000'
  // fetch itself can throw (e.g. MCP server down/unreachable), not just
  // return a non-ok response — fall back the same way for both.
  let projects: { id: number; name: string; devUrl?: string | null }[]
  try {
    const res = await fetch(`${baseUrl}/api/projects`)
    projects = res.ok ? await res.json() : [{ id: projectId, name: `프로젝트 ${projectId}` }]
  } catch {
    projects = [{ id: projectId, name: `프로젝트 ${projectId}` }]
  }
  if (!projects.some((p) => p.id === projectId)) {
    projects = [...projects, { id: projectId, name: `프로젝트 ${projectId}` }]
  }
  const activeDevUrl = projects.find((p) => p.id === projectId)?.devUrl ?? null

  return (
    <div className="flex flex-col md:flex-row min-h-dvh min-w-0">
      <ProjectSidebar projects={projects} activeId={projectId} />
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <div className="flex items-center justify-between border-b border-zinc-200">
          <TabNav projectId={projectId} />
          <ProjectQuickLinks projectId={projectId} devUrl={activeDevUrl} />
        </div>
        <main className="flex-1 min-w-0 p-3 sm:p-5 md:p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  )
}
