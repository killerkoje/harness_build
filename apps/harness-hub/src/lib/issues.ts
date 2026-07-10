import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'

export type TaskStatus = 'pending' | 'done' | 'skipped' | 'fail'

export interface IssueTask {
  phase: string
  label: string
  status: TaskStatus
  artifact: string | null
}

export type RunStatus = 'draft' | 'in_progress' | 'qa_pass' | 'qa_fail'

export interface IssueRun {
  runId: string
  workspaceDir: string
  kind: 'initial' | 'amendment'
  parentRunId: string | null
  at: string
  status: RunStatus
  skipTests: boolean
  tasks: IssueTask[]
}

export interface IssueFile {
  path: string
  firstRunId: string
}

export type FeatureIssueStatus = 'draft' | 'active' | 'done'

export interface FeatureIssue {
  id: number
  title: string
  status: FeatureIssueStatus
  createdAt: string | null
  updatedAt: string | null
  runs: IssueRun[]
  files: IssueFile[]
}

interface IssueYaml {
  version?: number
  id: number
  title: string
  status?: FeatureIssueStatus
  created_at?: string
  updated_at?: string
  runs?: Array<{
    run_id: string
    workspace_dir: string
    kind?: 'initial' | 'amendment'
    parent_run_id?: string | null
    at?: string
  }>
  files?: Array<{ path: string; first_run_id: string }>
}

function parseSkipTests(specContent: string): boolean {
  return /SKIP_TESTS:\s*true/i.test(specContent)
}

function parseQaResult(qaContent: string): 'pass' | 'fail' | null {
  if (/QA\s*결과:\s*FAIL/i.test(qaContent)) return 'fail'
  if (/QA\s*결과:\s*PASS/i.test(qaContent)) return 'pass'
  return null
}

function buildTasks(runDir: string, skipTests: boolean): IssueTask[] {
  const has = (f: string) => fs.existsSync(path.join(runDir, f))

  const specDone = has('01_spec.md')
  const testDone = has('01_test_plan.md')
  const implDone = has('02_implementation.md')
  const qaDone = has('03_qa_report.md')

  let qaStatus: TaskStatus = 'pending'
  if (qaDone) {
    const qa = fs.readFileSync(path.join(runDir, '03_qa_report.md'), 'utf-8')
    qaStatus = parseQaResult(qa) === 'fail' ? 'fail' : 'done'
  }

  return [
    { phase: '1', label: '스펙', status: specDone ? 'done' : 'pending', artifact: specDone ? '01_spec.md' : null },
    {
      phase: '1.5',
      label: '테스트 선행',
      status: skipTests ? 'skipped' : testDone ? 'done' : 'pending',
      artifact: testDone ? '01_test_plan.md' : null,
    },
    {
      phase: '2',
      label: '구현',
      status: implDone ? 'done' : 'pending',
      artifact: implDone ? '02_implementation.md' : has('HANDOFF.md') ? 'HANDOFF.md' : null,
    },
    {
      phase: '3',
      label: 'QA',
      status: qaStatus,
      artifact: qaDone ? '03_qa_report.md' : null,
    },
    { phase: '4', label: '커밋', status: 'pending', artifact: null },
    {
      phase: '4.5',
      label: '로컬 패턴',
      status: 'pending',
      artifact: has('04_pattern_reason.md') ? '04_pattern_reason.md' : null,
    },
    { phase: '5', label: '팀 승격', status: 'skipped', artifact: null },
  ]
}

function deriveRunStatus(tasks: IssueTask[]): RunStatus {
  const spec = tasks.find((t) => t.phase === '1')
  const qa = tasks.find((t) => t.phase === '3')
  if (!spec || spec.status !== 'done') return 'draft'
  if (qa?.status === 'fail') return 'qa_fail'
  if (qa?.status === 'done') return 'qa_pass'
  return 'in_progress'
}

function loadRun(projectRoot: string, runId: string): IssueRun | null {
  const runDir = path.join(projectRoot, '_workspace', runId)
  if (!fs.existsSync(runDir) || !fs.statSync(runDir).isDirectory()) return null

  const specPath = path.join(runDir, '01_spec.md')
  if (!fs.existsSync(specPath)) return null

  const specContent = fs.readFileSync(specPath, 'utf-8')
  const skipTests = parseSkipTests(specContent)
  const tasks = buildTasks(runDir, skipTests)

  let kind: IssueRun['kind'] = 'initial'
  let parentRunId: string | null = null
  const fm = specContent.match(/^---\s*\n([\s\S]*?)\n---/)
  if (fm) {
    try {
      const parsed = yaml.load(fm[1]) as Record<string, unknown>
      if (parsed?.kind === 'amendment' || parsed?.parent_run_id) kind = 'amendment'
      if (typeof parsed?.parent_run_id === 'string') parentRunId = parsed.parent_run_id
    } catch {
      /* ignore */
    }
  }

  return {
    runId,
    workspaceDir: `_workspace/${runId}`,
    kind: parentRunId ? 'amendment' : kind,
    parentRunId,
    at: fs.statSync(specPath).mtime.toISOString(),
    status: deriveRunStatus(tasks),
    skipTests,
    tasks,
  }
}

function loadIssueYaml(projectRoot: string, issueId: number): FeatureIssue | null {
  const yamlPath = path.join(projectRoot, '.harness/issues', `${issueId}.yaml`)
  if (!fs.existsSync(yamlPath)) return null

  const raw = yaml.load(fs.readFileSync(yamlPath, 'utf-8')) as IssueYaml
  if (!raw?.id) return null

  const runs: IssueRun[] = (raw.runs ?? [])
    .map((r) => loadRun(projectRoot, r.run_id))
    .filter((r): r is IssueRun => r !== null)

  return {
    id: raw.id,
    title: raw.title || `이슈 ${raw.id}`,
    status: raw.status ?? 'active',
    createdAt: raw.created_at ?? null,
    updatedAt: raw.updated_at ?? null,
    runs,
    files: (raw.files ?? []).map((f) => ({ path: f.path, firstRunId: f.first_run_id })),
  }
}

export function loadProjectIssues(projectRoot: string): FeatureIssue[] {
  const issuesDir = path.join(projectRoot, '.harness/issues')
  if (!fs.existsSync(issuesDir)) return []

  const issues = fs
    .readdirSync(issuesDir)
    .filter((f) => f.endsWith('.yaml') && /^\d+\.yaml$/.test(f))
    .map((f) => loadIssueYaml(projectRoot, parseInt(f.replace('.yaml', ''), 10)))
    .filter((i): i is FeatureIssue => i !== null)

  return issues.sort((a, b) => {
    const au = a.updatedAt ?? ''
    const bu = b.updatedAt ?? ''
    return bu.localeCompare(au) || b.id - a.id
  })
}

export function countProjectIssues(projectRoot: string): number {
  return loadProjectIssues(projectRoot).length
}

export function getFeatureIssue(projectRoot: string, issueId: number): FeatureIssue | null {
  return loadIssueYaml(projectRoot, issueId)
}
