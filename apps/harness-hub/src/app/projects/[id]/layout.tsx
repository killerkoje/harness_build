import { notFound } from 'next/navigation'
import { getProjectById } from '@/lib/projects'
import ProjectTabs from '@/components/ProjectTabs'

interface Props {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export default async function ProjectLayout({ children, params }: Props) {
  const { id } = await params
  const project = getProjectById(id)
  if (!project) notFound()

  return (
    <ProjectTabs projectId={project.id} projectName={project.name}>
      {children}
    </ProjectTabs>
  )
}
