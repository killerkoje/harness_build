// src/mcp/server.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type Database from 'better-sqlite3'
import { getOrCreateProject } from '../models/projects.js'
import {
  createPlan,
  getPlan,
  snapshotPlan,
  updatePlanSections,
  approvePlanAndCreateIssues,
  syncIssuesFromPlan,
} from '../models/plans.js'
import {
  getIssue,
  getIssueByNumber,
  listIssuesByProject,
  approveIssueForDev,
  setIssueStatus,
} from '../models/issues.js'
import { upsertWireframe } from '../models/wireframes.js'
import { upsertDesignSystem, getDesignSystemByProject } from '../models/design-systems.js'

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
    '기획을 갱신한다. sections만 주면 내용 덮어쓰기. status="approved"면 최초 승인+이슈 생성, 이미 approved면 sync_plan_issues와 동일하게 이슈 동기화',
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
        if (existing.status === 'approved') {
          const result = syncIssuesFromPlan(db, planId)
          snapshotPlan(db, planId, 'amended')
          return { content: [{ type: 'text', text: JSON.stringify(result) }] }
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
    'sync_plan_issues',
    '승인된 기획의 MVP 기능표와 이슈를 동기화한다. 신규 생성 / 변경 시 와이어프레임 무효화 / 제거된 기능은 orphaned로 보고(삭제 안 함)',
    { planId: z.number() },
    async ({ planId }) => {
      try {
        const result = syncIssuesFromPlan(db, planId)
        return { content: [{ type: 'text', text: JSON.stringify(result) }] }
      } catch (e) {
        return {
          content: [{ type: 'text', text: e instanceof Error ? e.message : String(e) }],
          isError: true,
        }
      }
    }
  )

  server.tool(
    'list_issues',
    '프로젝트의 이슈 목록을 반환한다',
    { projectRoot: z.string() },
    async ({ projectRoot }) => {
      const project = getOrCreateProject(db, projectRoot)
      const issues = listIssuesByProject(db, project.id)
      return { content: [{ type: 'text', text: JSON.stringify(issues) }] }
    }
  )

  server.tool(
    'get_issue_by_number',
    '프로젝트 표시 번호(number)로 이슈를 조회한다',
    { projectRoot: z.string(), number: z.number() },
    async ({ projectRoot, number }) => {
      const project = getOrCreateProject(db, projectRoot)
      const issue = getIssueByNumber(db, project.id, number)
      if (!issue) {
        return { content: [{ type: 'text', text: `issue #${number} not found` }], isError: true }
      }
      return { content: [{ type: 'text', text: JSON.stringify(issue) }] }
    }
  )

  server.tool(
    'get_design_system',
    '프로젝트의 디자인 시스템을 조회한다',
    { projectRoot: z.string() },
    async ({ projectRoot }) => {
      const project = getOrCreateProject(db, projectRoot)
      const ds = getDesignSystemByProject(db, project.id)
      if (!ds) {
        return { content: [{ type: 'text', text: 'design system not found' }], isError: true }
      }
      return { content: [{ type: 'text', text: JSON.stringify(ds) }] }
    }
  )

  server.tool(
    'create_wireframe',
    '이슈의 화면 와이어프레임을 저장한다. screen.html에 실제 렌더링 가능한 HTML 마크업을 담는다',
    {
      issueId: z.number(),
      screens: z.array(
        z.object({
          name: z.string(),
          route: z.string().nullable(),
          html: z.string(),
        })
      ),
    },
    async ({ issueId, screens }) => {
      const issue = getIssue(db, issueId)
      if (!issue) {
        return { content: [{ type: 'text', text: `issue ${issueId} not found` }], isError: true }
      }
      const wireframe = upsertWireframe(db, issueId, screens)
      setIssueStatus(db, issueId, 'wireframed')
      return { content: [{ type: 'text', text: JSON.stringify(wireframe) }] }
    }
  )

  server.tool(
    'approve_issue',
    '이슈를 개발 승인 상태(dev_approved)로 전환하고 .harness/issues/{number}.yaml을 시딩해 기존 dev 파이프라인과 연결한다',
    { issueId: z.number() },
    async ({ issueId }) => {
      const updated = approveIssueForDev(db, issueId)
      if (!updated) {
        return { content: [{ type: 'text', text: `issue ${issueId} not found` }], isError: true }
      }
      return { content: [{ type: 'text', text: JSON.stringify(updated) }] }
    }
  )

  server.tool(
    'upsert_design_system',
    '프로젝트의 디자인 시스템(토큰·컴포넌트 카탈로그·패키지 경로)을 저장한다. Turborepo packages/ui + Storybook 메타를 포함한다',
    {
      projectRoot: z.string(),
      name: z.string(),
      version: z.string(),
      packageName: z.string(),
      storybookPath: z.string(),
      tokens: z.record(z.string(), z.unknown()),
      components: z.array(
        z.object({
          name: z.string(),
          packageExport: z.string(),
          description: z.string(),
          issueNumbers: z.array(z.number()),
        })
      ),
    },
    async ({ projectRoot, name, version, packageName, storybookPath, tokens, components }) => {
      const project = getOrCreateProject(db, projectRoot)
      const ds = upsertDesignSystem(db, project.id, {
        name,
        version,
        packageName,
        storybookPath,
        tokens,
        components,
      })
      return { content: [{ type: 'text', text: JSON.stringify(ds) }] }
    }
  )

  return server
}
