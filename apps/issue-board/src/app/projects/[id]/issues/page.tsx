// src/app/projects/[id]/issues/page.tsx
import ConnectionErrorBanner from '@/components/ConnectionErrorBanner'
import IssueDocsBoard from '@/components/IssueDocsBoard'
import IssueList from '@/components/IssueList'
import { fetchIssue, fetchIssues, fetchPlans, fetchSubtasks } from '@/lib/api'

export default async function IssuesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ issueId?: string; subtaskId?: string }>
}) {
  const { id } = await params
  const projectId = Number(id)
  const { issueId, subtaskId } = await searchParams

  try {
    if (issueId) {
      const issue = await fetchIssue(Number(issueId))
      const subtasks = await fetchSubtasks(issue.id)
      return (
        <IssueDocsBoard
          projectId={projectId}
          issue={issue}
          subtasks={subtasks}
          initialSubtaskId={subtaskId ? Number(subtaskId) : undefined}
        />
      )
    }

    const [issues, plans] = await Promise.all([fetchIssues(projectId), fetchPlans(projectId)])
    return <IssueList issues={issues} plans={plans} projectId={projectId} />
  } catch {
    return <ConnectionErrorBanner />
  }
}
