// src/app/projects/[id]/plan/page.tsx
import ConnectionErrorBanner from '@/components/ConnectionErrorBanner'
import PlanView from '@/components/PlanView'
import { fetchPlan } from '@/lib/api'

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ planId?: string }>
}) {
  const { planId } = await searchParams
  if (!planId) {
    return <p className="text-sm text-zinc-400">기획이 아직 없습니다. `/ib-plan`으로 먼저 생성하세요.</p>
  }

  try {
    const plan = await fetchPlan(Number(planId))
    return <PlanView plan={plan} />
  } catch {
    return <ConnectionErrorBanner />
  }
}
