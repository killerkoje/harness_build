import { notFound } from 'next/navigation'
import { getProjectById } from '@/lib/projects'
import { loadProjectIssues } from '@/lib/issues'
import IssuePanel from '@/components/IssuePanel'

interface Props {
  params: Promise<{ id: string }>
}

export default async function IssuesPage({ params }: Props) {
  const { id } = await params
  const project = getProjectById(id)
  if (!project) notFound()

  const issues = loadProjectIssues(project.rootPath)

  return <IssuePanel issues={issues} />
}
