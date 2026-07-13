// src/components/PlanView.tsx
import type { Plan } from '@/lib/api'

export default function PlanView({ plan }: { plan: Plan }) {
  const PRIORITY_STYLE: Record<string, string> = {
    높음: 'bg-red-50 text-red-700',
    보통: 'bg-amber-50 text-amber-700',
    낮음: 'bg-zinc-100 text-zinc-600',
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">{plan.title}</h1>
        <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">
          {plan.status === 'approved' ? '확정' : '초안'}
        </span>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-zinc-500 mb-1">개요</h2>
        <p className="text-sm whitespace-pre-wrap">{plan.sections.overview}</p>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-zinc-500 mb-1">타깃 사용자</h2>
        <p className="text-sm whitespace-pre-wrap">{plan.sections.targetUsers}</p>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-zinc-500 mb-2">핵심 기능 (MVP)</h2>
        <table className="w-full text-sm border border-zinc-200 rounded-lg overflow-hidden">
          <thead className="bg-zinc-50">
            <tr>
              <th className="text-left px-3 py-2">우선순위</th>
              <th className="text-left px-3 py-2">기능</th>
              <th className="text-left px-3 py-2">설명</th>
            </tr>
          </thead>
          <tbody>
            {plan.sections.mvpFeatures.map((f, i) => (
              <tr key={i} className="border-t border-zinc-100">
                <td className="px-3 py-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${PRIORITY_STYLE[f.priority]}`}>
                    {f.priority}
                  </span>
                </td>
                <td className="px-3 py-2 font-medium">{f.title}</td>
                <td className="px-3 py-2 text-zinc-600">{f.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-zinc-500 mb-1">범위 밖</h2>
        <p className="text-sm whitespace-pre-wrap text-zinc-600">{plan.sections.outOfScope}</p>
      </section>
    </div>
  )
}
