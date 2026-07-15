# 기획 라운드(N차기획) & 이슈 차수 필터 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 프로젝트당 여러 기획(라운드)을 만들고 대시보드에서 라운드별로 전환/필터링할 수 있게 한다 — `1차기획 → 개발 → 2차기획 → 개발 → ...` 흐름을 지원.

**Architecture:** 차수는 DB에 저장하지 않고 `plans.id ASC` 순서(생성 순서)로 계산한다. 백엔드에 프로젝트의 전체 기획을 반환하는 엔드포인트 하나만 추가하고, 나머지는 프론트엔드(기획 탭 라운드 스위처, 이슈 탭 차수 필터/배지)와 `/ib-plan` 커맨드 문서 변경으로 구현한다.

**Tech Stack:** `apps/issue-board-mcp`(Node/TS, better-sqlite3, express, vitest) + `apps/issue-board`(Next.js 15, React 19, vitest).

**참고 문서:** `docs/specs/2026-07-15-plan-rounds-design.md`

---

## 파일 구조

| 파일 | 역할 |
|---|---|
| `apps/issue-board-mcp/src/models/plans.ts` | (수정) `listPlansByProject` 추가 |
| `apps/issue-board-mcp/src/models/plans.test.ts` | (수정) 위 함수 테스트 |
| `apps/issue-board-mcp/src/rest/app.ts` | (수정) `GET /api/projects/:projectId/plans` 라우트 추가 |
| `apps/issue-board-mcp/src/rest/app.test.ts` | (수정) 위 라우트 테스트 |
| `apps/issue-board/src/lib/api.ts` | (수정) `fetchPlans` 추가 |
| `apps/issue-board/src/lib/api.test.ts` | (수정) 위 함수 테스트 |
| `apps/issue-board/src/lib/plan-rounds.ts` | (신규) 차수 계산 순수 함수 (`roundLabel`, `roundShortLabel`, `roundIndexOf`, `planIssueProgress`) |
| `apps/issue-board/src/lib/plan-rounds.test.ts` | (신규) 위 함수들 테스트 |
| `apps/issue-board/src/components/PlanRoundSwitcher.tsx` | (신규) 기획 탭 라운드 선택 칩 |
| `apps/issue-board/src/app/projects/[id]/plan/page.tsx` | (수정) `fetchPlans` 기반으로 재작성, 스위처 렌더 |
| `apps/issue-board/src/components/IssueList.tsx` | (수정) 차수 필터 드롭다운 + 이슈별 라운드 배지 |
| `apps/issue-board/src/app/projects/[id]/issues/page.tsx` | (수정) `fetchPlans` 호출해 `IssueList`에 전달 |
| `harness_global/.claude/commands/ib-plan.md` | (수정) 새 라운드 시작 시 직전 라운드 완료 상태·범위밖 항목 참고 안내 추가 |

---

## Task 1: 백엔드 모델 — `listPlansByProject`

**Files:**
- Modify: `apps/issue-board-mcp/src/models/plans.ts`
- Test: `apps/issue-board-mcp/src/models/plans.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/issue-board-mcp/src/models/plans.test.ts`의 import 목록에 `listPlansByProject`를 추가하고, 파일 끝(`describe` 블록 안, 마지막 `it` 다음)에 아래 두 테스트를 추가한다:

```ts
import {
  createPlan,
  updatePlanSections,
  approvePlan,
  snapshotPlan,
  getPlan,
  listSnapshots,
  listPlansByProject,
  approvePlanAndCreateIssues,
} from './plans.js'
```

