// src/app/projects/[id]/issues/page.tsx
import IssueList from '@/components/IssueList'
import { fetchIssues } from '@/lib/api'

export default async function IssuesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const projectId = Number(id)
  const issues = await fetchIssues(projectId)
  return <IssueList issues={issues} projectId={projectId} />
}
