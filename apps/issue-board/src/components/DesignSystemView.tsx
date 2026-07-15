// src/components/DesignSystemView.tsx
import type { DesignSystem } from '@/lib/api'

function flattenColors(
  node: unknown,
  prefix = ''
): { key: string; value: string }[] {
  if (typeof node === 'string') return [{ key: prefix, value: node }]
  if (!node || typeof node !== 'object' || Array.isArray(node)) return []
  return Object.entries(node as Record<string, unknown>).flatMap(([k, v]) =>
    flattenColors(v, prefix ? `${prefix}.${k}` : k)
  )
}

export default function DesignSystemView({ ds }: { ds: DesignSystem }) {
  const brandColors = flattenColors((ds.tokens as any)?.color?.brand ?? {})
  const semanticColors = flattenColors((ds.tokens as any)?.color?.semantic ?? {}).slice(0, 6)

  return (
    <div className="max-w-4xl space-y-8">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold">{ds.name}</h1>
          <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">v{ds.version}</span>
        </div>
        <p className="text-sm text-zinc-600">
          Turborepo DS 패키지{' '}
          <code className="text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded text-xs">
            {ds.packageName}
          </code>
          {' · '}
          Storybook{' '}
          <code className="text-xs bg-zinc-100 px-1.5 py-0.5 rounded">{ds.storybookPath}</code>
        </p>
        <p className="text-xs text-zinc-400">
          참조:{' '}
          <a
            href="https://github.com/vercel/turborepo/tree/main/examples/design-system"
            className="text-indigo-600 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            vercel/turborepo design-system
          </a>
          {' — '}
          <code className="bg-zinc-100 px-1 rounded">packages/ui</code> +{' '}
          <code className="bg-zinc-100 px-1 rounded">apps/docs</code>
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-500">컬러 토큰</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...brandColors, ...semanticColors].map((c) => (
            <div key={c.key} className="border border-zinc-200 rounded-lg overflow-hidden">
              <div className="h-14" style={{ background: c.value }} />
              <div className="px-2 py-1.5 space-y-0.5">
                <p className="text-[11px] font-mono text-zinc-500 truncate">{c.key}</p>
                <p className="text-xs font-medium">{c.value}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