```ts
  it('listPlansByProject returns all plans for a project ordered by creation (id ASC)', () => {
    const p1 = createPlan(db, projectId, '1차', sections)
    const p2 = createPlan(db, projectId, '2차', sections)
    expect(listPlansByProject(db, projectId).map((p) => p.id)).toEqual([p1.id, p2.id])
  })

  it('listPlansByProject returns an empty array for a project with no plans', () => {
    expect(listPlansByProject(db, projectId)).toEqual([])
  })
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `cd apps/issue-board-mcp && npm test -- plans.test.ts`
Expected: FAIL — `listPlansByProject` is not exported / not defined

- [ ] **Step 3: 구현**

`apps/issue-board-mcp/src/models/plans.ts`의 `getLatestPlanForProject` 함수(76~81번 줄) 바로 뒤에 추가:

```ts
export function listPlansByProject(db: Database.Database, projectId: number): Plan[] {
  const rows = db
    .prepare('SELECT * FROM plans WHERE project_id = ? ORDER BY id ASC')
    .all(projectId) as any[]
  return rows.map(rowToPlan)
}
```

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `cd apps/issue-board-mcp && npm test -- plans.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: 커밋**

```bash
git add apps/issue-board-mcp/src/models/plans.ts apps/issue-board-mcp/src/models/plans.test.ts
git commit -m "feat(issue-board-mcp): add listPlansByProject model function"
```

---

## Task 2: 백엔드 REST — `GET /api/projects/:projectId/plans`

**Files:**
- Modify: `apps/issue-board-mcp/src/rest/app.ts`
- Test: `apps/issue-board-mcp/src/rest/app.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/issue-board-mcp/src/rest/app.test.ts`의 마지막 `it` 블록(`'PUT design-system with a non-array components field is rejected'`, 파일 끝부분) 뒤, `describe` 블록을 닫는 마지막 `})` 바로 앞에 추가:

```ts
  it('GET /api/projects/:projectId/plans lists all plans for a project in creation order', async () => {
    const project = (await request(app).post('/api/projects').send({ rootPath: projectRoot })).body
    const planBody = {
      sections: { overview: 'o', targetUsers: 't', mvpFeatures: [], outOfScope: 'x' },
    }
    const p1 = (
      await request(app).post(`/api/projects/${project.id}/plans`).send({ ...planBody, title: '1차' })
    ).body
    const p2 = (
      await request(app).post(`/api/projects/${project.id}/plans`).send({ ...planBody, title: '2차' })
    ).body

    const res = await request(app).get(`/api/projects/${project.id}/plans`)
    expect(res.status).toBe(200)
    expect(res.body.map((p: { id: number }) => p.id)).toEqual([p1.id, p2.id])
  })

  it('GET /api/projects/:projectId/plans returns an empty array for a project with no plans', async () => {
    const project = (await request(app).post('/api/projects').send({ rootPath: projectRoot })).body
    const res = await request(app).get(`/api/projects/${project.id}/plans`)
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `cd apps/issue-board-mcp && npm test -- app.test.ts`
Expected: FAIL — 404 (route not found) instead of 200

- [ ] **Step 3: 구현**

`apps/issue-board-mcp/src/rest/app.ts`의 import 블록(12~19번 줄)을 수정해 `listPlansByProject`를 추가:

```ts
import {
  createPlan,
  createPlanFromMarkdown,
  getPlan,
  getLatestPlanForProject,
  listPlansByProject,
  approvePlanAndCreateIssues,
  syncIssuesFromPlan,
} from '../models/plans.js'
```

`app.get('/api/projects/:projectId/plans/latest', ...)` 라우트(95~99번 줄) 바로 뒤에 새 라우트 추가:

```ts
  app.get('/api/projects/:projectId/plans', (req, res) => {
    res.json(listPlansByProject(db, Number(req.params.projectId)))
  })
```

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `cd apps/issue-board-mcp && npm test -- app.test.ts`
Expected: PASS (전체 통과)

- [ ] **Step 5: 커밋**

```bash
git add apps/issue-board-mcp/src/rest/app.ts apps/issue-board-mcp/src/rest/app.test.ts
git commit -m "feat(issue-board-mcp): add GET /api/projects/:projectId/plans endpoint"
```

---

## Task 3: 프론트엔드 API 클라이언트 — `fetchPlans`

**Files:**
- Modify: `apps/issue-board/src/lib/api.ts`
- Test: `apps/issue-board/src/lib/api.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/issue-board/src/lib/api.test.ts`의 import 줄을 수정:

```ts
import { fetchIssues, approveIssue, fetchProjects, deleteProject, fetchPlans } from './api.js'
```

`describe` 블록 안, 마지막 `it` 다음에 추가:

```ts
  it('fetchPlans calls GET /api/projects/:id/plans and returns parsed json', async () => {
    ;(fetch as any).mockResolvedValue({ ok: true, json: async () => [{ id: 1, title: 'p1' }] })
    const plans = await fetchPlans(42)
    expect(fetch).toHaveBeenCalledWith('http://localhost:4000/api/projects/42/plans')
    expect(plans).toEqual([{ id: 1, title: 'p1' }])
  })
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `cd apps/issue-board && npx vitest run src/lib/api.test.ts`
Expected: FAIL — `fetchPlans` is not exported / not a function

