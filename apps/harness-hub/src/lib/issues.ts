import fs from 'fs'
import path from 'path'

export type TaskStatus = 'pending' | 'done' | 'skipped' | 'fail'

export interface IssueTask {
  phase: string
  label: string
  status: TaskStatus
  artifact: string | null
}

export type IssueStatus = 'draft' | 'in_progress' | 'qa_pass' | 'qa_fail' | 'done'

export interface HarnessIssue {
  id: string
  title: string
  workspaceDir: string
  externalId: string | null
  status: IssueStatus
  skipTests: boolean
  updatedAt: string
  tasks: IssueTask[]
}

function extractTitle(content: string, fallback: string): string {
  const fm = content.match(/^---[\s\S]*?title:\s*["']?([^"'\n]+)["']?/m)
  if (fm?.[1]) return fm[1].trim()
  const h1 = content.match(/^#\s+(.+)$/m)
  if (h1?.[1]) return h1[1].trim()
  return fallback
}

function parseSkipTests(specContent: string): boolean {
  return /SKIP_TESTS:\s*true/i.test(specContent)
}

function parseQaResult(qaContent: string): 'pass' | 'fail' | 'warn' | null {
  if (/QA\s*결과:\s*PASS_WITH_WARNINGS/i.test(qaContent)) return 'warn'
  if (/QA\s*결과:\s*PASS/i.test(qaContent)) return 'pass'
  if (/QA\s*결과:\s*FAIL/i.test(qaContent)) return 'fail'
  return null
}

function parseExternalId(runId: string): string | null {
  const gh = runId.match(/#(\d+)/)
  if (gh?.[1]) return `#${gh[1]}`
  const issue = runId.match(/issue-(\d+)/i)
  if (issue?.[1]) return `#${issue[1]}`
  return null
}

function latestMtime(dir: string, files: string[]): string {
  let latest = fs.statSync(dir).mtime
  for (const f of files) {
    const p = path.join(dir, f)
    if (!fs.existsSync(p)) continue
    const t = fs.statSync(p).mtime
    if (t > latest) latest = t
  }
  return latest.toISOString()
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
    const result = parseQaResult(qa)
    qaStatus = result === 'fail' ? 'fail' : 'done'
  }

  return [
    {
      phase: '1',
      label: '스펙',
      status: specDone ? 'done' : 'pending',
      artifact: specDone ? '01_spec.md' : null,
    },
    {
      phase: '1.5',
      label: '테스트 선행',
      status: skipTests ? 'skipped' : testDone ? 'done' : specDone ? 'pending' : 'pending',
      artifact: testDone ? '01_test_plan.md' : null,
    },
    {
      phase: '2',
      label: '구현',
      status: implDone ? 'done' : specDone ? 'pending' : 'pending',
      artifact: implDone ? '02_implementation.md' : has('HANDOFF.md') ? 'HANDOFF.md' : null,
    },
    {
      phase: '3',
      label: 'QA',
      status: qaStatus,
      artifact: qaDone ? '03_qa_report.md' : null,
    },
    {
      phase: '4',
      label: '커밋',
      status: qaStatus === 'done' ? 'pending' : 'pending',
      artifact: null,
    },
    {
      phase: '4.5',
      label: '로컬 패턴',
      status: 'pending',
      artifact: has('04_pattern_reason.md') ? '04_pattern_reason.md' : null,
    },
    {
      phase: '5',
      label: '팀 승격',
      status: 'skipped',
      artifact: null,
    },
  ]
}

function deriveIssueStatus(tasks: IssueTask[]): IssueStatus {
  const spec = tasks.find((t) => t.phase === '1')
  const qa = tasks.find((t) => t.phase === '3')
  const impl = tasks.find((t) => t.phase === '2')

  if (!spec || spec.status !== 'done') return 'draft'
  if (qa?.status === 'fail') return 'qa_fail'
  if (qa?.status === 'done') return 'qa_pass'
  if (impl?.status === 'done' || spec.status === 'done') return 'in_progress'
  return 'draft'
}

function loadIssueFromRun(projectRoot: string, runId: string): HarnessIssue | null {
  const runDir = path.join(projectRoot, '_workspace', runId)
  if (!fs.statSync(runDir).isDirectory()) return null

  const specPath = path.join(runDir, '01_spec.md')
  if (!fs.existsSync(specPath)) return null

  const specContent = fs.readFileSync(specPath, 'utf-8')
  const skipTests = parseSkipTests(specContent)
  const tasks = buildTasks(runDir, skipTests)
  const status = deriveIssueStatus(tasks)

  const artifacts = ['01_spec.md', '01_test_plan.md', '02_implementation.md', '03_qa_report.md']

  return {
    id: runId,
    title: extractTitle(specContent, runId),
    workspaceDir: `_workspace/${runId}`,
    externalId: parseExternalId(runId),
    status,
    skipTests,
    updatedAt: latestMtime(runDir, artifacts),
    tasks,
  }
}

export function loadProjectIssues(projectRoot: string): HarnessIssue[] {
  const workspace = path.join(projectRoot, '_workspace')
  if (!fs.existsSync(workspace)) return []

  return fs
    .readdirSync(workspace)
    .map((dir) => loadIssueFromRun(projectRoot, dir))
    .filter((issue): issue is HarnessIssue => issue !== null)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function countProjectIssues(projectRoot: string): number {
  return loadProjectIssues(projectRoot).length
}
