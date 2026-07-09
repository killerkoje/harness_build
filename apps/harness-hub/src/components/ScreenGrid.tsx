import type { ScreenItem } from '@/lib/screens'

interface Props {
  screens: ScreenItem[]
}

export default function ScreenGrid({ screens }: Props) {
  if (screens.length === 0) {
    return (
      <div className="text-center py-20 text-zinc-400">
        <p className="text-sm">등록된 화면이 없습니다.</p>
        <p className="text-xs mt-2">
          dev 파이프라인 실행 후{' '}
          <code className="bg-zinc-100 px-1 rounded">_workspace/*/02_implementation.md</code>에서
          추출됩니다.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {screens.map((screen) => (
        <div
          key={screen.id}
          className="rounded-xl border border-zinc-200 bg-white p-5 hover:border-indigo-200 hover:shadow-sm transition-all"
        >
          <div className="flex items-start justify-between gap-2 mb-3">
            <h3 className="font-semibold text-zinc-900">{screen.name}</h3>
            <span
              className={`shrink-0 text-[11px] px-2 py-0.5 rounded-md font-medium ${
                screen.status === 'implemented'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              {screen.status === 'implemented' ? '구현됨' : '계획'}
            </span>
          </div>
          {screen.route && (
            <p className="font-mono text-sm text-indigo-600 mb-2">{screen.route}</p>
          )}
          <p className="text-xs text-zinc-400 font-mono truncate">{screen.filePath}</p>
          <p className="text-xs text-zinc-400 mt-2">run: {screen.runId}</p>
        </div>
      ))}
    </div>
  )
}
