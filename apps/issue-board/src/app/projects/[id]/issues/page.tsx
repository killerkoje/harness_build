// src/app/projects/[id]/issues/page.tsx
import ConnectionErrorBanner from '@/components/ConnectionErrorBanner'
import IssueList from '@/components/IssueList'
import { fetchIssues, fetchPlans } from '@/lib/api'

export default async function IssuesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const projectId = Number(id)

  try {
    const [issues, plans] = await Promise.all([fetchIssues(projectId), fetchPlans(projectId)])
    return <IssueList issues={issues} plans={plans} projectId={projectId} />
  } catch {
    return <ConnectionErrorBanner />
  }
}
