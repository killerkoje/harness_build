// src/app/projects/[id]/wireframe/page.tsx
import ConnectionErrorBanner from '@/components/ConnectionErrorBanner'
import WireframeBoard from '@/components/WireframeBoard'
import { fetchDesignSystem, fetchIssue, fetchWireframe } from '@/lib/api'

export default async function WireframePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ issueId?: string }>
}) {
  const { id } = await params
  const { issueId } = await searchParams
  if (!issueId) {
    return <p className="text-sm text-zinc-400">이슈 탭에서 화면을 확인할 이슈를 먼저 선택하세요.</p>
  }

  try {
    const issue = await fetchIssue(Number(issueId))
    const [wireframe, ds] = await Promise.all([
      fetchWireframe(issue.id),
      fetchDesignSystem(Number(id)),
    ])
    return (
      <WireframeBoard
        issue={issue}
        screens={wireframe?.screens ?? []}
        tokens={ds?.tokens ?? null}
      />
    )
  } catch {
    return <ConnectionErrorBanner />
  }
}
