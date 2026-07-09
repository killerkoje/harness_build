import { notFound } from 'next/navigation'
import { getProjectById } from '@/lib/projects'
import { loadProjectPatterns } from '@/lib/patterns'
import PatternPanel from '@/components/PatternPanel'

interface Props {
  params: Promise<{ id: string }>
}

export default async function PatternsPage({ params }: Props) {
  const { id } = await params
  const project = getProjectById(id)
  if (!project) notFound()

  const categories = loadProjectPatterns(project.rootPath)

  return <PatternPanel categories={categories} />
}
