// src/components/PlanView.tsx
'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Plan } from '@/lib/api'

const PRIORITY_STYLE: Record<string, string> = {
  높음: 'bg-red-50 text-red-700',
  보통: 'bg-amber-50 text-amber-700',
  낮음: 'bg-zinc-100 text-zinc-600',
}

function childText(node: React.ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(childText).join('')
  if (typeof node === 'object' && 'props' in node) {
    return childText((node as React.ReactElement<{ children?: React.ReactNode }>).props.children)
  }
  return ''
}

function Callout({ children }: { children: React.ReactNode }) {
  const text = childText(children)
  const tone = /🎯|목적/.test(text)
    ? 'border-indigo-200 bg-indigo-50/80'
    : /⚠️|범위/.test(text)
      ? 'border-amber-200 bg-amber-50/80'
      : /📝|가정|미결/.test(text)
        ? 'border-rose-200 bg-rose-50/70'
        : 'border-zinc-200 bg-zinc-50'
  return (
    <blockquote className={`my-3 rounded-lg border-l-4 px-4 py-3 text-sm leading-relaxed ${tone}`}>
      {children}
    </blockquote>
  )
}

function MarkdownPlan({ markdown }: { markdown: string }) {
  return (
    <div className="plan-md max-w-none text-sm text-zinc-800">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-xl font-semibold tracking-tight mb-4">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-semibold text-zinc-900 mt-8 mb-3 pb-1 border-b border-zinc-100">
              {children}
            </h2>
          ),
          p: ({ children }) => <p className="my-2 leading-relaxed text-zinc-700">{children}</p>,
          ul: ({ children }) => <ul className="my-2 ml-5 list-disc space-y-1 text-zinc-700">{children}</ul>,
          ol: ({ children }) => <ol className="my-2 ml-5 list-decimal space-y-1 text-zinc-700">{children}</ol>,
          strong: ({ children }) => <strong className="font-semibold text-zinc-900">{children}</strong>,
          blockquote: ({ children }) => <Callout>{children}</Callout>,
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-lg border border-zinc-200">
              <table className="w-full text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-zinc-50 text-zinc-600">{children}</thead>,
          th: ({ children }) => (
            <th className="text-left font-medium px-3 py-2 border-b border-zinc-200">{children}</th>
          ),
          td: ({ children }) => {
            const raw = String(children ?? '')
            if (PRIORITY_STYLE[raw]) {
              return (
                <td className="px-3 py-2 border-t border-zinc-100">
                  <span className={`text-xs px-2 py-0.5 rounded ${PRIORITY_STYLE[raw]}`}>{raw}</span>
                </td>
              )
            }
            return <td className="px-3 py-2 border-t border-zinc-100 align-top text-zinc-700">{children}</td>
          },
          tr: ({ children }) => <tr>{children}</tr>,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  )
}

function LegacyPlan({ plan }: { plan: Plan }) {
  return (
    <div className="space-y-6">
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

export default function PlanView({ plan }: { plan: Plan }) {
  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">{plan.title}</h1>
        <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">
          {plan.status === 'approved' ? '확정' : '초안'}
        </span>
      </div>
      {plan.sections.markdown ? (
        <MarkdownPlan markdown={plan.sections.markdown} />
      ) : (
        <LegacyPlan plan={plan} />
      )}
    </div>
  )
}
