// src/app/projects/[id]/wireframe/page.tsx
import ConnectionErrorBanner from '@/components/ConnectionErrorBanner'
import WireframeBoard from '@/components/WireframeBoard'
import WireframeList from '@/components/WireframeList'
import { fetchIssue, fetchWireframe, fetchWireframesByProject } from '@/lib/api'

export default async function WireframePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ issueId?: string }>
}) {
  const { id } = await params
  const projectId = Number(id)
  const { issueId } = await searchParams

  try {
    if (!issueId) {
      const wireframes = await fetchWireframesByProject(projectId)
      return <WireframeList projectId={projectId} wireframes={wireframes} />
    }

    const issue = await fetchIssue(Number(issueId))
    const wireframe = await fetchWireframe(issue.id)
    return <WireframeBoard issue={issue} screens={wireframe?.screens ?? []} />
  } catch {
    return <ConnectionErrorBanner />
  }
}
