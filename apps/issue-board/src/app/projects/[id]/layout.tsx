// src/app/projects/[id]/layout.tsx
import ProjectSidebar from '@/components/ProjectSidebar'
import TabNav from '@/components/TabNav'

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
  const res = await fetch(`${baseUrl}/api/projects/${projectId}`)
  const project = res.ok ? await res.json() : { id: projectId, name: `프로젝트 ${projectId}` }

  return (
    <div className="flex flex-col md:flex-row min-h-dvh min-w-0">
      <ProjectSidebar projects={[project]} activeId={projectId} />
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <TabNav projectId={projectId} />
        <main className="flex-1 min-w-0 p-3 sm:p-5 md:p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  )
}