- [ ] **Step 3: 구현**

`apps/issue-board/src/lib/api.ts`의 `fetchLatestPlan` 함수(110~114번 줄) 바로 뒤에 추가:

```ts
export async function fetchPlans(projectId: number): Promise<Plan[]> {
  return json(await fetch(`${BASE_URL}/api/projects/${projectId}/plans`))
}
```

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `cd apps/issue-board && npx vitest run src/lib/api.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add apps/issue-board/src/lib/api.ts apps/issue-board/src/lib/api.test.ts
git commit -m "feat(issue-board): add fetchPlans API client function"
```

---

## Task 4: 차수 계산 순수 함수 — `plan-rounds.ts`

**Files:**
- Create: `apps/issue-board/src/lib/plan-rounds.ts`
- Test: `apps/issue-board/src/lib/plan-rounds.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/issue-board/src/lib/plan-rounds.test.ts` 새로 작성:

```ts
// src/lib/plan-rounds.test.ts
import { describe, it, expect } from 'vitest'
import { roundLabel, roundShortLabel, roundIndexOf, planIssueProgress } from './plan-rounds.js'
import type { Plan, Issue } from './api.js'

function makePlan(id: number): Plan {
  return {
    id,
    projectId: 1,
    title: `plan-${id}`,
    status: 'draft',
    sections: { overview: '', targetUsers: '', mvpFeatures: [], outOfScope: '' },
  }
}

function makeIssue(id: number, planId: number | null, status: Issue['status']): Issue {
  return {
    id,
    projectId: 1,
    number: id,
    planId,
    title: `issue-${id}`,
    priority: '보통',
    description: '',
    status,
    notionPageId: null,
    notionStatus: null,
  }
}

describe('plan-rounds', () => {
  it('roundLabel numbers rounds starting from 1', () => {
    expect(roundLabel(0)).toBe('1차기획')
    expect(roundLabel(2)).toBe('3차기획')
  })

  it('roundShortLabel numbers rounds starting from 1', () => {
    expect(roundShortLabel(0)).toBe('1차')
    expect(roundShortLabel(1)).toBe('2차')
  })

  it('roundIndexOf finds a plan position by id', () => {
    const plans = [makePlan(10), makePlan(20), makePlan(30)]
    expect(roundIndexOf(plans, 20)).toBe(1)
  })

  it('roundIndexOf returns -1 for an unknown or null planId', () => {
    const plans = [makePlan(10)]
    expect(roundIndexOf(plans, 999)).toBe(-1)
    expect(roundIndexOf(plans, null)).toBe(-1)
  })

  it('planIssueProgress counts dev_approved and done issues as complete', () => {
    const issues = [
      makeIssue(1, 10, 'planned'),
      makeIssue(2, 10, 'dev_approved'),
      makeIssue(3, 10, 'done'),
      makeIssue(4, 20, 'planned'),
    ]
    expect(planIssueProgress(10, issues)).toEqual({ done: 2, total: 3 })
  })

  it('planIssueProgress returns null when the plan has no issues', () => {
    expect(planIssueProgress(999, [])).toBeNull()
  })
})
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `cd apps/issue-board && npx vitest run src/lib/plan-rounds.test.ts`
Expected: FAIL — `Cannot find module './plan-rounds.js'`

- [ ] **Step 3: 구현**

`apps/issue-board/src/lib/plan-rounds.ts` 새로 작성:

```ts
// src/lib/plan-rounds.ts
import type { Issue, Plan } from './api'

