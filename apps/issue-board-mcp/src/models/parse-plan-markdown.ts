// src/models/parse-plan-markdown.ts
import type { MvpFeature, PlanSections, Priority } from '../types.js'

const PRIORITIES: Priority[] = ['높음', '보통', '낮음']

function sectionBody(md: string, headingRe: RegExp): string {
  const m = md.match(headingRe)
  if (!m || m.index === undefined) return ''
  const start = m.index + m[0].length
  const rest = md.slice(start)
  const next = rest.search(/\n##\s+\d+\./)
  return (next === -1 ? rest : rest.slice(0, next)).trim()
}

function parseMvpTable(body: string): MvpFeature[] {
  const lines = body.split('\n').map((l) => l.trim()).filter(Boolean)
  const rows: MvpFeature[] = []
  for (const line of lines) {
    if (!line.startsWith('|')) continue
    if (/^\|\s*-+/.test(line) || /우선순위/.test(line)) continue
    const cells = line
      .split('|')
      .map((c) => c.trim())
      .filter((_, i, arr) => i > 0 && i < arr.length - 1)
    if (cells.length < 3) continue
    const [priorityRaw, title, description] = cells
    const priority = (PRIORITIES.includes(priorityRaw as Priority)
      ? priorityRaw
      : '보통') as Priority
    if (!title) continue
    rows.push({ priority, title, description: description ?? '' })
  }
  return rows
}

/** 마크다운 기획서 → 이슈 생성용 sections + 원문 보관 */
export function parsePlanMarkdown(content: string): PlanSections {
  const overview = sectionBody(content, /##\s*1\.\s*[^\n]*/)
  const targetUsers = sectionBody(content, /##\s*2\.\s*[^\n]*/)
  const mvpBody = sectionBody(content, /##\s*3\.\s*[^\n]*/)
  const outOfScope = sectionBody(content, /##\s*4\.\s*[^\n]*/)
  const mvpFeatures = parseMvpTable(mvpBody)

  return {
    overview: overview || content.slice(0, 500),
    targetUsers: targetUsers || '',
    mvpFeatures,
    outOfScope: outOfScope || '',
    markdown: content,
  }
}
