// src/components/PlanRoundSwitcher.tsx
import type { Issue, Plan } from '@/lib/api'
import { planIssueProgress, roundLabel } from '@/lib/plan-rounds'

export default function PlanRoundSwitcher({
  projectId,
  plans,
  issues,
  selectedPlanId,
}: {
  projectId: number
  plans: Plan[]
  issues: Issue[]
  selectedPlanId: number
}) {
  if (plans.length <= 1) return null

  return (
    <nav className="flex flex-wrap gap-2 mb-4">
      {plans.map((plan, index) => {
        const isActive = plan.id === selectedPlanId
        const progress = planIssueProgress(plan.id, issues)
        return (
          <a
            key={plan.id}
            href={`/projects/${projectId}/plan?planId=${plan.id}`}
            className={`text-xs px-3 py-1.5 rounded-full border ${
              isActive
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-medium'
                : 'border-zinc-200 text-zinc-500 hover:text-zinc-800'
            }`}
          >
            {roundLabel(index)}
            <span className="ml-1.5 text-[10px] opacity-70">
              {plan.status === 'approved' ? '확정' : '초안'}
              {progress ? ` · 이슈 ${progress.done}/${progress.total} 완료` : ''}
            </span>
          </a>
        )
      })}
    </nav>
  )
}