/** plans는 생성 순서(id ASC)로 정렬돼 있다고 가정 — fetchPlans가 이를 보장한다. */
export function roundLabel(index: number): string {
  return `${index + 1}차기획`
}

export function roundShortLabel(index: number): string {
  return `${index + 1}차`
}

export function roundIndexOf(plans: Plan[], planId: number | null): number {
  if (planId == null) return -1
  return plans.findIndex((p) => p.id === planId)
}

export function planIssueProgress(
  planId: number,
  issues: Issue[]
): { done: number; total: number } | null {
  const planIssues = issues.filter((i) => i.planId === planId)
  if (planIssues.length === 0) return null
  const done = planIssues.filter((i) => i.status === 'dev_approved' || i.status === 'done').length
  return { done, total: planIssues.length }
}
```

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `cd apps/issue-board && npx vitest run src/lib/plan-rounds.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: 커밋**

```bash
git add apps/issue-board/src/lib/plan-rounds.ts apps/issue-board/src/lib/plan-rounds.test.ts
git commit -m "feat(issue-board): add plan-rounds helpers for round labeling and progress"
```

---

## Task 5: 기획 탭 라운드 스위처 컴포넌트

**Files:**
- Create: `apps/issue-board/src/components/PlanRoundSwitcher.tsx`

이 컴포넌트는 순수 링크 네비게이션(`<a href="?planId=...">`)만 사용해 인터랙션이 없으므로 `'use client'`가 필요 없다. 이 리포는 React 컴포넌트에 자동화 테스트를 두지 않는 관례라(기존 `PlanView.tsx`/`IssueList.tsx`도 테스트 없음), Task 9에서 브라우저로 수동 검증한다.

- [ ] **Step 1: 구현**

`apps/issue-board/src/components/PlanRoundSwitcher.tsx` 새로 작성:

```tsx
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
```

- [ ] **Step 2: 타입체크**

Run: `cd apps/issue-board && npx tsc --noEmit`
Expected: 에러 없음 (Task 6에서 `PlanView` 등 다른 참조가 아직 안 맞을 수 있으니, 이 타입체크는 Task 6 완료 후에 다시 한번 돌려도 된다 — 지금은 이 파일 자체에 문법/타입 오류가 없는지만 눈으로 확인해도 무방)

- [ ] **Step 3: 커밋**

```bash
git add apps/issue-board/src/components/PlanRoundSwitcher.tsx
git commit -m "feat(issue-board): add PlanRoundSwitcher component"
```

---

## Task 6: 기획 탭 페이지 재작성

**Files:**
- Modify: `apps/issue-board/src/app/projects/[id]/plan/page.tsx`

- [ ] **Step 1: 구현**

`apps/issue-board/src/app/projects/[id]/plan/page.tsx` 전체를 아래로 교체:

```tsx
// src/app/projects/[id]/plan/page.tsx
import ConnectionErrorBanner from '@/components/ConnectionErrorBanner'
import PlanView from '@/components/PlanView'
import PlanRoundSwitcher from '@/components/PlanRoundSwitcher'
import { fetchIssues, fetchPlans } from '@/lib/api'

export default async function PlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ planId?: string }>
}) {
  const { id } = await params
  const { planId: planIdQuery } = await searchParams
  const projectId = Number(id)

  try {
    const [plans, issues] = await Promise.all([fetchPlans(projectId), fetchIssues(projectId)])

    if (plans.length === 0) {
      return (
        <p className="text-sm text-zinc-400">기획이 아직 없습니다. `/ib-plan`으로 먼저 생성하세요.</p>
      )
    }

    const requestedId = planIdQuery ? Number(planIdQuery) : null
    const selectedPlan = plans.find((p) => p.id === requestedId) ?? plans[plans.length - 1]

    return (
      <div>
        <PlanRoundSwitcher
          projectId={projectId}
          plans={plans}
          issues={issues}
          selectedPlanId={selectedPlan.id}
        />
        <PlanView plan={selectedPlan} />
      </div>
    )
  } catch {
    return <ConnectionErrorBanner />
  }
}
```

