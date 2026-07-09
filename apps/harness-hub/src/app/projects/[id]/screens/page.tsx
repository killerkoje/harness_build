import { notFound } from 'next/navigation'
import { getProjectById } from '@/lib/projects'
import { loadProjectScreens } from '@/lib/screens'
import ScreenGrid from '@/components/ScreenGrid'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ScreensPage({ params }: Props) {
  const { id } = await params
  const project = getProjectById(id)
  if (!project) notFound()

  const screens = loadProjectScreens(project.rootPath)

  return <ScreenGrid screens={screens} />
}
