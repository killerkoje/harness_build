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
    <div className="flex min-h-screen">
      <ProjectSidebar projects={[project]} activeId={projectId} />
      <div className="flex-1 flex flex-col">
        <TabNav projectId={projectId} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
