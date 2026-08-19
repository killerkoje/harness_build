import type Database from 'better-sqlite3'
import path from 'node:path'
import type {
  DesignSystem,
  DesignSystemComponent,
  Issue,
  IssueStatus,
  MvpFeature,
  NotionStatus,
  Plan,
  PlanSections,
  PlanSnapshot,
  PlanStatus,
  Priority,
  Project,
  Subtask,
  Wireframe,
  WireframeScreen,
} from './types.js'
import {
  createProject as sqliteCreateProject,
  deleteProject as sqliteDeleteProject,
  getOrCreateProject as sqliteGetOrCreateProject,
  getProject as sqliteGetProject,
  getProjectByRootPath as sqliteGetProjectByRootPath,
  getProjectContext as sqliteGetProjectContext,
  listProjects as sqliteListProjects,
  updateProjectDevUrl as sqliteUpdateProjectDevUrl,
} from './models/projects.js'
import {
  approvePlanAndCreateIssues as sqliteApprovePlanAndCreateIssues,
  createPlan as sqliteCreatePlan,
  createPlanFromMarkdown as sqliteCreatePlanFromMarkdown,
  getLatestPlanForProject as sqliteGetLatestPlan,
  getPlan as sqliteGetPlan,
  listPlansByProject as sqliteListPlans,
  listSnapshots as sqliteListSnapshots,
  snapshotPlan as sqliteSnapshotPlan,
  syncIssuesFromPlan as sqliteSyncIssuesFromPlan,
  updatePlanContent as sqliteUpdatePlanContent,
  updatePlanSections as sqliteUpdatePlanSections,
} from './models/plans.js'
import {
  advanceIssueStatus as sqliteAdvanceIssueStatus,
  approveIssueForDev as sqliteApproveIssueForDev,
  completeIssue as sqliteCompleteIssue,
  getIssue as sqliteGetIssue,
  getIssueByNumber as sqliteGetIssueByNumber,
  listIssuesByProject as sqliteListIssues,
  listIssuesByProjectWithProgress as sqliteListIssuesWithProgress,
  setIssueNotionPageId as sqliteSetIssueNotionPageId,
  setIssueNotionStatus as sqliteSetIssueNotionStatus,
} from './models/issues.js'
import {
  getWireframeByIssue as sqliteGetWireframe,
  listWireframesByProject as sqliteListWireframes,
  upsertWireframe as sqliteUpsertWireframe,
  type WireframeSummary,
} from './models/wireframes.js'
import {
  createSubtask as sqliteCreateSubtask,
  createSubtasksBulk as sqliteCreateSubtasksBulk,
  deleteSubtask as sqliteDeleteSubtask,
  getSubtask as sqliteGetSubtask,
  listSubtasksByIssue as sqliteListSubtasks,
  maybeAutoCompleteIssue as sqliteMaybeAutoComplete,
  updateSubtask as sqliteUpdateSubtask,
} from './models/subtasks.js'
import {
  getDesignSystemByProject as sqliteGetDesignSystem,
  upsertDesignSystem as sqliteUpsertDesignSystem,
} from './models/design-systems.js'
import { parsePlanMarkdown } from './models/parse-plan-markdown.js'
import { pushEpicToNotion, pushIssueToNotion } from './models/notion.js'
import { seedIssueYaml } from './handoff.js'
import { getSupabase, isSupabaseEnabled } from './supabase.js'

export type { WireframeSummary }

function num(v: unknown): number {
  return typeof v === 'number' ? v : Number(v)
}

function jsonVal<T>(v: unknown): T {
  return (typeof v === 'string' ? JSON.parse(v) : v) as T
}

function throwSb(error: { message: string } | null, ctx: string): void {
  if (error) throw new Error(`${ctx}: ${error.message}`)
}

