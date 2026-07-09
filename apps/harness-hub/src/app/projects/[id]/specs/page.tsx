import { notFound } from 'next/navigation'
import { getProjectById } from '@/lib/projects'
import { loadProjectSpecs } from '@/lib/specs'
import SpecViewer from '@/components/SpecViewer'

interface Props {
  params: Promise<{ id: string }>
}

export default async function SpecsPage({ params }: Props) {
  const { id } = await params
  const project = getProjectById(id)
  if (!project) notFound()

  const specs = loadProjectSpecs(project.rootPath)

  return <SpecViewer specs={specs} />
}
