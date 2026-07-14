// src/app/projects/[id]/plan/page.tsx
import ConnectionErrorBanner from '@/components/ConnectionErrorBanner'
import PlanView from '@/components/PlanView'
import { fetchIssues, fetchPlan, fetchLatestPlan } from '@/lib/api'

export default async function PlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ planId?: string }>
}) {
  const { id } = await params
  const { planId: planIdQuery } = await searchParams

  try {
    let planId = planIdQuery ? Number(planIdQuery) : null
    if (!planId) {
      const issues = await fetchIssues(Number(id))
      planId = issues.find((i) => i.planId != null)?.planId ?? null
    }
    if (!planId) {
      // No issues yet (plan is still draft, pre-approval) — fall back to the
      // project's most recently updated plan instead of reporting "none".
      const latest = await fetchLatestPlan(Number(id))
      if (!latest) {
        return (
          <p className="text-sm text-zinc-400">기획이 아직 없습니다. `/ib-plan`으로 먼저 생성하세요.</p>
        )
      }
      return <PlanView plan={latest} />
    }
    const plan = await fetchPlan(planId)
    return <PlanView plan={plan} />
  } catch {
    return <ConnectionErrorBanner />
  }
}