이 페이지는 더 이상 `fetchPlan`/`fetchLatestPlan`을 쓰지 않는다 (기획 목록 전체를 `fetchPlans`로 한 번에 가져와 그 안에서 원하는 걸 고른다). `fetchPlan`/`fetchLatestPlan` 자체와 그 뒤의 REST 라우트(`GET /api/plans/:id`, `GET /api/projects/:projectId/plans/latest`)는 이번 스펙 범위 밖이라 그대로 둔다 — 지우지 않는다.

- [ ] **Step 2: 타입체크**

Run: `cd apps/issue-board && npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add apps/issue-board/src/app/projects/[id]/plan/page.tsx
git commit -m "feat(issue-board): render plan round switcher on the plan tab"
```

---

## Task 7: 이슈 탭 — 차수 필터 & 라운드 배지

**Files:**
- Modify: `apps/issue-board/src/components/IssueList.tsx`

- [ ] **Step 1: 구현**

`apps/issue-board/src/components/IssueList.tsx` 전체를 아래로 교체:

```tsx
// src/components/IssueList.tsx
'use client'

import { useMemo, useState } from 'react'
import {
  NOTION_STATUS_OPTIONS,
  setIssueNotionStatus,
  type Issue,
  type NotionStatus,
  type Plan,
} from '@/lib/api'
import { roundIndexOf, roundLabel, roundShortLabel } from '@/lib/plan-rounds'

const STATUS_LABEL: Record<Issue['status'], string> = {
  planned: '기획됨',
  wireframed: '와이어프레임 완료',
  dev_approved: '개발 승인됨',
  done: '완료',
}

const STATUS_STYLE: Record<Issue['status'], string> = {
  planned: 'bg-zinc-100 text-zinc-600',
  wireframed: 'bg-blue-50 text-blue-700',
  dev_approved: 'bg-emerald-50 text-emerald-700',
  done: 'bg-indigo-50 text-indigo-700',
}

export default function IssueList({
  issues,
  plans,
  projectId,
}: {
  issues: Issue[]
  plans: Plan[]
  projectId: number
}) {
  const [items, setItems] = useState(issues)
  const [error, setError] = useState<string | null>(null)
  const [roundFilter, setRoundFilter] = useState<number | 'all'>('all')

  const filteredItems = useMemo(
    () => (roundFilter === 'all' ? items : items.filter((i) => i.planId === roundFilter)),
    [items, roundFilter]
  )

  if (items.length === 0) {
    return <p className="text-sm text-zinc-400">이슈가 없습니다. 기획을 먼저 확정하세요.</p>
  }

  async function handleNotionStatusChange(issueId: number, value: string) {
    const notionStatus = (value || null) as NotionStatus | null
    setError(null)
    try {
      const updated = await setIssueNotionStatus(issueId, notionStatus)
      setItems((prev) => prev.map((i) => (i.id === issueId ? updated : i)))
    } catch {
      setError('Notion 상태 변경에 실패했습니다. 잠시 후 다시 시도하세요.')
    }
  }

  return (
    <div className="max-w-2xl">
      {plans.length > 1 && (
        <label className="block text-xs text-zinc-500 mb-3">
          기획 차수
          <select
            className="ml-2 text-xs border border-zinc-200 rounded px-2 py-1 text-zinc-700"
            value={roundFilter}
            onChange={(e) => setRoundFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          >
            <option value="all">전체</option>
            {plans.map((plan, index) => (
              <option key={plan.id} value={plan.id}>
                {roundLabel(index)}
              </option>
            ))}
          </select>
        </label>
      )}
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      {filteredItems.length === 0 ? (
        <p className="text-sm text-zinc-400">해당 차수의 이슈가 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {filteredItems.map((issue) => {
            const roundIndex = roundIndexOf(plans, issue.planId)
            return (
              <li key={issue.id} className="border border-zinc-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-sm text-indigo-700">#{issue.number}</span>
                  {roundIndex >= 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500">
                      {roundShortLabel(roundIndex)}
                    </span>
                  )}
                  <span className="font-medium text-sm flex-1">{issue.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${STATUS_STYLE[issue.status]}`}>
                    {STATUS_LABEL[issue.status]}
                  </span>
                </div>
                <p className="text-xs text-zinc-500">{issue.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <a
                    href={`/projects/${projectId}/wireframe?issueId=${issue.id}`}
                    className="text-xs text-indigo-600"
                  >
                    와이어프레임 보기 →
                  </a>
                  <label className="text-xs text-zinc-400 ml-auto">
                    Notion 상태
                    <select
                      className="ml-1 text-xs border border-zinc-200 rounded px-1 py-0.5 text-zinc-700"
                      value={issue.notionStatus ?? ''}
                      onChange={(e) => handleNotionStatusChange(issue.id, e.target.value)}
                    >
                      <option value="">자동 ({STATUS_LABEL[issue.status]} 기준)</option>
                      {NOTION_STATUS_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 타입체크**

Run: `cd apps/issue-board && npx tsc --noEmit`
Expected: `issues/page.tsx`가 아직 `plans` prop을 안 넘기고 있어 에러가 날 수 있다 — Task 8까지 마친 뒤 다시 실행해 확인한다 (지금은 이 파일 자체 문법 확인만)

- [ ] **Step 3: 커밋**

```bash
git add apps/issue-board/src/components/IssueList.tsx
git commit -m "feat(issue-board): add round filter dropdown and round badge to issue list"
```

---

## Task 8: 이슈 탭 페이지 — 기획 목록 전달

**Files:**
- Modify: `apps/issue-board/src/app/projects/[id]/issues/page.tsx`

- [ ] **Step 1: 구현**

`apps/issue-board/src/app/projects/[id]/issues/page.tsx` 전체를 아래로 교체:

```tsx
// src/app/projects/[id]/issues/page.tsx
import ConnectionErrorBanner from '@/components/ConnectionErrorBanner'
import IssueList from '@/components/IssueList'
import { fetchIssues, fetchPlans } from '@/lib/api'

export default async function IssuesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const projectId = Number(id)

  try {
    const [issues, plans] = await Promise.all([fetchIssues(projectId), fetchPlans(projectId)])
    return <IssueList issues={issues} plans={plans} projectId={projectId} />
  } catch {
    return <ConnectionErrorBanner />
  }
}
```

- [ ] **Step 2: 전체 타입체크**

Run: `cd apps/issue-board && npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: 전체 프론트엔드 테스트 실행**

Run: `cd apps/issue-board && npx vitest run`
Expected: 전체 PASS

- [ ] **Step 4: 커밋**

```bash
git add apps/issue-board/src/app/projects/[id]/issues/page.tsx
git commit -m "feat(issue-board): pass plan list to issue list for round filtering"
```

---

## Task 9: `/ib-plan` 커맨드 — 라운드 인지

**Files:**
- Modify: `harness_global/.claude/commands/ib-plan.md`

- [ ] **Step 1: "보드에 적재" 1번 항목 확장**

`harness_global/.claude/commands/ib-plan.md`에서 (현재 92~96번 줄 부근) 아래 텍스트를:

```
1. 먼저 `get_project_context(repoPath=<현재 작업 디렉토리 절대경로>)`로 이미 등록된
   프로젝트·기획이 있는지 확인한다.
2. 프로젝트가 없으면 `create_project(name, description, repoPath=<cwd 절대경로>)`.
```

아래로 교체:

```
1. 먼저 `get_project_context(repoPath=<현재 작업 디렉토리 절대경로>)`로 이미 등록된
   프로젝트·기획이 있는지 확인한다. 응답의 `plans`는 이 프로젝트의 기획 전체를
   최신순(id 내림차순)으로 담고 있다 — `plans[0]`이 가장 최근 라운드다.

   - **`plans`가 비어있지 않다면** (이미 이전 라운드가 있다면), 새 기획을 쓰기 전에:
     - `plans[0]`에 연결된 이슈(`issues.filter(i => i.planId === plans[0].id)`)가
       전부 `dev_approved` 또는 `done`이 아니면, 새 라운드 생성을 막지 말고
       "직전 라운드가 아직 진행 중인데 새 라운드를 시작할까요?"라고
       `AskUserQuestion`으로 확인만 한다.
     - `plans[0].sections.outOfScope`를 확인해, 이번 라운드에 포함할 만한 항목이
       있으면 아래 §2 "명확화 질문" 단계에서 후보로 제시한다 (예: "1차 범위 밖에
       있던 A, B, C 중 이번에 포함할 게 있나요?"). 전부 가져올 필요는 없다 —
       참고 자료일 뿐이며 최종 판단은 사용자가 한다.
2. 프로젝트가 없으면 `create_project(name, description, repoPath=<cwd 절대경로>)`.
```

- [ ] **Step 2: "기획 적재" 3번 항목의 "새 기획" 불릿 확장**

같은 파일에서 아래 텍스트를:

```
   - **새 기획**(해당 주제의 기획이 아직 없음): `create_plan(projectId, title, content)`.
     - `content`에는 **위 마크다운 전문**을 넣는다 (서버가 §3 MVP 표를 파싱해 이슈 단위로 쓴다).
```

아래로 교체:

```
   - **새 기획**(해당 주제의 기획이 아직 없거나, 이전 라운드 개발이 끝나 다음
     라운드를 시작하는 경우): `create_plan(projectId, title, content)`.
     - `content`에는 **위 마크다운 전문**을 넣는다 (서버가 §3 MVP 표를 파싱해 이슈 단위로 쓴다).
     - **차수(1차/2차/3차...)는 title에 적을 필요 없다** — 대시보드가 기획 생성
       순서를 기준으로 자동 계산해 보여준다.
```

- [ ] **Step 3: 육안 검토**

`harness_global/.claude/commands/ib-plan.md` 전체를 다시 읽어 번호 매김(`1)`~`5)`, 하위 `1.`~`4.`)이 깨지지 않았는지, 마크다운 들여쓰기가 일관적인지 확인한다.

- [ ] **Step 4: 커밋**

```bash
git add harness_global/.claude/commands/ib-plan.md
git commit -m "docs(ib-plan): reference prior round progress and out-of-scope items when starting a new round"
```

---

## Task 10: 수동 브라우저 검증

**Files:** 없음 (검증 전용)

- [ ] **Step 1: 서버 기동**

Run: `npm run start:all` (repo root) — 또는 `apps/issue-board-mcp`에서 `npm run dev`, `apps/issue-board`에서 `npm run dev`를 각각 별도 터미널로 실행

- [ ] **Step 2: 라운드 1개 상태 확인 (기존 동작 유지 확인)**

기획이 1개뿐인 기존 프로젝트를 대시보드(`http://localhost:5173`)에서 열어 기획 탭에 라운드 스위처가 보이지 않는지, 이슈 탭에 차수 드롭다운이 보이지 않는지 확인한다 (플랜이 1개면 숨김 처리되어야 함).

- [ ] **Step 3: 2차 라운드 생성 후 확인**

같은 프로젝트에 `POST http://localhost:4000/api/projects/:projectId/plans`로 두 번째 기획을 만들고(또는 `/ib-plan`을 실행해) 승인까지 진행한 뒤:
- 기획 탭: `1차기획`/`2차기획` 칩이 보이고, 기본 선택이 2차인지, 칩을 클릭하면 해당 기획 내용으로 바뀌는지, 확정된 라운드에 `이슈 N/M 완료` 배지가 뜨는지 확인
- 이슈 탭: 차수 드롭다운이 나타나고, `1차기획`/`2차기획`을 선택하면 해당 라운드 이슈만 남는지, `전체`로 돌아오면 모든 이슈에 `1차`/`2차` 배지가 붙어 있는지 확인

- [ ] **Step 4: 결과 보고**

문제 없으면 완료 보고. 문제가 있으면 어떤 화면에서 무엇이 어긋났는지 기록하고 해당 Task로 돌아가 수정한다.
