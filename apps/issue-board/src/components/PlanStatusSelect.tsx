'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updatePlanStatus, type Plan } from '@/lib/api'

const OPTIONS: { value: Plan['status']; label: string }[] = [
  { value: 'draft', label: '초안' },
  { value: 'approved', label: '확정' },
]

export default function PlanStatusSelect({
  planId,
  status,
}: {
  planId: number
  status: Plan['status']
}) {
  const router = useRouter()
  const [value, setValue] = useState<Plan['status']>(status)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleChange(next: Plan['status']) {
    const prev = value
    setValue(next)
    setError(null)
    startTransition(async () => {
      try {
        await updatePlanStatus(planId, next)
        router.refresh()
      } catch {
        setValue(prev)
        setError('상태 변경에 실패했습니다')
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={value}
        disabled={isPending}
        onChange={(event) => handleChange(event.target.value as Plan['status'])}
        className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-700"
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
