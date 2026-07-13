// src/mcp/server.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type Database from 'better-sqlite3'
import { getOrCreateProject } from '../models/projects.js'
import { createPlan, getPlan, snapshotPlan, updatePlanSections, approvePlanAndCreateIssues } from '../models/plans.js'
import { getIssue } from '../models/issues.js'
import { upsertWireframe } from '../models/wireframes.js'

const mvpFeatureSchema = z.object({
  priority: z.enum(['높음', '보통', '낮음']),
  title: z.string(),
  description: z.string(),
})

const planSectionsSchema = z.object({
  overview: z.string(),
  targetUsers: z.string(),
  mvpFeatures: z.array(mvpFeatureSchema),
  outOfScope: z.string(),
})

export function createMcpServer(db: Database.Database): McpServer {
  const server = new McpServer({ name: 'issue-board', version: '0.1.0' })

  server.tool(
    'create_plan',
    'projectRoot 경로로 프로젝트를 등록하고 새 기획을 draft 상태로 생성한다',
    { projectRoot: z.string(), title: z.string(), sections: planSectionsSchema },
    async ({ projectRoot, title, sections }) => {
      const project = getOrCreateProject(db, projectRoot)
      const plan = createPlan(db, project.id, title, sections)
      return { content: [{ type: 'text', text: JSON.stringify(plan) }] }
    }
  )

  server.tool(
    'update_plan',
    '기획을 갱신한다. sections만 주면 draft 내용을 덮어쓰고(버전 안 쌓임), status="approved"를 주면 확정 + 자동 스냅샷 + MVP 기능표 각 행을 이슈로 생성한다. /ib-plan 커맨드의 `update_plan(planId, status="approved")` 호출과 대응한다',
    {
      planId: z.number(),
      sections: planSectionsSchema.optional(),
      status: z.enum(['draft', 'approved']).optional(),
    },
    async ({ planId, sections, status }) => {
      if (sections) updatePlanSections(db, planId, sections)

      if (status === 'approved') {
        const existing = getPlan(db, planId)
        if (!existing) {
          return { content: [{ type: 'text', text: `plan ${planId} not found` }], isError: true }
        }
        const result = approvePlanAndCreateIssues(db, planId)
        return { content: [{ type: 'text', text: JSON.stringify(result) }] }
      }

      return { content: [{ type: 'text', text: JSON.stringify(getPlan(db, planId)) }] }
    }
  )

  server.tool(
    'snapshot_plan',
    '현재 기획 상태를 라벨과 함께 수동 스냅샷으로 남긴다 (승인과 무관하게 중간 마일스톤용)',
    { planId: z.number(), label: z.string() },
    async ({ planId, label }) => {
      const snap = snapshotPlan(db, planId, label)
      return { content: [{ type: 'text', text: JSON.stringify(snap) }] }
    }
  )

  server.tool(
    'create_wireframe',
    '이슈의 화면 레이아웃(박스형 와이어프레임 스키마)을 저장한다',
    {
      issueId: z.number(),
      screens: z.array(
        z.object({
          name: z.string(),
          route: z.string().nullable(),
          layout: z.object({
            regions: z.array(z.object({ type: z.string(), label: z.string() })),
          }),
        })
      ),
    },
    async ({ issueId, screens }) => {
      const issue = getIssue(db, issueId)
      if (!issue) {
        return { content: [{ type: 'text', text: `issue ${issueId} not found` }], isError: true }
      }
      const wireframe = upsertWireframe(db, issueId, screens)
      return { content: [{ type: 'text', text: JSON.stringify(wireframe) }] }
    }
  )

  return server
}
