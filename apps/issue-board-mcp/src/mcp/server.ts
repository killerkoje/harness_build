// src/mcp/server.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type Database from 'better-sqlite3'
import {
  getOrCreateProject,
  createProject,
  getProjectContext,
  getProject,
} from '../models/projects.js'
import {
  createPlan,
  createPlanFromMarkdown,
  getPlan,
  snapshotPlan,
  updatePlanSections,
  updatePlanContent,
  approvePlanAndCreateIssues,
  syncIssuesFromPlan,
} from '../models/plans.js'
import {
  getIssue,
  getIssueByNumber,
  listIssuesByProject,
  approveIssueForDev,
  completeIssue,
  setIssueStatus,
} from '../models/issues.js'
import { upsertWireframe } from '../models/wireframes.js'
import { upsertDesignSystem, getDesignSystemByProject } from '../models/design-systems.js'
import { isNotionConfigured } from '../models/notion.js'

const NOTION_SETUP_PROMPT =
  'Notion 연동이 아직 설정되어 있지 않습니다(NOTION_API_KEY, NOTION_DATABASE_ID 미설정). ' +
  '이슈가 생성됐으니 사용자에게 "Notion 연동을 하시겠어요?"라고 물어보고, ' +
  '한다고 하면 Notion 통합 API 키와 데이터베이스 ID를 받아 apps/issue-board-mcp/.env에 ' +
  'NOTION_API_KEY / NOTION_DATABASE_ID로 등록한 뒤 issue-board-mcp 서버를 재시작하도록 안내하세요. ' +
  '원하지 않으면 그냥 넘어가면 됩니다.'

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
  markdown: z.string().optional(),
})

export function createMcpServer(db: Database.Database): McpServer {
  const server = new McpServer({ name: 'issue-board', version: '0.1.0' })

  server.tool(
    'get_project_context',
    'repoPath(절대경로)로 등록된 프로젝트·기획·이슈 요약. 없으면 project=null',
    { repoPath: z.string() },
    async ({ repoPath }) => {
      const ctx = getProjectContext(db, repoPath)
      return { content: [{ type: 'text', text: JSON.stringify(ctx) }] }
    }
  )

  server.tool(
    'create_project',
    '프로젝트를 등록한다. 같은 repoPath가 있으면 name/description만 갱신',
    {
      name: z.string(),
      description: z.string().optional(),
      repoPath: z.string(),
    },
    async ({ name, description, repoPath }) => {
      const project = createProject(db, { name, description, repoPath })
      return { content: [{ type: 'text', text: JSON.stringify(project) }] }
    }
  )

  server.tool(
    'create_plan',
    '새 기획을 draft로 생성. content(마크다운 전문) 권장. sections도 허용(레거시)',
    {
      projectId: z.number().optional(),
      projectRoot: z.string().optional(),
      title: z.string(),
      content: z.string().optional(),
      sections: planSectionsSchema.optional(),
    },
    async ({ projectId, projectRoot, title, content, sections }) => {
      let pid = projectId
      if (pid == null && projectRoot) {
        pid = getOrCreateProject(db, projectRoot).id
      }
      if (pid == null) {
        return {
          content: [{ type: 'text', text: 'projectId 또는 projectRoot 필요' }],
          isError: true,
        }
      }
      if (!getProject(db, pid)) {
        return { content: [{ type: 'text', text: `project ${pid} not found` }], isError: true }
      }

      let plan
      if (content) {
        plan = createPlanFromMarkdown(db, pid, title, content)
      } else if (sections) {
        plan = createPlan(db, pid, title, sections)
      } else {
        return {
          content: [{ type: 'text', text: 'content 또는 sections 필요' }],
          isError: true,
        }
      }
      return { content: [{ type: 'text', text: JSON.stringify(plan) }] }
    }
  )

  server.tool(
    'update_plan',
    '기획 갱신. content/sections로 작업본 덮어쓰기. status=approved면 승인+이슈 생성/동기화',
    {
      planId: z.number(),
      content: z.string().optional(),
      sections: planSectionsSchema.optional(),
      status: z.enum(['draft', 'approved']).optional(),
    },
    async ({ planId, content, sections, status }) => {
      if (content) updatePlanContent(db, planId, content)
      else if (sections) updatePlanSections(db, planId, sections)

      if (status === 'approved') {
        const existing = getPlan(db, planId)
        if (!existing) {
          return { content: [{ type: 'text', text: `plan ${planId} not found` }], isError: true }
        }
        if (existing.status === 'approved') {
          const result = await syncIssuesFromPlan(db, planId)
          snapshotPlan(db, planId, 'amended')
          const content = [{ type: 'text' as const, text: JSON.stringify(result) }]
          if (result.created.length > 0 && !isNotionConfigured()) {
            content.push({ type: 'text' as const, text: NOTION_SETUP_PROMPT })
          }
          return { content }
        }
        const result = await approvePlanAndCreateIssues(db, planId)
        const content = [{ type: 'text' as const, text: JSON.stringify(result) }]
        if (result.issues.length > 0 && !isNotionConfigured()) {
          content.push({ type: 'text' as const, text: NOTION_SETUP_PROMPT })
        }
        return { content }
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
        const result = await syncIssuesFromPlan(db, planId)
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
      const updated = await approveIssueForDev(db, issueId)
      if (!updated) {
        return { content: [{ type: 'text', text: `issue ${issueId} not found` }], isError: true }
      }
      return { content: [{ type: 'text', text: JSON.stringify(updated) }] }
    }
  )

  server.tool(
    'complete_issue',
    '이슈를 완료(done) 상태로 전환한다. /dev 파이프라인이 커밋을 끝낸 뒤 호출 (Notion 상태도 완료로 동기화)',
    { issueId: z.number() },
    async ({ issueId }) => {
      const updated = await completeIssue(db, issueId)
      if (!updated) {
        return { content: [{ type: 'text', text: `issue ${issueId} not found` }], isError: true }
      }
      return { content: [{ type: 'text', text: JSON.stringify(updated) }] }
    }
  )

  server.tool(
    'upsert_design_system',
    '프로젝트의 디자인 시스템(컬러 토큰·패키지 경로)을 저장한다. Turborepo packages/ui + Storybook 메타를 포함한다. ' +
      '컴포넌트 카탈로그는 프론트 재량으로 수시로 바뀌므로 선택 항목이다',
    {
      projectRoot: z.string(),
      name: z.string(),
      version: z.string(),
      packageName: z.string(),
      storybookPath: z.string(),
      tokens: z.record(z.string(), z.unknown()),
      components: z
        .array(
          z.object({
            name: z.string(),
            packageExport: z.string(),
            description: z.string(),
            issueNumbers: z.array(z.number()),
          })
        )
        .optional(),
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
