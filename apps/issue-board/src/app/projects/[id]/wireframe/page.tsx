// src/app/projects/[id]/wireframe/page.tsx
import WireframeBoard from '@/components/WireframeBoard'
import { fetchIssue, fetchWireframe } from '@/lib/api'

export default async function WireframePage({
  searchParams,
}: {
  searchParams: Promise<{ issueId?: string }>
}) {
  const { issueId } = await searchParams
  if (!issueId) {
    return <p className="text-sm text-zinc-400">이슈 탭에서 화면을 확인할 이슈를 먼저 선택하세요.</p>
  }

  const issue = await fetchIssue(Number(issueId))
  const wireframe = await fetchWireframe(issue.id)

  return <WireframeBoard issue={issue} screens={wireframe?.screens ?? []} />
}
