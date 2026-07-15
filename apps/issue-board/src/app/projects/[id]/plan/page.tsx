// src/app/projects/[id]/plan/page.tsx
import ConnectionErrorBanner from '@/components/ConnectionErrorBanner'
import PlanView from '@/components/PlanView'
import PlanRoundSwitcher from '@/components/PlanRoundSwitcher'
import { fetchIssues, fetchPlans } from '@/lib/api'

export default async function PlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ planId?: string }>
}) {
  const { id } = await params
  const { planId: planIdQuery } = await searchParams
  const projectId = Number(id)

  try {
    const [plans, issues] = await Promise.all([fetchPlans(projectId), fetchIssues(projectId)])

    if (plans.length === 0) {
      return (
        <p className="text-sm text-zinc-400">기획이 아직 없습니다. `/ib-plan`으로 먼저 생성하세요.</p>
      )
    }

    const requestedId = planIdQuery ? Number(planIdQuery) : null
    const selectedPlan = plans.find((p) => p.id === requestedId) ?? plans[plans.length - 1]

    return (
      <div>
        <PlanRoundSwitcher
          projectId={projectId}
          plans={plans}
          issues={issues}
          selectedPlanId={selectedPlan.id}
        />
        <PlanView plan={selectedPlan} />
      </div>
    )
  } catch {
    return <ConnectionErrorBanner />
  }
}