function toProject(row: Record<string, unknown>): Project {
  return {
    id: num(row.id),
    rootPath: String(row.root_path),
    name: String(row.name),
    description: String(row.description ?? ''),
    devUrl: (row.dev_url as string | null) ?? null,
  }
}

function toPlan(row: Record<string, unknown>): Plan {
  return {
    id: num(row.id),
    projectId: num(row.project_id),
    title: String(row.title),
    sections: jsonVal<PlanSections>(row.sections),
    status: row.status as PlanStatus,
    notionEpicPageId: (row.notion_epic_page_id as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

function toIssue(row: Record<string, unknown>): Issue {
  return {
    id: num(row.id),
    projectId: num(row.project_id),
    number: num(row.number),
    planId: row.plan_id == null ? null : num(row.plan_id),
    title: String(row.title),
    priority: row.priority as Priority,
    description: String(row.description),
    status: row.status as IssueStatus,
    notionPageId: (row.notion_page_id as string | null) ?? null,
    notionStatus: (row.notion_status as NotionStatus | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

function toSubtask(row: Record<string, unknown>): Subtask {
  return {
    id: num(row.id),
    issueId: num(row.issue_id),
    title: String(row.title),
    done: Boolean(row.done),
    notes: String(row.notes ?? ''),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

function toWireframe(row: Record<string, unknown>): Wireframe {
  return {
    id: num(row.id),
    issueId: num(row.issue_id),
    screens: jsonVal<WireframeScreen[]>(row.screens),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

function toDesignSystem(row: Record<string, unknown>): DesignSystem {
  return {
    id: num(row.id),
    projectId: num(row.project_id),
    name: String(row.name),
    version: String(row.version),
    packageName: String(row.package_name),
    storybookPath: String(row.storybook_path),
    tokens: jsonVal<Record<string, unknown>>(row.tokens),
    components: jsonVal<DesignSystemComponent[]>(row.components),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

export interface Store {
  getOrCreateProject(rootPath: string): Promise<Project>
  createProject(opts: { name: string; description?: string; repoPath: string }): Promise<Project>
  getProject(id: number): Promise<Project | null>
  listProjects(): Promise<Project[]>
  deleteProject(id: number): Promise<boolean>
  updateProjectDevUrl(id: number, devUrl: string | null): Promise<Project | null>
  getProjectByRootPath(rootPath: string): Promise<Project | null>
  getProjectContext(repoPath: string): Promise<{ project: Project | null; plans: Plan[]; issues: Issue[] }>
  createPlan(projectId: number, title: string, sections: PlanSections): Promise<Plan>
  createPlanFromMarkdown(projectId: number, title: string, content: string): Promise<Plan>
  getPlan(id: number): Promise<Plan | null>
  getLatestPlanForProject(projectId: number): Promise<Plan | null>
  listPlansByProject(projectId: number): Promise<Plan[]>
  updatePlanSections(id: number, sections: PlanSections): Promise<void>
  updatePlanContent(id: number, content: string): Promise<Plan>
  snapshotPlan(planId: number, label: string): Promise<PlanSnapshot>
  approvePlanAndCreateIssues(planId: number): Promise<{ plan: Plan; issues: Issue[] }>
  syncIssuesFromPlan(planId: number): Promise<{
    plan: Plan
    created: Issue[]
    updated: Issue[]
    unchanged: Issue[]
    orphaned: Issue[]
    wireframesInvalidated: number[]
  }>
  listIssuesByProject(projectId: number): Promise<Issue[]>
  listIssuesByProjectWithProgress(
    projectId: number
  ): Promise<(Issue & { subtaskProgress: { total: number; done: number } | null })[]>
  getIssue(id: number): Promise<Issue | null>
  getIssueByNumber(projectId: number, number: number): Promise<Issue | null>
  advanceIssueStatus(id: number, status: IssueStatus): Promise<Issue | null>
  approveIssueForDev(issueId: number): Promise<Issue | null>
  completeIssue(issueId: number): Promise<Issue | null>
  setIssueNotionPageId(id: number, pageId: string): Promise<void>
  setIssueNotionStatus(id: number, notionStatus: NotionStatus | null): Promise<void>
  upsertWireframe(issueId: number, screens: WireframeScreen[]): Promise<Wireframe>
  getWireframeByIssue(issueId: number): Promise<Wireframe | null>
  listWireframesByProject(projectId: number): Promise<WireframeSummary[]>
  listSubtasksByIssue(issueId: number): Promise<Subtask[]>
  createSubtask(issueId: number, title: string): Promise<Subtask>
  createSubtasksBulk(issueId: number, titles: string[]): Promise<Subtask[]>
  getSubtask(id: number): Promise<Subtask | null>
  updateSubtask(
    id: number,
    fields: { title?: string; done?: boolean; notes?: string }
  ): Promise<Subtask | null>
  deleteSubtask(id: number): Promise<boolean>
  maybeAutoCompleteIssue(issueId: number): Promise<void>
  getDesignSystemByProject(projectId: number): Promise<DesignSystem | null>
  upsertDesignSystem(
    projectId: number,
    input: {
      name: string
      version: string
      packageName: string
      storybookPath: string
      tokens: Record<string, unknown>
      components?: DesignSystemComponent[]
    }
  ): Promise<DesignSystem>
}

export function sqliteStore(db: Database.Database): Store {
  return {
    getOrCreateProject: async (rootPath) => sqliteGetOrCreateProject(db, rootPath),
    createProject: async (opts) => sqliteCreateProject(db, opts),
    getProject: async (id) => sqliteGetProject(db, id),
    listProjects: async () => sqliteListProjects(db),
    deleteProject: async (id) => sqliteDeleteProject(db, id),
    updateProjectDevUrl: async (id, devUrl) => sqliteUpdateProjectDevUrl(db, id, devUrl),
    getProjectByRootPath: async (rootPath) => sqliteGetProjectByRootPath(db, rootPath),
    getProjectContext: async (repoPath) => sqliteGetProjectContext(db, repoPath),
    createPlan: async (projectId, title, sections) => sqliteCreatePlan(db, projectId, title, sections),
    createPlanFromMarkdown: async (projectId, title, content) =>
      sqliteCreatePlanFromMarkdown(db, projectId, title, content),
    getPlan: async (id) => sqliteGetPlan(db, id),
    getLatestPlanForProject: async (projectId) => sqliteGetLatestPlan(db, projectId),
    listPlansByProject: async (projectId) => sqliteListPlans(db, projectId),
    updatePlanSections: async (id, sections) => sqliteUpdatePlanSections(db, id, sections),
    updatePlanContent: async (id, content) => sqliteUpdatePlanContent(db, id, content),
    snapshotPlan: async (planId, label) => sqliteSnapshotPlan(db, planId, label),
    approvePlanAndCreateIssues: (planId) => sqliteApprovePlanAndCreateIssues(db, planId),
    syncIssuesFromPlan: (planId) => sqliteSyncIssuesFromPlan(db, planId),
    listIssuesByProject: async (projectId) => sqliteListIssues(db, projectId),
    listIssuesByProjectWithProgress: async (projectId) => sqliteListIssuesWithProgress(db, projectId),
    getIssue: async (id) => sqliteGetIssue(db, id),
    getIssueByNumber: async (projectId, number) => sqliteGetIssueByNumber(db, projectId, number),
    advanceIssueStatus: async (id, status) => sqliteAdvanceIssueStatus(db, id, status),
    approveIssueForDev: (issueId) => sqliteApproveIssueForDev(db, issueId),
    completeIssue: (issueId) => sqliteCompleteIssue(db, issueId),
    setIssueNotionPageId: async (id, pageId) => sqliteSetIssueNotionPageId(db, id, pageId),
    setIssueNotionStatus: async (id, notionStatus) => sqliteSetIssueNotionStatus(db, id, notionStatus),
    upsertWireframe: async (issueId, screens) => sqliteUpsertWireframe(db, issueId, screens),
    getWireframeByIssue: async (issueId) => sqliteGetWireframe(db, issueId),
    listWireframesByProject: async (projectId) => sqliteListWireframes(db, projectId),
    listSubtasksByIssue: async (issueId) => sqliteListSubtasks(db, issueId),
    createSubtask: async (issueId, title) => sqliteCreateSubtask(db, issueId, title),
    createSubtasksBulk: async (issueId, titles) => sqliteCreateSubtasksBulk(db, issueId, titles),
    getSubtask: async (id) => sqliteGetSubtask(db, id),
    updateSubtask: async (id, fields) => sqliteUpdateSubtask(db, id, fields),
    deleteSubtask: async (id) => sqliteDeleteSubtask(db, id),
    maybeAutoCompleteIssue: (issueId) => sqliteMaybeAutoComplete(db, issueId),
    getDesignSystemByProject: async (projectId) => sqliteGetDesignSystem(db, projectId),
    upsertDesignSystem: async (projectId, input) => sqliteUpsertDesignSystem(db, projectId, input),
  }
}

const STATUS_ORDER: Record<IssueStatus, number> = {
  planned: 0,
  wireframed: 1,
  dev_approved: 2,
  done: 3,
}

async function sbGetProject(id: number): Promise<Project | null> {
  const { data, error } = await getSupabase().from('projects').select('*').eq('id', id).maybeSingle()
  throwSb(error, 'getProject')
  return data ? toProject(data) : null
}

async function sbGetPlan(id: number): Promise<Plan | null> {
  const { data, error } = await getSupabase().from('plans').select('*').eq('id', id).maybeSingle()
  throwSb(error, 'getPlan')
  return data ? toPlan(data) : null
}

async function sbGetIssue(id: number): Promise<Issue | null> {
  const { data, error } = await getSupabase().from('issues').select('*').eq('id', id).maybeSingle()
  throwSb(error, 'getIssue')
  return data ? toIssue(data) : null
}

async function sbCreateIssuesFromPlan(
  projectId: number,
  planId: number,
  features: MvpFeature[]
): Promise<Issue[]> {
  const created: Issue[] = []
  for (const feature of features) {
    const { data: maxRow, error: maxErr } = await getSupabase()
      .from('issues')
      .select('number')
      .eq('project_id', projectId)
      .order('number', { ascending: false })
      .limit(1)
      .maybeSingle()
    throwSb(maxErr, 'nextIssueNumber')
    const number = (maxRow?.number ?? 0) + 1
    const now = new Date().toISOString()
    const { data, error } = await getSupabase()
      .from('issues')
      .insert({
        project_id: projectId,
        number,
        plan_id: planId,
        title: feature.title,
        priority: feature.priority,
        description: feature.description,
        status: 'planned',
        created_at: now,
        updated_at: now,
      })
      .select()
      .single()
    throwSb(error, 'createIssue')
    created.push(toIssue(data))
  }
  return created
}

async function persistNotionPageId(issueId: number, pageId: string): Promise<void> {
  const { error } = await getSupabase()
    .from('issues')
    .update({ notion_page_id: pageId, updated_at: new Date().toISOString() })
    .eq('id', issueId)
  throwSb(error, 'setIssueNotionPageId')
}

async function sbPushIssue(issue: Issue, epicPageId?: string | null): Promise<void> {
  await pushIssueToNotion(null, issue, epicPageId, undefined, persistNotionPageId)
}

export const supabaseStore: Store = {
  async getOrCreateProject(rootPath) {
    const existing = await this.getProjectByRootPath(rootPath)
    if (existing) return existing
    return this.createProject({ name: path.basename(rootPath), repoPath: rootPath, description: '' })
  },
  async createProject(opts) {
    const existing = await this.getProjectByRootPath(opts.repoPath)
    if (existing) {
      const { data, error } = await getSupabase()
        .from('projects')
        .update({ name: opts.name, description: opts.description ?? '' })
        .eq('id', existing.id)
        .select()
        .single()
      throwSb(error, 'createProject.update')
      return toProject(data)
    }
    const { data, error } = await getSupabase()
      .from('projects')
      .insert({
        root_path: opts.repoPath,
        name: opts.name,
        description: opts.description ?? '',
      })
      .select()
      .single()
    throwSb(error, 'createProject.insert')
    return toProject(data)
  },
  getProject: sbGetProject,
  async listProjects() {
    const { data, error } = await getSupabase().from('projects').select('*').order('id')
    throwSb(error, 'listProjects')
    return (data ?? []).map(toProject)
  },
  async deleteProject(id) {
    const existing = await sbGetProject(id)
    if (!existing) return false
    const { error } = await getSupabase().from('projects').delete().eq('id', id)
    throwSb(error, 'deleteProject')
    return true
  },
  async updateProjectDevUrl(id, devUrl) {
    const existing = await sbGetProject(id)
    if (!existing) return null
    const { data, error } = await getSupabase()
      .from('projects')
      .update({ dev_url: devUrl })
      .eq('id', id)
      .select()
      .single()
    throwSb(error, 'updateProjectDevUrl')
    return toProject(data)
  },
  async getProjectByRootPath(rootPath) {
    const { data, error } = await getSupabase()
      .from('projects')
      .select('*')
      .eq('root_path', rootPath)
      .maybeSingle()
    throwSb(error, 'getProjectByRootPath')
    return data ? toProject(data) : null
  },
  async getProjectContext(repoPath) {
    const project = await this.getProjectByRootPath(repoPath)
    if (!project) return { project: null, plans: [], issues: [] }
    const plans = await this.listPlansByProject(project.id)
    plans.reverse()
    const issues = await this.listIssuesByProject(project.id)
    return { project, plans, issues }
  },
  async createPlan(projectId, title, sections) {
    const now = new Date().toISOString()
    const { data, error } = await getSupabase()
      .from('plans')
      .insert({
        project_id: projectId,
        title,
        sections,
        status: 'draft',
        created_at: now,
        updated_at: now,
      })
      .select()
      .single()
    throwSb(error, 'createPlan')
    return toPlan(data)
  },
  async createPlanFromMarkdown(projectId, title, content) {
    return this.createPlan(projectId, title, parsePlanMarkdown(content))
  },
  getPlan: sbGetPlan,
  async getLatestPlanForProject(projectId) {
    const { data, error } = await getSupabase()
      .from('plans')
      .select('*')
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    throwSb(error, 'getLatestPlanForProject')
    return data ? toPlan(data) : null
  },
  async listPlansByProject(projectId) {
    const { data, error } = await getSupabase()
      .from('plans')
      .select('*')
      .eq('project_id', projectId)
      .order('id')
    throwSb(error, 'listPlansByProject')
    return (data ?? []).map(toPlan)
  },
  async updatePlanSections(id, sections) {
    const { error } = await getSupabase()
      .from('plans')
      .update({ sections, updated_at: new Date().toISOString() })
      .eq('id', id)
    throwSb(error, 'updatePlanSections')
  },
  async updatePlanContent(id, content) {
    await this.updatePlanSections(id, parsePlanMarkdown(content))
    const plan = await sbGetPlan(id)
    if (!plan) throw new Error(`plan ${id} not found`)
    return plan
  },
  async snapshotPlan(planId, label) {
    const plan = await sbGetPlan(planId)
    if (!plan) throw new Error(`plan ${planId} not found`)
    const now = new Date().toISOString()
    const { data, error } = await getSupabase()
      .from('plan_snapshots')
      .insert({ plan_id: planId, label, content: plan.sections, created_at: now })
      .select()
      .single()
    throwSb(error, 'snapshotPlan')
    return {
      id: num(data.id),
      planId,
      label,
      content: jsonVal<PlanSections>(data.content),
      createdAt: now,
    }
  },
  async approvePlanAndCreateIssues(planId) {
    const plan = await sbGetPlan(planId)
    if (!plan) throw new Error(`plan ${planId} not found`)
    const now = new Date().toISOString()
    await this.snapshotPlan(planId, 'approved')
    const { data: approved, error } = await getSupabase()
      .from('plans')
      .update({ status: 'approved', updated_at: now })
      .eq('id', planId)
      .select()
      .single()
    throwSb(error, 'approvePlan')
    const issues = await sbCreateIssuesFromPlan(plan.projectId, planId, plan.sections.mvpFeatures)
    const resultPlan = toPlan(approved)
    const epicPageId = await pushEpicToNotion(resultPlan.notionEpicPageId, resultPlan.title)
    if (epicPageId && epicPageId !== resultPlan.notionEpicPageId) {
      await getSupabase()
        .from('plans')
        .update({ notion_epic_page_id: epicPageId, updated_at: new Date().toISOString() })
        .eq('id', planId)
      resultPlan.notionEpicPageId = epicPageId
    }
    for (const issue of issues) {
      await sbPushIssue(issue, epicPageId)
    }
    return { plan: resultPlan, issues }
  },
  async syncIssuesFromPlan(planId) {
    const plan = await sbGetPlan(planId)
    if (!plan) throw new Error(`plan ${planId} not found`)
    const features = plan.sections.mvpFeatures
    const existing = (await this.listIssuesByProject(plan.projectId)).filter((i) => i.planId === planId)
    const byTitle = new Map(existing.map((i) => [i.title, i]))
    const created: Issue[] = []
    const updated: Issue[] = []
    const unchanged: Issue[] = []
    const wireframesInvalidated: number[] = []
    const matchedIds = new Set<number>()

    for (const feature of features) {
      const prev = byTitle.get(feature.title)
      if (!prev) {
        const [issue] = await sbCreateIssuesFromPlan(plan.projectId, planId, [feature])
        created.push(issue)
        matchedIds.add(issue.id)
        continue
      }
      matchedIds.add(prev.id)
      const changed = prev.priority !== feature.priority || prev.description !== feature.description
      if (!changed) {
        unchanged.push(prev)
        continue
      }
      const now = new Date().toISOString()
      const { data, error } = await getSupabase()
        .from('issues')
        .update({
          priority: feature.priority,
          description: feature.description,
          status: 'planned',
          updated_at: now,
        })
        .eq('id', prev.id)
        .select()
        .single()
      throwSb(error, 'syncIssue.update')
      const { error: wfErr } = await getSupabase().from('wireframes').delete().eq('issue_id', prev.id)
      throwSb(wfErr, 'syncIssue.dropWireframe')
      if (!wfErr) wireframesInvalidated.push(prev.id)
      updated.push(toIssue(data))
    }

    const epicPageId = await pushEpicToNotion(plan.notionEpicPageId, plan.title)
    for (const issue of [...created, ...updated]) {
      await sbPushIssue(issue, epicPageId)
    }
    return {
      plan: (await sbGetPlan(planId))!,
      created,
      updated,
      unchanged,
      orphaned: existing.filter((i) => !matchedIds.has(i.id)),
      wireframesInvalidated,
    }
  },
  async listIssuesByProject(projectId) {
    const { data, error } = await getSupabase()
      .from('issues')
      .select('*')
      .eq('project_id', projectId)
      .order('number')
    throwSb(error, 'listIssuesByProject')
    return (data ?? []).map(toIssue)
  },
  async listIssuesByProjectWithProgress(projectId) {
    const issues = await this.listIssuesByProject(projectId)
    if (issues.length === 0) return []
    const { data, error } = await getSupabase()
      .from('issue_subtasks')
      .select('issue_id, done')
      .in(
        'issue_id',
        issues.map((i) => i.id)
      )
    throwSb(error, 'listIssueSubtasks')
    const counts = new Map<number, { total: number; done: number }>()
    for (const row of data ?? []) {
      const id = num(row.issue_id)
      const cur = counts.get(id) ?? { total: 0, done: 0 }
      cur.total += 1
      if (row.done) cur.done += 1
      counts.set(id, cur)
    }
    return issues.map((issue) => ({
      ...issue,
      subtaskProgress: counts.get(issue.id) ?? null,
    }))
  },
  getIssue: sbGetIssue,
  async getIssueByNumber(projectId, number) {
    const { data, error } = await getSupabase()
      .from('issues')
      .select('*')
      .eq('project_id', projectId)
      .eq('number', number)
      .maybeSingle()
    throwSb(error, 'getIssueByNumber')
    return data ? toIssue(data) : null
  },
  async advanceIssueStatus(id, status) {
    const issue = await sbGetIssue(id)
    if (!issue) return null
    if (STATUS_ORDER[status] < STATUS_ORDER[issue.status]) return issue
    const { data, error } = await getSupabase()
      .from('issues')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    throwSb(error, 'advanceIssueStatus')
    return toIssue(data)
  },
  async approveIssueForDev(issueId) {
    const issue = await sbGetIssue(issueId)
    if (!issue) return null
    if (STATUS_ORDER.dev_approved < STATUS_ORDER[issue.status]) return issue
    const { data, error } = await getSupabase()
      .from('issues')
      .update({ status: 'dev_approved', updated_at: new Date().toISOString() })
      .eq('id', issueId)
      .select()
      .single()
    throwSb(error, 'approveIssueForDev')
    const updated = toIssue(data)
    const project = await sbGetProject(updated.projectId)
    if (project) seedIssueYaml(project.rootPath, updated)
    await sbPushIssue(updated)
    return updated
  },
  async completeIssue(issueId) {
    const issue = await sbGetIssue(issueId)
    if (!issue) return null
    const { data, error } = await getSupabase()
      .from('issues')
      .update({ status: 'done', updated_at: new Date().toISOString() })
      .eq('id', issueId)
      .select()
      .single()
    throwSb(error, 'completeIssue')
    const updated = toIssue(data)
    await sbPushIssue(updated)
    return updated
  },
  async setIssueNotionPageId(id, pageId) {
    await persistNotionPageId(id, pageId)
  },
  async setIssueNotionStatus(id, notionStatus) {
    const { error } = await getSupabase()
      .from('issues')
      .update({ notion_status: notionStatus, updated_at: new Date().toISOString() })
      .eq('id', id)
    throwSb(error, 'setIssueNotionStatus')
  },
  async upsertWireframe(issueId, screens) {
    const existing = await this.getWireframeByIssue(issueId)
    const now = new Date().toISOString()
    if (existing) {
      const { data, error } = await getSupabase()
        .from('wireframes')
        .update({ screens, updated_at: now })
        .eq('issue_id', issueId)
        .select()
        .single()
      throwSb(error, 'upsertWireframe.update')
      return toWireframe(data)
    }
    const { data, error } = await getSupabase()
      .from('wireframes')
      .insert({ issue_id: issueId, screens, created_at: now, updated_at: now })
      .select()
      .single()
    throwSb(error, 'upsertWireframe.insert')
    return toWireframe(data)
  },
  async getWireframeByIssue(issueId) {
    const { data, error } = await getSupabase()
      .from('wireframes')
      .select('*')
      .eq('issue_id', issueId)
      .maybeSingle()
    throwSb(error, 'getWireframeByIssue')
    return data ? toWireframe(data) : null
  },
  async listWireframesByProject(projectId) {
    const issues = await this.listIssuesByProject(projectId)
    const ids = issues.map((i) => i.id)
    if (ids.length === 0) return []
    const { data, error } = await getSupabase().from('wireframes').select('*').in('issue_id', ids)
    throwSb(error, 'listWireframesByProject')
    const byIssue = new Map(issues.map((i) => [i.id, i]))
    return (data ?? []).map((row) => {
      const issue = byIssue.get(num(row.issue_id))!
      const screens = jsonVal<WireframeScreen[]>(row.screens)
      return {
        issueId: num(row.issue_id),
        issueNumber: issue.number,
        issueTitle: issue.title,
        screenCount: screens.length,
        updatedAt: String(row.updated_at),
      }
    })
  },
  async listSubtasksByIssue(issueId) {
    const { data, error } = await getSupabase()
      .from('issue_subtasks')
      .select('*')
      .eq('issue_id', issueId)
      .order('id')
    throwSb(error, 'listSubtasksByIssue')
    return (data ?? []).map(toSubtask)
  },
  async createSubtask(issueId, title) {
    const now = new Date().toISOString()
    const { data, error } = await getSupabase()
      .from('issue_subtasks')
      .insert({ issue_id: issueId, title, done: false, notes: '', created_at: now, updated_at: now })
      .select()
      .single()
    throwSb(error, 'createSubtask')
    return toSubtask(data)
  },
  async createSubtasksBulk(issueId, titles) {
    const created: Subtask[] = []
    for (const title of titles) created.push(await this.createSubtask(issueId, title))
    return created
  },
  async getSubtask(id) {
    const { data, error } = await getSupabase().from('issue_subtasks').select('*').eq('id', id).maybeSingle()
    throwSb(error, 'getSubtask')
    return data ? toSubtask(data) : null
  },
  async updateSubtask(id, fields) {
    const existing = await this.getSubtask(id)
    if (!existing) return null
    const { data, error } = await getSupabase()
      .from('issue_subtasks')
      .update({
        title: fields.title ?? existing.title,
        done: fields.done ?? existing.done,
        notes: fields.notes ?? existing.notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()
    throwSb(error, 'updateSubtask')
    return toSubtask(data)
  },
  async deleteSubtask(id) {
    const { error, count } = await getSupabase()
      .from('issue_subtasks')
      .delete({ count: 'exact' })
      .eq('id', id)
    throwSb(error, 'deleteSubtask')
    return (count ?? 0) > 0
  },
  async maybeAutoCompleteIssue(issueId) {
    const subtasks = await this.listSubtasksByIssue(issueId)
    if (subtasks.length === 0) return
    if (!subtasks.every((s) => s.done)) return
    const issue = await sbGetIssue(issueId)
    if (!issue || issue.status !== 'dev_approved') return
    await this.completeIssue(issueId)
  },
  async getDesignSystemByProject(projectId) {
    const { data, error } = await getSupabase()
      .from('design_systems')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle()
    throwSb(error, 'getDesignSystemByProject')
    return data ? toDesignSystem(data) : null
  },
  async upsertDesignSystem(projectId, input) {
    const components = input.components ?? []
    const existing = await this.getDesignSystemByProject(projectId)
    const now = new Date().toISOString()
    const payload = {
      name: input.name,
      version: input.version,
      package_name: input.packageName,
      storybook_path: input.storybookPath,
      tokens: input.tokens,
      components,
      updated_at: now,
    }
    if (existing) {
      const { data, error } = await getSupabase()
        .from('design_systems')
        .update(payload)
        .eq('project_id', projectId)
        .select()
        .single()
      throwSb(error, 'upsertDesignSystem.update')
      return toDesignSystem(data)
    }
    const { data, error } = await getSupabase()
      .from('design_systems')
      .insert({ ...payload, project_id: projectId, created_at: now })
      .select()
      .single()
    throwSb(error, 'upsertDesignSystem.insert')
    return toDesignSystem(data)
  },
}

export function createStore(db: Database.Database): Store {
  return isSupabaseEnabled() ? supabaseStore : sqliteStore(db)
}
