'use client'

import { useState } from 'react'
import type { WireframeScreen } from '@/lib/api'

export default function ScreenPreview({ screens }: { screens: WireframeScreen[] }) {
  const [index, setIndex] = useState(0)
  const screen = screens[index] ?? screens[0]
  if (!screen) return null

  return (
    <div className="flex flex-col gap-3 sm:gap-4 w-full min-w-0">
      {screens.length > 1 && (
        <div
          className="-mx-1 px-1 flex gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="화면 목록"
        >
          {screens.map((s, i) => {
            const active = i === index
            return (
              <button
                key={`${s.name}-${i}`}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setIndex(i)}
                className={`shrink-0 text-[11px] sm:text-xs px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-zinc-900 text-white border-zinc-900'
                    : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'
                }`}
              >
                {s.name}
              </button>
            )
          })}
        </div>
      )}

      <div className="flex items-baseline justify-between gap-3 px-0.5 min-w-0">
        <h3 className="text-sm font-semibold text-zinc-800 truncate">{screen.name}</h3>
        {screen.route && (
          <span className="text-[10px] sm:text-[11px] font-mono text-zinc-400 shrink-0 truncate max-w-[45%]">
            {screen.route}
          </span>
        )}
      </div>

      <div className="w-full rounded-xl border border-zinc-200 shadow-sm overflow-hidden bg-white">
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-zinc-100 bg-zinc-50">
          <span className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
          <span className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
          <span className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
          {screen.route && (
            <span className="ml-2 text-[11px] font-mono text-zinc-400 truncate">{screen.route}</span>
          )}
        </div>
        <iframe
          key={`${screen.name}-${index}`}
          title={screen.name}
          srcDoc={screen.html}
          sandbox="allow-scripts"
          className="w-full h-[70vh] min-h-[420px] border-0 bg-white"
        />
      </div>
    </div>
  )
}
