// src/app/projects/[id]/design-system/page.tsx
import ConnectionErrorBanner from '@/components/ConnectionErrorBanner'
import DesignSystemView from '@/components/DesignSystemView'
import { fetchDesignSystem } from '@/lib/api'

export default async function DesignSystemPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const projectId = Number(id)

  try {
    const ds = await fetchDesignSystem(projectId)
    if (!ds) {
      return (
        <p className="text-sm text-zinc-400">
          디자인 시스템이 없습니다. fixtures의 tokens를 시드하거나 MCP{' '}
          <code className="text-xs bg-zinc-100 px-1 rounded">upsert_design_system</code>으로
          등록하세요.
        </p>
      )
    }
    return <DesignSystemView ds={ds} />
  } catch {
    return <ConnectionErrorBanner />
  }
}
