# Issue Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기획 → 이슈 → 와이어프레임을 하나의 탭 대시보드에서 확인하고, 이슈 단위로 "개발 승인" 게이트를 걸어 기존 harness_build dev 파이프라인으로 핸드오프하는 issue-board 시스템을 구현한다.

**Architecture:** `apps/issue-board-mcp`(Node/TS, :4000)가 SQLite를 소유하고 MCP 프로토콜(`/mcp`, 에이전트용)과 REST API(`/api/*`, 대시보드용)를 동시에 노출한다. `apps/issue-board`(Next.js, :5173)는 REST API만 호출하는 순수 클라이언트다. 개발 승인 시 서버가 `.harness/issues/{number}.yaml`을 로컬에 시딩해 기존 dev 파이프라인과 연결한다.

**Tech Stack:** Node 20 + TypeScript 5, better-sqlite3, express, zod, vitest + supertest, `@modelcontextprotocol/sdk`, Next.js 15 + React 19 + Tailwind 4 (기존 apps/harness-hub와 동일 버전대).

**참고 문서:** `docs/superpowers/specs/2026-07-13-issue-board-design.md`

---

## 파일 구조

```
apps/issue-board-mcp/
├── package.json / tsconfig.json / vitest.config.ts
└── src/
    ├── types.ts               공유 타입
    ├── db.ts                  SQLite 연결 + 스키마 초기화
    ├── db.test.ts
    ├── models/
    │   ├── projects.ts
    │   ├── projects.test.ts
    │   ├── plans.ts           plans + plan_snapshots
    │   ├── plans.test.ts
    │   ├── issues.ts          issues CRUD + createIssuesFromPlan + approve
    │   ├── issues.test.ts
    │   ├── wireframes.ts
    │   └── wireframes.test.ts
    ├── handoff.ts              .harness/issues/{number}.yaml 시딩
    ├── handoff.test.ts
    ├── rest/
    │   ├── app.ts               express 앱 조립
    │   └── app.test.ts          supertest
    ├── mcp/
    │   └── server.ts            MCP tool 등록
    └── index.ts                 :4000 부팅 (REST + MCP 동시 mount)

apps/issue-board/
├── package.json / tsconfig.json / next.config.ts
└── src/
    ├── lib/
    │   ├── api.ts               REST 클라이언트 함수
    │   └── api.test.ts
    ├── components/
    │   ├── ProjectSidebar.tsx
    │   ├── TabNav.tsx
    │   ├── PlanView.tsx
    │   ├── IssueList.tsx
    │   └── WireframeBoard.tsx   박스형 렌더러 + 승인 버튼
    └── app/
        ├── layout.tsx
        ├── page.tsx              프로젝트 목록 (좌측 셸의 루트)
        └── projects/[id]/
            ├── layout.tsx        좌측 사이드바 + 우측 탭 셸
            ├── plan/page.tsx
            ├── issues/page.tsx
            └── wireframe/page.tsx

harness_global/.claude/skills/dev/SKILL.md   Phase 0에 "빈 runs 시딩 이슈 = 최초 실행" 규칙 추가 (기존 파일 수정)
```

---

## Task 1: MCP 서버 프로젝트 스캐폴드

**Files:**
- Create: `apps/issue-board-mcp/package.json`
- Create: `apps/issue-board-mcp/tsconfig.json`
- Create: `apps/issue-board-mcp/vitest.config.ts`

- [ ] **Step 1: package.json 작성**

```json
{
  "name": "issue-board-mcp",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "test": "vitest run"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.12.0",
    "better-sqlite3": "^11.3.0",
    "express": "^4.19.2",
    "js-yaml": "^4.1.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.11",
    "@types/express": "^4.17.21",
    "@types/js-yaml": "^4.0.9",
    "@types/node": "^22",
    "@types/supertest": "^6.0.2",
    "supertest": "^7.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: tsconfig.json 작성**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: vitest.config.ts 작성**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
  },
})
```

- [ ] **Step 4: 의존성 설치**

Run: `cd apps/issue-board-mcp && npm install`
Expected: `node_modules` 생성, 에러 없이 종료

- [ ] **Step 5: Commit**

```bash
git add apps/issue-board-mcp/package.json apps/issue-board-mcp/tsconfig.json apps/issue-board-mcp/vitest.config.ts apps/issue-board-mcp/package-lock.json
git commit -m "feat(issue-board-mcp): 프로젝트 스캐폴드"
```

---

## Task 2: 공유 타입 정의

**Files:**
- Create: `apps/issue-board-mcp/src/types.ts`

- [ ] **Step 1: 타입 작성** (테스트 없음 — 타입 전용 파일)

```ts
export type PlanStatus = 'draft' | 'approved'
export type IssueStatus = 'planned' | 'wireframed' | 'dev_approved'
export type Priority = '높음' | '보통' | '낮음'

export interface MvpFeature {
  priority: Priority
  title: string
  description: string
}

export interface PlanSections {
  overview: string
  targetUsers: string
  mvpFeatures: MvpFeature[]
  outOfScope: string
}

export interface Project {
  id: number
  rootPath: string
  name: string
}

export interface Plan {
  id: number
  projectId: number
  title: string
  sections: PlanSections
  status: PlanStatus
  createdAt: string
  updatedAt: string
}

export interface PlanSnapshot {
  id: number
  planId: number
  label: string
  content: PlanSections
  createdAt: string
}

export interface Issue {
  id: number
  projectId: number
  number: number
  planId: number | null
  title: string
  priority: Priority
  description: string
  status: IssueStatus
  createdAt: string
  updatedAt: string
}

export interface WireframeRegion {
  type: string
  label: string
}

export interface WireframeScreen {
  name: string
  route: string | null
  layout: { regions: WireframeRegion[] }
}

export interface Wireframe {
  id: number
  issueId: number
  screens: WireframeScreen[]
  createdAt: string
  updatedAt: string
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/issue-board-mcp/src/types.ts
git commit -m "feat(issue-board-mcp): 공유 타입 정의"
```

---

## Task 3: SQLite 연결 + 스키마 초기화

**Files:**
- Create: `apps/issue-board-mcp/src/db.ts`
- Test: `apps/issue-board-mcp/src/db.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// src/db.test.ts
import { describe, it, expect } from 'vitest'
import { createDb } from './db.js'

describe('createDb', () => {
  it('creates all required tables', () => {
    const db = createDb(':memory:')
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all()
      .map((r: any) => r.name)

    expect(tables).toContain('projects')
    expect(tables).toContain('plans')
    expect(tables).toContain('plan_snapshots')
    expect(tables).toContain('issues')
    expect(tables).toContain('wireframes')
  })

  it('enforces unique (project_id, number) on issues', () => {
    const db = createDb(':memory:')
    db.prepare(
      "INSERT INTO projects (root_path, name) VALUES ('/tmp/p', 'p')"
    ).run()
    const now = new Date().toISOString()
    db.prepare(
      `INSERT INTO issues (project_id, number, plan_id, title, priority, description, status, created_at, updated_at)
       VALUES (1, 1, NULL, 't', '보통', 'd', 'planned', ?, ?)`
    ).run(now, now)

    expect(() =>
      db
        .prepare(
          `INSERT INTO issues (project_id, number, plan_id, title, priority, description, status, created_at, updated_at)
           VALUES (1, 1, NULL, 't2', '보통', 'd2', 'planned', ?, ?)`
        )
        .run(now, now)
    ).toThrow()
  })
})
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `cd apps/issue-board-mcp && npx vitest run src/db.test.ts`
Expected: FAIL — `Cannot find module './db.js'`

- [ ] **Step 3: db.ts 구현**

```ts
// src/db.ts
import Database from 'better-sqlite3'

export function createDb(filename: string): Database.Database {
  const db = new Database(filename)
  db.pragma('journal_mode = WAL')
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      root_path TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id),
      title TEXT NOT NULL,
      sections TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS plan_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id INTEGER NOT NULL REFERENCES plans(id),
      label TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id),
      number INTEGER NOT NULL,
      plan_id INTEGER REFERENCES plans(id),
      title TEXT NOT NULL,
      priority TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'planned',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(project_id, number)
    );

    CREATE TABLE IF NOT EXISTS wireframes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_id INTEGER NOT NULL UNIQUE REFERENCES issues(id),
      screens TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `)
  return db
}
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `cd apps/issue-board-mcp && npx vitest run src/db.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/issue-board-mcp/src/db.ts apps/issue-board-mcp/src/db.test.ts
git commit -m "feat(issue-board-mcp): SQLite 스키마 초기화"
```

---

## Task 4: projects 모델

**Files:**
- Create: `apps/issue-board-mcp/src/models/projects.ts`
- Test: `apps/issue-board-mcp/src/models/projects.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// src/models/projects.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import type Database from 'better-sqlite3'
import { createDb } from '../db.js'
import { getOrCreateProject, getProject } from './projects.js'

describe('projects model', () => {
  let db: Database.Database
  beforeEach(() => {
    db = createDb(':memory:')
  })

  it('creates a project on first call and reuses it on second', () => {
    const p1 = getOrCreateProject(db, '/tmp/my-project')
    const p2 = getOrCreateProject(db, '/tmp/my-project')
    expect(p1.id).toBe(p2.id)
    expect(p1.name).toBe('my-project')
  })

  it('getProject returns null for unknown id', () => {
    expect(getProject(db, 999)).toBeNull()
  })
})
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `cd apps/issue-board-mcp && npx vitest run src/models/projects.test.ts`
Expected: FAIL — `Cannot find module './projects.js'`

- [ ] **Step 3: projects.ts 구현**

```ts
// src/models/projects.ts
import type Database from 'better-sqlite3'
import path from 'node:path'
import type { Project } from '../types.js'

export function getOrCreateProject(db: Database.Database, rootPath: string): Project {
  const existing = db
    .prepare('SELECT id, root_path as rootPath, name FROM projects WHERE root_path = ?')
    .get(rootPath) as Project | undefined
  if (existing) return existing

  const name = path.basename(rootPath)
  const result = db
    .prepare('INSERT INTO projects (root_path, name) VALUES (?, ?)')
    .run(rootPath, name)
  return { id: Number(result.lastInsertRowid), rootPath, name }
}

export function getProject(db: Database.Database, id: number): Project | null {
  const row = db
    .prepare('SELECT id, root_path as rootPath, name FROM projects WHERE id = ?')
    .get(id) as Project | undefined
  return row ?? null
}
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `cd apps/issue-board-mcp && npx vitest run src/models/projects.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/issue-board-mcp/src/models/projects.ts apps/issue-board-mcp/src/models/projects.test.ts
git commit -m "feat(issue-board-mcp): projects 모델"
```

---

## Task 5: plans 모델 (+ 스냅샷)

**Files:**
- Create: `apps/issue-board-mcp/src/models/plans.ts`
- Test: `apps/issue-board-mcp/src/models/plans.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// src/models/plans.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import type Database from 'better-sqlite3'
import { createDb } from '../db.js'
import { getOrCreateProject } from './projects.js'
import { createPlan, updatePlanSections, approvePlan, snapshotPlan, getPlan, listSnapshots } from './plans.js'
import type { PlanSections } from '../types.js'

const sections: PlanSections = {
  overview: '개요',
  targetUsers: '타깃',
  mvpFeatures: [{ priority: '높음', title: '로그인', description: '이메일 로그인' }],
  outOfScope: '없음',
}

describe('plans model', () => {
  let db: Database.Database
  let projectId: number
  beforeEach(() => {
    db = createDb(':memory:')
    projectId = getOrCreateProject(db, '/tmp/p').id
  })

  it('creates a draft plan', () => {
    const plan = createPlan(db, projectId, '내 프로젝트', sections)
    expect(plan.status).toBe('draft')
    expect(plan.sections.mvpFeatures).toHaveLength(1)
  })

  it('updatePlanSections overwrites sections without creating a snapshot', () => {
    const plan = createPlan(db, projectId, '내 프로젝트', sections)
    updatePlanSections(db, plan.id, { ...sections, overview: '수정된 개요' })
    expect(getPlan(db, plan.id)?.sections.overview).toBe('수정된 개요')
    expect(listSnapshots(db, plan.id)).toHaveLength(0)
  })

  it('approvePlan sets status=approved and creates an automatic snapshot', () => {
    const plan = createPlan(db, projectId, '내 프로젝트', sections)
    approvePlan(db, plan.id)
    expect(getPlan(db, plan.id)?.status).toBe('approved')
    const snaps = listSnapshots(db, plan.id)
    expect(snaps).toHaveLength(1)
    expect(snaps[0].label).toBe('approved')
  })

  it('snapshotPlan adds a manual snapshot with given label', () => {
    const plan = createPlan(db, projectId, '내 프로젝트', sections)
    snapshotPlan(db, plan.id, 'MVP 범위 축소')
    expect(listSnapshots(db, plan.id).map((s) => s.label)).toEqual(['MVP 범위 축소'])
  })
})
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `cd apps/issue-board-mcp && npx vitest run src/models/plans.test.ts`
Expected: FAIL — `Cannot find module './plans.js'`

- [ ] **Step 3: plans.ts 구현**

```ts
// src/models/plans.ts
import type Database from 'better-sqlite3'
import type { Plan, PlanSections, PlanSnapshot } from '../types.js'

function rowToPlan(row: any): Plan {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    sections: JSON.parse(row.sections),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function createPlan(
  db: Database.Database,
  projectId: number,
  title: string,
  sections: PlanSections
): Plan {
  const now = new Date().toISOString()
  const result = db
    .prepare(
      `INSERT INTO plans (project_id, title, sections, status, created_at, updated_at)
       VALUES (?, ?, ?, 'draft', ?, ?)`
    )
    .run(projectId, title, JSON.stringify(sections), now, now)
  return getPlan(db, Number(result.lastInsertRowid))!
}

export function getPlan(db: Database.Database, id: number): Plan | null {
  const row = db.prepare('SELECT * FROM plans WHERE id = ?').get(id)
  return row ? rowToPlan(row) : null
}

export function updatePlanSections(db: Database.Database, id: number, sections: PlanSections): void {
  db.prepare('UPDATE plans SET sections = ?, updated_at = ? WHERE id = ?').run(
    JSON.stringify(sections),
    new Date().toISOString(),
    id
  )
}

export function approvePlan(db: Database.Database, id: number): void {
  const now = new Date().toISOString()
  db.prepare("UPDATE plans SET status = 'approved', updated_at = ? WHERE id = ?").run(now, id)
  snapshotPlan(db, id, 'approved')
}

export function snapshotPlan(db: Database.Database, planId: number, label: string): PlanSnapshot {
  const plan = getPlan(db, planId)
  if (!plan) throw new Error(`plan ${planId} not found`)
  const now = new Date().toISOString()
  const result = db
    .prepare('INSERT INTO plan_snapshots (plan_id, label, content, created_at) VALUES (?, ?, ?, ?)')
    .run(planId, label, JSON.stringify(plan.sections), now)
  return { id: Number(result.lastInsertRowid), planId, label, content: plan.sections, createdAt: now }
}

export function listSnapshots(db: Database.Database, planId: number): PlanSnapshot[] {
  const rows = db
    .prepare('SELECT * FROM plan_snapshots WHERE plan_id = ? ORDER BY id ASC')
    .all(planId) as any[]
  return rows.map((r) => ({
    id: r.id,
    planId: r.plan_id,
    label: r.label,
    content: JSON.parse(r.content),
    createdAt: r.created_at,
  }))
}
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `cd apps/issue-board-mcp && npx vitest run src/models/plans.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/issue-board-mcp/src/models/plans.ts apps/issue-board-mcp/src/models/plans.test.ts
git commit -m "feat(issue-board-mcp): plans 모델 + 스냅샷"
```

---

## Task 6: issues 모델 (+ createIssuesFromPlan, approve)

**Files:**
- Create: `apps/issue-board-mcp/src/models/issues.ts`
- Test: `apps/issue-board-mcp/src/models/issues.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// src/models/issues.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import type Database from 'better-sqlite3'
import { createDb } from '../db.js'
import { getOrCreateProject } from './projects.js'
import { createPlan } from './plans.js'
import {
  createIssuesFromPlan,
  listIssuesByProject,
  getIssue,
  setIssueStatus,
} from './issues.js'
import type { PlanSections } from '../types.js'

const sections: PlanSections = {
  overview: 'o',
  targetUsers: 't',
  mvpFeatures: [
    { priority: '높음', title: '로그인', description: '이메일 로그인' },
    { priority: '보통', title: '프로필 편집', description: '이름/사진 수정' },
  ],
  outOfScope: 'x',
}

describe('issues model', () => {
  let db: Database.Database
  let projectId: number
  let planId: number
  beforeEach(() => {
    db = createDb(':memory:')
    projectId = getOrCreateProject(db, '/tmp/p').id
    planId = createPlan(db, projectId, 'p', sections).id
  })

  it('creates one issue per mvpFeatures row, numbered from 1 within the project', () => {
    const issues = createIssuesFromPlan(db, projectId, planId, sections.mvpFeatures)
    expect(issues).toHaveLength(2)
    expect(issues.map((i) => i.number)).toEqual([1, 2])
    expect(issues.every((i) => i.status === 'planned')).toBe(true)
  })

  it('numbers continue from the existing max for the project', () => {
    createIssuesFromPlan(db, projectId, planId, sections.mvpFeatures)
    const more = createIssuesFromPlan(db, projectId, planId, [sections.mvpFeatures[0]])
    expect(more[0].number).toBe(3)
  })

  it('numbering is independent per project', () => {
    const otherProjectId = getOrCreateProject(db, '/tmp/other').id
    const otherPlanId = createPlan(db, otherProjectId, 'p2', sections).id
    createIssuesFromPlan(db, projectId, planId, sections.mvpFeatures)
    const otherIssues = createIssuesFromPlan(db, otherProjectId, otherPlanId, [sections.mvpFeatures[0]])
    expect(otherIssues[0].number).toBe(1)
  })

  it('setIssueStatus updates status and is idempotent', () => {
    const [issue] = createIssuesFromPlan(db, projectId, planId, [sections.mvpFeatures[0]])
    setIssueStatus(db, issue.id, 'wireframed')
    expect(getIssue(db, issue.id)?.status).toBe('wireframed')
    setIssueStatus(db, issue.id, 'wireframed')
    expect(getIssue(db, issue.id)?.status).toBe('wireframed')
  })

  it('listIssuesByProject returns issues ordered by number', () => {
    createIssuesFromPlan(db, projectId, planId, sections.mvpFeatures)
    const list = listIssuesByProject(db, projectId)
    expect(list.map((i) => i.number)).toEqual([1, 2])
  })
})
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `cd apps/issue-board-mcp && npx vitest run src/models/issues.test.ts`
Expected: FAIL — `Cannot find module './issues.js'`

- [ ] **Step 3: issues.ts 구현**

```ts
// src/models/issues.ts
import type Database from 'better-sqlite3'
import type { Issue, IssueStatus, MvpFeature } from '../types.js'

function rowToIssue(row: any): Issue {
  return {
    id: row.id,
    projectId: row.project_id,
    number: row.number,
    planId: row.plan_id,
    title: row.title,
    priority: row.priority,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function createIssuesFromPlan(
  db: Database.Database,
  projectId: number,
  planId: number,
  features: MvpFeature[]
): Issue[] {
  const insert = db.prepare(
    `INSERT INTO issues (project_id, number, plan_id, title, priority, description, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'planned', ?, ?)`
  )
  const nextNumber = () => {
    const row = db
      .prepare('SELECT COALESCE(MAX(number), 0) as maxNumber FROM issues WHERE project_id = ?')
      .get(projectId) as { maxNumber: number }
    return row.maxNumber + 1
  }

  const created: Issue[] = []
  const now = new Date().toISOString()
  for (const feature of features) {
    const number = nextNumber()
    const result = insert.run(
      projectId,
      number,
      planId,
      feature.title,
      feature.priority,
      feature.description,
      now,
      now
    )
    created.push(getIssue(db, Number(result.lastInsertRowid))!)
  }
  return created
}

export function getIssue(db: Database.Database, id: number): Issue | null {
  const row = db.prepare('SELECT * FROM issues WHERE id = ?').get(id)
  return row ? rowToIssue(row) : null
}

export function listIssuesByProject(db: Database.Database, projectId: number): Issue[] {
  const rows = db
    .prepare('SELECT * FROM issues WHERE project_id = ? ORDER BY number ASC')
    .all(projectId) as any[]
  return rows.map(rowToIssue)
}

export function setIssueStatus(db: Database.Database, id: number, status: IssueStatus): void {
  db.prepare('UPDATE issues SET status = ?, updated_at = ? WHERE id = ?').run(
    status,
    new Date().toISOString(),
    id
  )
}
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `cd apps/issue-board-mcp && npx vitest run src/models/issues.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/issue-board-mcp/src/models/issues.ts apps/issue-board-mcp/src/models/issues.test.ts
git commit -m "feat(issue-board-mcp): issues 모델 + 프로젝트별 넘버링"
```

---

## Task 7: wireframes 모델

**Files:**
- Create: `apps/issue-board-mcp/src/models/wireframes.ts`
- Test: `apps/issue-board-mcp/src/models/wireframes.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// src/models/wireframes.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import type Database from 'better-sqlite3'
import { createDb } from '../db.js'
import { getOrCreateProject } from './projects.js'
import { createPlan } from './plans.js'
import { createIssuesFromPlan } from './issues.js'
import { upsertWireframe, getWireframeByIssue } from './wireframes.js'
import type { PlanSections, WireframeScreen } from '../types.js'

const sections: PlanSections = {
  overview: 'o',
  targetUsers: 't',
  mvpFeatures: [{ priority: '높음', title: '로그인', description: 'd' }],
  outOfScope: 'x',
}

const screens: WireframeScreen[] = [
  {
    name: '로그인 화면',
    route: '/login',
    layout: { regions: [{ type: 'nav', label: '상단 네비' }, { type: 'content', label: '로그인 폼' }] },
  },
]

describe('wireframes model', () => {
  let db: Database.Database
  let issueId: number
  beforeEach(() => {
    db = createDb(':memory:')
    const projectId = getOrCreateProject(db, '/tmp/p').id
    const planId = createPlan(db, projectId, 'p', sections).id
    issueId = createIssuesFromPlan(db, projectId, planId, sections.mvpFeatures)[0].id
  })

  it('returns null when no wireframe exists yet', () => {
    expect(getWireframeByIssue(db, issueId)).toBeNull()
  })

  it('upsertWireframe creates then updates the same row', () => {
    const first = upsertWireframe(db, issueId, screens)
    expect(first.screens).toHaveLength(1)

    const updatedScreens = [...screens, { ...screens[0], name: '로그인 화면 v2', route: '/login2' }]
    const second = upsertWireframe(db, issueId, updatedScreens)
    expect(second.id).toBe(first.id)
    expect(second.screens).toHaveLength(2)
    expect(getWireframeByIssue(db, issueId)?.screens).toHaveLength(2)
  })
})
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `cd apps/issue-board-mcp && npx vitest run src/models/wireframes.test.ts`
Expected: FAIL — `Cannot find module './wireframes.js'`

- [ ] **Step 3: wireframes.ts 구현**

```ts
// src/models/wireframes.ts
import type Database from 'better-sqlite3'
import type { Wireframe, WireframeScreen } from '../types.js'

function rowToWireframe(row: any): Wireframe {
  return {
    id: row.id,
    issueId: row.issue_id,
    screens: JSON.parse(row.screens),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function getWireframeByIssue(db: Database.Database, issueId: number): Wireframe | null {
  const row = db.prepare('SELECT * FROM wireframes WHERE issue_id = ?').get(issueId)
  return row ? rowToWireframe(row) : null
}

export function upsertWireframe(
  db: Database.Database,
  issueId: number,
  screens: WireframeScreen[]
): Wireframe {
  const existing = getWireframeByIssue(db, issueId)
  const now = new Date().toISOString()

  if (existing) {
    db.prepare('UPDATE wireframes SET screens = ?, updated_at = ? WHERE issue_id = ?').run(
      JSON.stringify(screens),
      now,
      issueId
    )
    return getWireframeByIssue(db, issueId)!
  }

  const result = db
    .prepare('INSERT INTO wireframes (issue_id, screens, created_at, updated_at) VALUES (?, ?, ?, ?)')
    .run(issueId, JSON.stringify(screens), now, now)
  return { id: Number(result.lastInsertRowid), issueId, screens, createdAt: now, updatedAt: now }
}
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `cd apps/issue-board-mcp && npx vitest run src/models/wireframes.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/issue-board-mcp/src/models/wireframes.ts apps/issue-board-mcp/src/models/wireframes.test.ts
git commit -m "feat(issue-board-mcp): wireframes 모델"
```

---

## Task 8: 개발 승인 핸드오프 (.harness/issues/{number}.yaml 시딩)

**Files:**
- Create: `apps/issue-board-mcp/src/handoff.ts`
- Test: `apps/issue-board-mcp/src/handoff.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// src/handoff.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import yaml from 'js-yaml'
import { seedIssueYaml } from './handoff.js'
import type { Issue } from './types.js'

describe('seedIssueYaml', () => {
  let tmpDir: string
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'issue-board-'))
  })
  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('writes .harness/issues/{number}.yaml with runs: [] and status: active', () => {
    const issue: Issue = {
      id: 1,
      projectId: 1,
      number: 7,
      planId: 1,
      title: '로그인',
      priority: '높음',
      description: '이메일 로그인',
      status: 'dev_approved',
      createdAt: '2026-07-13T00:00:00.000Z',
      updatedAt: '2026-07-13T00:00:00.000Z',
    }

    seedIssueYaml(tmpDir, issue)

    const written = fs.readFileSync(path.join(tmpDir, '.harness/issues/7.yaml'), 'utf-8')
    const parsed = yaml.load(written) as any
    expect(parsed.id).toBe(7)
    expect(parsed.title).toBe('로그인')
    expect(parsed.status).toBe('active')
    expect(parsed.runs).toEqual([])
    expect(parsed.files).toEqual([])
  })

  it('is idempotent — calling twice does not throw and keeps id stable', () => {
    const issue: Issue = {
      id: 1,
      projectId: 1,
      number: 3,
      planId: 1,
      title: 't',
      priority: '보통',
      description: 'd',
      status: 'dev_approved',
      createdAt: '2026-07-13T00:00:00.000Z',
      updatedAt: '2026-07-13T00:00:00.000Z',
    }
    seedIssueYaml(tmpDir, issue)
    expect(() => seedIssueYaml(tmpDir, issue)).not.toThrow()
    const parsed = yaml.load(
      fs.readFileSync(path.join(tmpDir, '.harness/issues/3.yaml'), 'utf-8')
    ) as any
    expect(parsed.id).toBe(3)
  })
})
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `cd apps/issue-board-mcp && npx vitest run src/handoff.test.ts`
Expected: FAIL — `Cannot find module './handoff.js'`

- [ ] **Step 3: handoff.ts 구현**

이 파일은 `apps/harness-hub/src/lib/issues.ts`가 읽는 기존 `IssueYaml` 스키마(`id`, `title`, `status`, `created_at`, `updated_at`, `runs`, `files`)를 그대로 따른다 — 필드명을 다르게 쓰면 기존 dev 파이프라인의 harness-report.sh가 이어서 append할 때 깨진다.

```ts
// src/handoff.ts
import fs from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'
import type { Issue } from './types.js'

export function seedIssueYaml(projectRoot: string, issue: Issue): void {
  const dir = path.join(projectRoot, '.harness/issues')
  fs.mkdirSync(dir, { recursive: true })

  const filePath = path.join(dir, `${issue.number}.yaml`)
  const doc = {
    version: 1,
    id: issue.number,
    title: issue.title,
    status: 'active',
    created_at: issue.createdAt,
    updated_at: issue.updatedAt,
    runs: [],
    files: [],
  }

  fs.writeFileSync(filePath, yaml.dump(doc), 'utf-8')
}
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `cd apps/issue-board-mcp && npx vitest run src/handoff.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/issue-board-mcp/src/handoff.ts apps/issue-board-mcp/src/handoff.test.ts
git commit -m "feat(issue-board-mcp): 개발 승인 시 .harness/issues 시딩"
```

---

## Task 9: REST API (express)

**Files:**
- Create: `apps/issue-board-mcp/src/rest/app.ts`
- Test: `apps/issue-board-mcp/src/rest/app.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// src/rest/app.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import type Database from 'better-sqlite3'
import request from 'supertest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createDb } from '../db.js'
import { createApp } from './app.js'

describe('REST API', () => {
  let db: Database.Database
  let app: ReturnType<typeof createApp>
  let projectRoot: string

  beforeEach(() => {
    db = createDb(':memory:')
    projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'issue-board-rest-'))
    app = createApp(db)
  })

  it('POST /api/projects creates or reuses a project', async () => {
    const res = await request(app).post('/api/projects').send({ rootPath: projectRoot })
    expect(res.status).toBe(200)
    expect(res.body.name).toBe(path.basename(projectRoot))
  })

  it('full flow: create plan -> approve -> issues created -> wireframe -> approve issue seeds yaml', async () => {
    const project = (await request(app).post('/api/projects').send({ rootPath: projectRoot })).body

    const sections = {
      overview: 'o',
      targetUsers: 't',
      mvpFeatures: [{ priority: '높음', title: '로그인', description: 'd' }],
      outOfScope: 'x',
    }
    const plan = (
      await request(app).post(`/api/projects/${project.id}/plans`).send({ title: 'p', sections })
    ).body
    expect(plan.status).toBe('draft')

    const approveRes = await request(app).post(`/api/plans/${plan.id}/approve`)
    expect(approveRes.status).toBe(200)

    const issuesRes = await request(app).get(`/api/projects/${project.id}/issues`)
    expect(issuesRes.body).toHaveLength(1)
    const issue = issuesRes.body[0]
    expect(issue.number).toBe(1)
    expect(issue.status).toBe('planned')

    const screens = [
      { name: '로그인', route: '/login', layout: { regions: [{ type: 'content', label: '폼' }] } },
    ]
    const wfRes = await request(app)
      .put(`/api/issues/${issue.id}/wireframe`)
      .send({ screens })
    expect(wfRes.status).toBe(200)
    expect(wfRes.body.screens).toHaveLength(1)

    const issueAfterWf = (await request(app).get(`/api/issues/${issue.id}`)).body
    expect(issueAfterWf.status).toBe('wireframed')

    const approveIssueRes = await request(app).post(`/api/issues/${issue.id}/approve`)
    expect(approveIssueRes.status).toBe(200)
    expect(approveIssueRes.body.status).toBe('dev_approved')

    const yamlPath = path.join(projectRoot, '.harness/issues/1.yaml')
    expect(fs.existsSync(yamlPath)).toBe(true)
  })
})
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `cd apps/issue-board-mcp && npx vitest run src/rest/app.test.ts`
Expected: FAIL — `Cannot find module './app.js'`

- [ ] **Step 3: app.ts 구현**

```ts
// src/rest/app.ts
import express from 'express'
import type Database from 'better-sqlite3'
import { getOrCreateProject, getProject } from '../models/projects.js'
import { createPlan, approvePlan, getPlan } from '../models/plans.js'
import { createIssuesFromPlan, listIssuesByProject, getIssue, setIssueStatus } from '../models/issues.js'
import { upsertWireframe, getWireframeByIssue } from '../models/wireframes.js'
import { seedIssueYaml } from '../handoff.js'

export function createApp(db: Database.Database) {
  const app = express()
  app.use(express.json())

  app.post('/api/projects', (req, res) => {
    const project = getOrCreateProject(db, req.body.rootPath)
    res.json(project)
  })

  app.post('/api/projects/:projectId/plans', (req, res) => {
    const plan = createPlan(db, Number(req.params.projectId), req.body.title, req.body.sections)
    res.json(plan)
  })

  app.get('/api/plans/:id', (req, res) => {
    const plan = getPlan(db, Number(req.params.id))
    if (!plan) return res.status(404).json({ error: 'not found' })
    res.json(plan)
  })

  app.post('/api/plans/:id/approve', (req, res) => {
    const planId = Number(req.params.id)
    approvePlan(db, planId)
    const plan = getPlan(db, planId)!
    const issues = createIssuesFromPlan(db, plan.projectId, planId, plan.sections.mvpFeatures)
    res.json({ plan, issues })
  })

  app.get('/api/projects/:projectId/issues', (req, res) => {
    res.json(listIssuesByProject(db, Number(req.params.projectId)))
  })

  app.get('/api/issues/:id', (req, res) => {
    const issue = getIssue(db, Number(req.params.id))
    if (!issue) return res.status(404).json({ error: 'not found' })
    res.json(issue)
  })

  app.put('/api/issues/:id/wireframe', (req, res) => {
    const issueId = Number(req.params.id)
    const wireframe = upsertWireframe(db, issueId, req.body.screens)
    setIssueStatus(db, issueId, 'wireframed')
    res.json(wireframe)
  })

  app.get('/api/issues/:id/wireframe', (req, res) => {
    const wireframe = getWireframeByIssue(db, Number(req.params.id))
    if (!wireframe) return res.status(404).json({ error: 'not found' })
    res.json(wireframe)
  })

  app.post('/api/issues/:id/approve', (req, res) => {
    const issueId = Number(req.params.id)
    const issue = getIssue(db, issueId)
    if (!issue) return res.status(404).json({ error: 'not found' })

    setIssueStatus(db, issueId, 'dev_approved')
    const updated = getIssue(db, issueId)!
    const project = getProject(db, updated.projectId)!
    seedIssueYaml(project.rootPath, updated)
    res.json(updated)
  })

  return app
}
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `cd apps/issue-board-mcp && npx vitest run src/rest/app.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/issue-board-mcp/src/rest/app.ts apps/issue-board-mcp/src/rest/app.test.ts
git commit -m "feat(issue-board-mcp): REST API (projects/plans/issues/wireframes)"
```

---

## Task 10: MCP 서버 (에이전트용 tool 등록)

**Files:**
- Create: `apps/issue-board-mcp/src/mcp/server.ts`

MCP tool 핸들러는 REST와 같은 모델 함수를 그대로 호출하므로 별도 단위테스트 없이 REST 테스트(Task 9)로 로직 커버리지를 확보한다. 이 파일은 SDK 연결부만 담당한다.

- [ ] **Step 1: server.ts 구현**

```ts
// src/mcp/server.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type Database from 'better-sqlite3'
import { getOrCreateProject, getProject } from '../models/projects.js'
import { createPlan, approvePlan, getPlan, snapshotPlan, updatePlanSections } from '../models/plans.js'
import { createIssuesFromPlan } from '../models/issues.js'
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
        approvePlan(db, planId)
        const plan = getPlan(db, planId)!
        const issues = createIssuesFromPlan(db, plan.projectId, planId, plan.sections.mvpFeatures)
        return { content: [{ type: 'text', text: JSON.stringify({ plan, issues }) }] }
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
      const wireframe = upsertWireframe(db, issueId, screens)
      return { content: [{ type: 'text', text: JSON.stringify(wireframe) }] }
    }
  )

  return server
}

export { getProject }
```

- [ ] **Step 2: 빌드 확인 (타입 체크)**

Run: `cd apps/issue-board-mcp && npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add apps/issue-board-mcp/src/mcp/server.ts
git commit -m "feat(issue-board-mcp): MCP tool 등록 (create_plan/update_plan/snapshot_plan/create_wireframe)"
```

---

## Task 11: 서버 부팅 (index.ts, :4000)

**Files:**
- Create: `apps/issue-board-mcp/src/index.ts`

- [ ] **Step 1: index.ts 구현**

```ts
// src/index.ts
import path from 'node:path'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import express from 'express'
import { createDb } from './db.js'
import { createApp } from './rest/app.js'
import { createMcpServer } from './mcp/server.js'

const PORT = Number(process.env.PORT ?? 4000)
const DB_PATH = process.env.ISSUE_BOARD_DB ?? path.join(process.cwd(), 'issue-board.db')

const db = createDb(DB_PATH)
const restApp = createApp(db)

restApp.post('/mcp', express.json(), async (req, res) => {
  const server = createMcpServer(db)
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
  res.on('close', () => {
    transport.close()
    server.close()
  })
  await server.connect(transport)
  await transport.handleRequest(req, res, req.body)
})

restApp.listen(PORT, () => {
  console.log(`issue-board-mcp listening on :${PORT} (REST /api/*, MCP /mcp), db=${DB_PATH}`)
})
```

- [ ] **Step 2: 로컬 기동 확인**

Run: `cd apps/issue-board-mcp && npm run dev &` 후 `curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:4000/api/projects -H 'content-type: application/json' -d '{"rootPath":"/tmp/x"}'`
Expected: `200`
확인 후: `kill %1` (또는 `lsof -ti:4000 | xargs kill`)로 종료

- [ ] **Step 3: Commit**

```bash
git add apps/issue-board-mcp/src/index.ts
git commit -m "feat(issue-board-mcp): :4000 부팅 (REST + MCP 동시 mount)"
```

---

## Task 12: Next.js 대시보드 스캐폴드

**Files:**
- Create: `apps/issue-board/package.json`
- Create: `apps/issue-board/tsconfig.json`
- Create: `apps/issue-board/next.config.ts`
- Create: `apps/issue-board/src/app/layout.tsx`
- Create: `apps/issue-board/src/app/globals.css`

harness-hub(`apps/harness-hub/package.json`)와 동일한 Next 15 / React 19 / Tailwind 4 버전대를 그대로 따른다.

- [ ] **Step 1: package.json 작성**

```json
{
  "name": "issue-board",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --port 5173",
    "build": "next build",
    "start": "next start --port 5173"
  },
  "dependencies": {
    "next": "^15.3.3",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^22",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "tailwindcss": "^4",
    "typescript": "^5",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: tsconfig.json (harness-hub와 동일 구조)**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: next.config.ts**

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {}

export default nextConfig
```

- [ ] **Step 4: globals.css (Tailwind 4)**

```css
@import 'tailwindcss';
```

- [ ] **Step 5: 루트 레이아웃**

```tsx
// src/app/layout.tsx
import './globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-zinc-50 text-zinc-900">{children}</body>
    </html>
  )
}
```

- [ ] **Step 6: 의존성 설치**

Run: `cd apps/issue-board && npm install`
Expected: 에러 없이 종료

- [ ] **Step 7: Commit**

```bash
git add apps/issue-board/package.json apps/issue-board/tsconfig.json apps/issue-board/next.config.ts apps/issue-board/src/app/layout.tsx apps/issue-board/src/app/globals.css apps/issue-board/package-lock.json
git commit -m "feat(issue-board): Next.js 대시보드 스캐폴드"
```

---

## Task 13: REST 클라이언트 (lib/api.ts)

**Files:**
- Create: `apps/issue-board/src/lib/api.ts`
- Test: `apps/issue-board/src/lib/api.test.ts`

`ISSUE_BOARD_API_URL` 환경변수로 MCP 서버(:4000) 주소를 받는다 (기본값 `http://localhost:4000`).

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// src/lib/api.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchIssues, approveIssue } from './api.js'

describe('api client', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('fetchIssues calls GET /api/projects/:id/issues and returns parsed json', async () => {
    ;(fetch as any).mockResolvedValue({ ok: true, json: async () => [{ id: 1, number: 1 }] })
    const issues = await fetchIssues(42)
    expect(fetch).toHaveBeenCalledWith('http://localhost:4000/api/projects/42/issues')
    expect(issues).toEqual([{ id: 1, number: 1 }])
  })

  it('approveIssue calls POST /api/issues/:id/approve', async () => {
    ;(fetch as any).mockResolvedValue({ ok: true, json: async () => ({ id: 7, status: 'dev_approved' }) })
    const issue = await approveIssue(7)
    expect(fetch).toHaveBeenCalledWith('http://localhost:4000/api/issues/7/approve', { method: 'POST' })
    expect(issue.status).toBe('dev_approved')
  })
})
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `cd apps/issue-board && npx vitest run src/lib/api.test.ts`
Expected: FAIL — `Cannot find module './api.js'`

- [ ] **Step 3: api.ts 구현**

```ts
// src/lib/api.ts
export interface Issue {
  id: number
  projectId: number
  number: number
  planId: number | null
  title: string
  priority: '높음' | '보통' | '낮음'
  description: string
  status: 'planned' | 'wireframed' | 'dev_approved'
  createdAt: string
  updatedAt: string
}

export interface WireframeScreen {
  name: string
  route: string | null
  layout: { regions: { type: string; label: string }[] }
}

export interface Wireframe {
  id: number
  issueId: number
  screens: WireframeScreen[]
}

export interface Plan {
  id: number
  projectId: number
  title: string
  status: 'draft' | 'approved'
  sections: {
    overview: string
    targetUsers: string
    mvpFeatures: { priority: string; title: string; description: string }[]
    outOfScope: string
  }
}

const BASE_URL = process.env.ISSUE_BOARD_API_URL ?? 'http://localhost:4000'

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`request failed: ${res.status}`)
  return res.json() as Promise<T>
}

export async function fetchIssues(projectId: number): Promise<Issue[]> {
  return json(await fetch(`${BASE_URL}/api/projects/${projectId}/issues`))
}

export async function fetchIssue(issueId: number): Promise<Issue> {
  return json(await fetch(`${BASE_URL}/api/issues/${issueId}`))
}

export async function fetchPlan(planId: number): Promise<Plan> {
  return json(await fetch(`${BASE_URL}/api/plans/${planId}`))
}

export async function fetchWireframe(issueId: number): Promise<Wireframe | null> {
  const res = await fetch(`${BASE_URL}/api/issues/${issueId}/wireframe`)
  if (res.status === 404) return null
  return json(res)
}

export async function approveIssue(issueId: number): Promise<Issue> {
  return json(await fetch(`${BASE_URL}/api/issues/${issueId}/approve`, { method: 'POST' }))
}
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `cd apps/issue-board && npx vitest run src/lib/api.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/issue-board/src/lib/api.ts apps/issue-board/src/lib/api.test.ts
git commit -m "feat(issue-board): REST 클라이언트"
```

---

## Task 14: 프로젝트 사이드바 + 탭 셸

**Files:**
- Create: `apps/issue-board/src/components/ProjectSidebar.tsx`
- Create: `apps/issue-board/src/components/TabNav.tsx`
- Create: `apps/issue-board/src/app/projects/[id]/layout.tsx`

- [ ] **Step 1: ProjectSidebar.tsx**

```tsx
// src/components/ProjectSidebar.tsx
interface Props {
  projects: { id: number; name: string }[]
  activeId: number
}

export default function ProjectSidebar({ projects, activeId }: Props) {
  return (
    <aside className="w-56 shrink-0 border-r border-zinc-200 p-4 space-y-1">
      {projects.map((p) => (
        <a
          key={p.id}
          href={`/projects/${p.id}/plan`}
          className={`block px-3 py-2 rounded-lg text-sm ${
            p.id === activeId ? 'bg-indigo-50 text-indigo-800' : 'text-zinc-600 hover:bg-zinc-100'
          }`}
        >
          {p.name}
        </a>
      ))}
    </aside>
  )
}
```

- [ ] **Step 2: TabNav.tsx**

```tsx
// src/components/TabNav.tsx
const TABS = [
  { href: 'plan', label: '기획' },
  { href: 'issues', label: '이슈' },
  { href: 'wireframe', label: '와이어프레임' },
] as const

export default function TabNav({ projectId, active }: { projectId: number; active: string }) {
  return (
    <nav className="flex gap-1 border-b border-zinc-200 px-6">
      {TABS.map((tab) => (
        <a
          key={tab.href}
          href={`/projects/${projectId}/${tab.href}`}
          className={`px-4 py-3 text-sm border-b-2 -mb-px ${
            active === tab.href
              ? 'border-indigo-600 text-indigo-700 font-medium'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          {tab.label}
        </a>
      ))}
    </nav>
  )
}
```

- [ ] **Step 3: 프로젝트 레이아웃 (좌측 사이드바 + 우측 탭 셸)**

이 시점에는 프로젝트 목록 API가 없으므로(범위 밖), 현재 프로젝트 하나만 사이드바에 표시한다 — 다중 프로젝트 목록 API는 이 플랜 범위 밖으로 남기고 TODO 없이 단일 프로젝트로 하드코딩하지 않기 위해 현재 프로젝트만 조회해서 표시한다.

```tsx
// src/app/projects/[id]/layout.tsx
import ProjectSidebar from '@/components/ProjectSidebar'
import TabNav from '@/components/TabNav'

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const projectId = Number(id)
  const baseUrl = process.env.ISSUE_BOARD_API_URL ?? 'http://localhost:4000'
  const res = await fetch(`${baseUrl}/api/projects/${projectId}`)
  const project = res.ok ? await res.json() : { id: projectId, name: `프로젝트 ${projectId}` }

  return (
    <div className="flex min-h-screen">
      <ProjectSidebar projects={[project]} activeId={projectId} />
      <div className="flex-1 flex flex-col">
        <TabNav projectId={projectId} active="plan" />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
```

> **참고:** `GET /api/projects/:id`는 Task 9에서 만들지 않았다 — Task 15에서 `apps/issue-board-mcp/src/rest/app.ts`에 라우트를 추가한다.

- [ ] **Step 4: Commit**

```bash
git add apps/issue-board/src/components/ProjectSidebar.tsx apps/issue-board/src/components/TabNav.tsx apps/issue-board/src/app/projects/[id]/layout.tsx
git commit -m "feat(issue-board): 프로젝트 사이드바 + 탭 셸"
```

---

## Task 15: GET /api/projects/:id 라우트 추가

**Files:**
- Modify: `apps/issue-board-mcp/src/rest/app.ts`
- Modify: `apps/issue-board-mcp/src/rest/app.test.ts`

- [ ] **Step 1: 실패하는 테스트 추가**

`app.test.ts` 안 `describe('REST API', ...)` 블록에 아래 테스트를 추가한다.

```ts
  it('GET /api/projects/:id returns the project', async () => {
    const project = (await request(app).post('/api/projects').send({ rootPath: projectRoot })).body
    const res = await request(app).get(`/api/projects/${project.id}`)
    expect(res.status).toBe(200)
    expect(res.body.id).toBe(project.id)
  })
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `cd apps/issue-board-mcp && npx vitest run src/rest/app.test.ts`
Expected: FAIL — 404 (라우트 없음)

- [ ] **Step 3: 라우트 추가**

`app.ts`의 `app.post('/api/projects', ...)` 바로 다음에 추가:

```ts
  app.get('/api/projects/:id', (req, res) => {
    const project = getProject(db, Number(req.params.id))
    if (!project) return res.status(404).json({ error: 'not found' })
    res.json(project)
  })
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `cd apps/issue-board-mcp && npx vitest run src/rest/app.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/issue-board-mcp/src/rest/app.ts apps/issue-board-mcp/src/rest/app.test.ts
git commit -m "feat(issue-board-mcp): GET /api/projects/:id 라우트"
```

---

## Task 16: 기획 탭

**Files:**
- Create: `apps/issue-board/src/components/PlanView.tsx`
- Create: `apps/issue-board/src/app/projects/[id]/plan/page.tsx`

기획 탭은 아직 활성 plan의 id를 알 방법이 없다 — 이 플랜에서는 프로젝트당 plan을 조회하는 목록 API를 새로 만들지 않고, `?planId=` 쿼리 파라미터로 넘겨받는 방식으로 범위를 좁힌다 (plan 목록/선택 UX는 후속 작업).

- [ ] **Step 1: PlanView.tsx**

```tsx
// src/components/PlanView.tsx
import type { Plan } from '@/lib/api'

export default function PlanView({ plan }: { plan: Plan }) {
  const PRIORITY_STYLE: Record<string, string> = {
    높음: 'bg-red-50 text-red-700',
    보통: 'bg-amber-50 text-amber-700',
    낮음: 'bg-zinc-100 text-zinc-600',
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">{plan.title}</h1>
        <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">
          {plan.status === 'approved' ? '확정' : '초안'}
        </span>
      </div>

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
```

- [ ] **Step 2: page.tsx**

```tsx
// src/app/projects/[id]/plan/page.tsx
import PlanView from '@/components/PlanView'
import { fetchPlan } from '@/lib/api'

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ planId?: string }>
}) {
  const { planId } = await searchParams
  if (!planId) {
    return <p className="text-sm text-zinc-400">기획이 아직 없습니다. `/ib-plan`으로 먼저 생성하세요.</p>
  }
  const plan = await fetchPlan(Number(planId))
  return <PlanView plan={plan} />
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/issue-board/src/components/PlanView.tsx apps/issue-board/src/app/projects/[id]/plan/page.tsx
git commit -m "feat(issue-board): 기획 탭"
```

---

## Task 17: 이슈 탭

**Files:**
- Create: `apps/issue-board/src/components/IssueList.tsx`
- Create: `apps/issue-board/src/app/projects/[id]/issues/page.tsx`

- [ ] **Step 1: IssueList.tsx**

```tsx
// src/components/IssueList.tsx
import type { Issue } from '@/lib/api'

const STATUS_LABEL: Record<Issue['status'], string> = {
  planned: '기획됨',
  wireframed: '와이어프레임 완료',
  dev_approved: '개발 승인됨',
}

const STATUS_STYLE: Record<Issue['status'], string> = {
  planned: 'bg-zinc-100 text-zinc-600',
  wireframed: 'bg-blue-50 text-blue-700',
  dev_approved: 'bg-emerald-50 text-emerald-700',
}

export default function IssueList({ issues, projectId }: { issues: Issue[]; projectId: number }) {
  if (issues.length === 0) {
    return <p className="text-sm text-zinc-400">이슈가 없습니다. 기획을 먼저 확정하세요.</p>
  }

  return (
    <ul className="space-y-2 max-w-2xl">
      {issues.map((issue) => (
        <li key={issue.id} className="border border-zinc-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-sm text-indigo-700">#{issue.number}</span>
            <span className="font-medium text-sm flex-1">{issue.title}</span>
            <span className={`text-xs px-2 py-0.5 rounded ${STATUS_STYLE[issue.status]}`}>
              {STATUS_LABEL[issue.status]}
            </span>
          </div>
          <p className="text-xs text-zinc-500">{issue.description}</p>
          <a
            href={`/projects/${projectId}/wireframe?issueId=${issue.id}`}
            className="text-xs text-indigo-600 mt-2 inline-block"
          >
            와이어프레임 보기 →
          </a>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 2: page.tsx**

```tsx
// src/app/projects/[id]/issues/page.tsx
import IssueList from '@/components/IssueList'
import { fetchIssues } from '@/lib/api'

export default async function IssuesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const projectId = Number(id)
  const issues = await fetchIssues(projectId)
  return <IssueList issues={issues} projectId={projectId} />
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/issue-board/src/components/IssueList.tsx apps/issue-board/src/app/projects/[id]/issues/page.tsx
git commit -m "feat(issue-board): 이슈 탭"
```

---

## Task 18: 와이어프레임 탭 (박스형 렌더러 + 개발 승인 버튼)

**Files:**
- Create: `apps/issue-board/src/components/WireframeBoard.tsx`
- Create: `apps/issue-board/src/app/projects/[id]/wireframe/page.tsx`

- [ ] **Step 1: WireframeBoard.tsx**

`layout.regions`를 실제 박스로 렌더링한다 (설계 스펙의 "박스형 와이어프레임" 확정안). `type`이 `nav`/`sidebar`/`content`/`footer`면 그에 맞는 배치 클래스를 쓰고, 그 외 타입은 일반 블록으로 렌더한다. 승인 버튼은 클라이언트 컴포넌트로 분리한다.

```tsx
// src/components/WireframeBoard.tsx
'use client'

import { useState } from 'react'
import type { Issue, WireframeScreen } from '@/lib/api'

const REGION_CLASS: Record<string, string> = {
  nav: 'w-full h-10 bg-zinc-200 rounded flex items-center px-3 text-xs text-zinc-600',
  sidebar: 'w-32 shrink-0 bg-zinc-100 rounded p-2 text-xs text-zinc-600',
  content: 'flex-1 bg-zinc-50 border border-dashed border-zinc-300 rounded p-3 text-xs text-zinc-500',
  footer: 'w-full h-8 bg-zinc-100 rounded flex items-center px-3 text-xs text-zinc-500',
}

function ScreenBox({ screen }: { screen: WireframeScreen }) {
  const nav = screen.layout.regions.find((r) => r.type === 'nav')
  const sidebar = screen.layout.regions.find((r) => r.type === 'sidebar')
  const rest = screen.layout.regions.filter((r) => r.type !== 'nav' && r.type !== 'sidebar')

  return (
    <div className="border border-zinc-200 rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{screen.name}</h3>
        {screen.route && <span className="text-xs font-mono text-indigo-600">{screen.route}</span>}
      </div>
      <div className="space-y-2">
        {nav && <div className={REGION_CLASS.nav}>{nav.label}</div>}
        <div className="flex gap-2">
          {sidebar && <div className={REGION_CLASS.sidebar}>{sidebar.label}</div>}
          <div className="flex-1 space-y-2">
            {rest.map((r, i) => (
              <div key={i} className={REGION_CLASS[r.type] ?? REGION_CLASS.content}>
                {r.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function WireframeBoard({
  issue,
  screens,
  onApprove,
}: {
  issue: Issue
  screens: WireframeScreen[]
  onApprove: (issueId: number) => Promise<Issue>
}) {
  const [status, setStatus] = useState(issue.status)
  const [pending, setPending] = useState(false)

  async function handleApprove() {
    setPending(true)
    try {
      const updated = await onApprove(issue.id)
      setStatus(updated.status)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">
          #{issue.number} {issue.title}
        </h1>
        {status === 'dev_approved' ? (
          <span className="text-xs px-3 py-1.5 rounded bg-emerald-50 text-emerald-700">개발 승인됨</span>
        ) : (
          <button
            onClick={handleApprove}
            disabled={pending}
            className="text-sm px-3 py-1.5 rounded-lg bg-indigo-600 text-white disabled:opacity-50"
          >
            {pending ? '승인 중...' : '개발 승인'}
          </button>
        )}
      </div>

      {screens.length === 0 ? (
        <p className="text-sm text-zinc-400">아직 와이어프레임이 없습니다. `/ib-wireframe`으로 생성하세요.</p>
      ) : (
        <div className="space-y-4">
          {screens.map((s, i) => (
            <ScreenBox key={i} screen={s} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: page.tsx**

REST 클라이언트의 `approveIssue`를 그대로 서버 액션처럼 클라이언트에서 부를 수 있도록, 승인 콜백은 `'use server'` 없이 클라이언트 전용 wrapper로 넘긴다. Next.js App Router에서 클라이언트 컴포넌트에 함수를 prop으로 넘길 수 없으므로, `WireframeBoard` 내부에서 직접 `fetch`를 호출하도록 페이지에서는 issueId만 넘긴다 — 이 부분은 `WireframeBoard`를 아래처럼 수정한다.

```tsx
// src/app/projects/[id]/wireframe/page.tsx
import WireframeBoard from '@/components/WireframeBoard'
import { fetchIssue, fetchWireframe } from '@/lib/api'

export default async function WireframePage({
  searchParams,
}: {
  searchParams: Promise<{ issueId?: string }>
}) {
  const { issueId } = await searchParams
  if (!issueId) {
    return <p className="text-sm text-zinc-400">이슈 탭에서 화면을 확인할 이슈를 먼저 선택하세요.</p>
  }

  const issue = await fetchIssue(Number(issueId))
  const wireframe = await fetchWireframe(issue.id)

  return <WireframeBoard issue={issue} screens={wireframe?.screens ?? []} />
}
```

`WireframeBoard`가 서버 컴포넌트에서 함수 prop을 받을 수 없다는 제약을 해소하기 위해, `onApprove` prop을 제거하고 컴포넌트 내부에서 `@/lib/api`의 `approveIssue`를 직접 import해서 호출하도록 `handleApprove`를 아래로 교체한다.

```tsx
// src/components/WireframeBoard.tsx 의 handleApprove만 교체
import { approveIssue } from '@/lib/api'
// ...
async function handleApprove() {
  setPending(true)
  try {
    const updated = await approveIssue(issue.id)
    setStatus(updated.status)
  } finally {
    setPending(false)
  }
}
```

동시에 `WireframeBoard`의 props 타입에서 `onApprove`를 제거한다.

- [ ] **Step 3: 수정된 WireframeBoard.tsx 전체 (Step 1 대비 변경분 반영)**

```tsx
// src/components/WireframeBoard.tsx
'use client'

import { useState } from 'react'
import type { Issue, WireframeScreen } from '@/lib/api'
import { approveIssue } from '@/lib/api'

const REGION_CLASS: Record<string, string> = {
  nav: 'w-full h-10 bg-zinc-200 rounded flex items-center px-3 text-xs text-zinc-600',
  sidebar: 'w-32 shrink-0 bg-zinc-100 rounded p-2 text-xs text-zinc-600',
  content: 'flex-1 bg-zinc-50 border border-dashed border-zinc-300 rounded p-3 text-xs text-zinc-500',
  footer: 'w-full h-8 bg-zinc-100 rounded flex items-center px-3 text-xs text-zinc-500',
}

function ScreenBox({ screen }: { screen: WireframeScreen }) {
  const nav = screen.layout.regions.find((r) => r.type === 'nav')
  const sidebar = screen.layout.regions.find((r) => r.type === 'sidebar')
  const rest = screen.layout.regions.filter((r) => r.type !== 'nav' && r.type !== 'sidebar')

  return (
    <div className="border border-zinc-200 rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{screen.name}</h3>
        {screen.route && <span className="text-xs font-mono text-indigo-600">{screen.route}</span>}
      </div>
      <div className="space-y-2">
        {nav && <div className={REGION_CLASS.nav}>{nav.label}</div>}
        <div className="flex gap-2">
          {sidebar && <div className={REGION_CLASS.sidebar}>{sidebar.label}</div>}
          <div className="flex-1 space-y-2">
            {rest.map((r, i) => (
              <div key={i} className={REGION_CLASS[r.type] ?? REGION_CLASS.content}>
                {r.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function WireframeBoard({
  issue,
  screens,
}: {
  issue: Issue
  screens: WireframeScreen[]
}) {
  const [status, setStatus] = useState(issue.status)
  const [pending, setPending] = useState(false)

  async function handleApprove() {
    setPending(true)
    try {
      const updated = await approveIssue(issue.id)
      setStatus(updated.status)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">
          #{issue.number} {issue.title}
        </h1>
        {status === 'dev_approved' ? (
          <span className="text-xs px-3 py-1.5 rounded bg-emerald-50 text-emerald-700">개발 승인됨</span>
        ) : (
          <button
            onClick={handleApprove}
            disabled={pending}
            className="text-sm px-3 py-1.5 rounded-lg bg-indigo-600 text-white disabled:opacity-50"
          >
            {pending ? '승인 중...' : '개발 승인'}
          </button>
        )}
      </div>

      {screens.length === 0 ? (
        <p className="text-sm text-zinc-400">아직 와이어프레임이 없습니다. `/ib-wireframe`으로 생성하세요.</p>
      ) : (
        <div className="space-y-4">
          {screens.map((s, i) => (
            <ScreenBox key={i} screen={s} />
          ))}
        </div>
      )}
    </div>
  )
}
```

`approveIssue`가 클라이언트 번들에서 실행되므로 `ISSUE_BOARD_API_URL`은 `NEXT_PUBLIC_` 접두사가 필요하다 — Task 13의 `lib/api.ts`에서 `process.env.ISSUE_BOARD_API_URL`을 `process.env.NEXT_PUBLIC_ISSUE_BOARD_API_URL`로 교체한다 (서버 컴포넌트에서도 동일 변수를 그대로 읽을 수 있으므로 하나로 통일).

- [ ] **Step 4: lib/api.ts의 환경변수 이름 수정**

```ts
// src/lib/api.ts — BASE_URL 정의부만 교체
const BASE_URL = process.env.NEXT_PUBLIC_ISSUE_BOARD_API_URL ?? 'http://localhost:4000'
```

- [ ] **Step 5: 빌드로 타입/구문 오류 확인**

Run: `cd apps/issue-board && npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 6: Commit**

```bash
git add apps/issue-board/src/components/WireframeBoard.tsx apps/issue-board/src/app/projects/[id]/wireframe/page.tsx apps/issue-board/src/lib/api.ts
git commit -m "feat(issue-board): 와이어프레임 탭 (박스형 렌더러 + 개발 승인 버튼)"
```

---

## Task 19: Phase 0 — 빈 runs 시딩 이슈를 "최초 실행"으로 처리

**Files:**
- Modify: `harness_global/.claude/skills/dev/SKILL.md:108-113`

issue-board가 승인 시 미리 만들어두는 `.harness/issues/{N}.yaml`은 `runs: []`인 상태로 존재한다. 기존 Phase 0 로직은 "이슈 N번" 언급 시 무조건 amendment로 취급하며 `runs[]`의 최신 `run_id`를 `PARENT_RUN_ID`로 읽으려 하는데, `runs`가 비어있으면 참조할 이전 run이 없다 — 이 경우를 "최초 실행"으로 명시적으로 분기해야 한다.

- [ ] **Step 1: 현재 내용 확인**

Run: `sed -n '106,113p' harness_global/.claude/skills/dev/SKILL.md`

Expected:
```
2. **이슈 ID (`ISSUE_ID`) — 기능 단위 (고정)**
   - `이슈 N번`, `issue N`, `#N` → **수정/amendment**: `ISSUE_ID=N`
   - `.harness/issues/N.yaml` 읽기 → 최신 `runs[].run_id` 를 `PARENT_RUN_ID`로 기록
   - **신규 기능** → `ISSUE_ID` = `.harness/issues/*.yaml` 최대 id + 1 (없으면 `1`)
```

- [ ] **Step 2: 규칙 수정**

`update_plan`/`snapshot_plan` 등과 무관한 마크다운 지시문 수정이므로 자동 테스트는 없다 — Step 4에서 수동 드라이런으로 검증한다.

```
2. **이슈 ID (`ISSUE_ID`) — 기능 단위 (고정)**
   - `이슈 N번`, `issue N`, `#N` → **수정/amendment**: `ISSUE_ID=N`
   - `.harness/issues/N.yaml` 읽기:
     - `runs`가 비어있으면(issue-board가 승인만 하고 아직 실행 전) → **최초 실행**으로 처리, `PARENT_RUN_ID` 없음
     - `runs`에 항목이 있으면 → 최신 `runs[].run_id` 를 `PARENT_RUN_ID`로 기록 (기존 동작)
   - **신규 기능** → `ISSUE_ID` = `.harness/issues/*.yaml` 최대 id + 1 (없으면 `1`)
```

- [ ] **Step 3: 편집 적용**

`harness_global/.claude/skills/dev/SKILL.md`의 108~111번째 줄을 Step 2 내용으로 교체한다.

- [ ] **Step 4: 수동 드라이런 검증**

임시 프로젝트에 `.harness/issues/9.yaml`을 `runs: []`로 만들어두고, Claude Code에서 "이슈 9번 개발해줘"라고 요청했을 때 Phase 0이 `PARENT_RUN_ID` 없이 최초 실행으로 진행하는지 확인한다. 자동화된 검증이 아니므로 이 스텝은 사람이 직접 확인 후 완료 체크한다.

- [ ] **Step 5: Commit**

```bash
git add harness_global/.claude/skills/dev/SKILL.md
git commit -m "fix(dev-skill): 빈 runs로 시딩된 이슈를 최초 실행으로 처리"
```

---

## Task 20: 기존 harness-hub 폐기

**Files:**
- Delete: `apps/harness-hub/`
- Modify: `README.md`

설계 스펙에서 harness-hub는 issue-board로 완전 대체되며, 재사용 후보였던 `patterns.ts`는 개발 시점(2차) 패턴 탭 작업으로 이연되어 이번 범위에서는 포팅하지 않는다 (스펙의 "범위 밖" 참조).

- [ ] **Step 1: harness-hub 디렉토리 삭제**

Run: `git rm -r apps/harness-hub`
Expected: 삭제 대상 파일 목록 출력

- [ ] **Step 2: README.md에서 harness-hub 언급 제거/교체**

`README.md`에서 harness-hub를 가리키는 문구를 issue-board로 교체한다 (정확한 위치는 Task 21에서 README 전체를 갱신할 때 함께 처리 — 이 스텝에서는 삭제만 수행).

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: apps/harness-hub 제거 (issue-board로 대체)"
```

---

## Task 21: `/ib-plan` 커맨드 파일 생성

**Files:**
- Create: `harness_global/.claude/commands/ib-plan.md`

사용자가 제공한 보일러플레이트를 그대로 반영한다 — MCP 툴 이름(`update_plan`, `snapshot_plan`)은 Task 10에서 확정한 시그니처(`update_plan(planId, sections?, status?)`)와 정확히 일치한다. install.sh가 `harness_global/.claude` 전체를 대상 프로젝트로 복사하므로, 이 경로에 두면 설치된 모든 프로젝트에서 `/ib-plan`으로 바로 쓸 수 있다.

- [ ] **Step 1: 디렉토리 생성 확인**

Run: `mkdir -p harness_global/.claude/commands`

- [ ] **Step 2: 커맨드 파일 작성**

```markdown
---
description: 프로젝트를 기획하고 이슈보드에 적재한다 (1단계)
argument-hint: <프로젝트 아이디어 한두 문장>
---

너는 시니어 프로덕트 기획자다. 사용자가 준 아이디어를 실행 가능한 기획서로 만들고,
issue-board MCP 서버에 적재한다.

## 아이디어

$ARGUMENTS

## 진행 순서

### 1) 명확화 질문 (모호할 때만)

아이디어에 **모호하거나 가정이 갈리는 지점이 있을 때만** `AskUserQuestion`으로
물어라. **최대 3개**, 정말 갈리는 것만. 아이디어가 이미 충분히 구체적이면 질문 없이
2단계로 넘어가되, 스스로 세운 핵심 가정은 기획서에 명시한다.

물어볼 후보 축 (해당될 때만):

- **스코프 / MVP 경계** — 이번 버전에 무엇까지 넣고 무엇을 뺄 것인가
- **타깃 플랫폼** — 웹 / 모바일 / 데스크톱 / CLI 중 무엇인가
- **핵심 제약** — 기술 스택, 일정, 규제, 기존 시스템 연동 등

### 2) 기획서 작성

답변을 반영해 **한국어 마크다운** 기획서를 쓴다. 대시보드가 **표는 표로, 블록쿼트는
콜아웃 박스로** 렌더하므로 아래 표현 규칙을 지켜라 — 반복 속성은 표, 판단·경계·핵심은
콜아웃:

**섹션은 반드시 `## N. 제목` 형태로 번호를 매긴다** (아래 순서·번호 고정):

```
# <프로젝트명>

## 1. 개요 / 목적
> 🎯 **목적** — 한 줄 핵심(엘리베이터 피치)을 블록쿼트 콜아웃으로.
(이어서 배경 1~2문단)

## 2. 타깃 사용자 & 유스케이스
| 페르소나 | 니즈 | 핵심 유스케이스 |
| --- | --- | --- |

## 3. 핵심 기능 (MVP)
| 우선순위 | 기능 | 설명 |
| --- | --- | --- |
(우선순위는 **`높음` / `보통` / `낮음`** 중 하나로만 적는다 — 대시보드가 색 chip으로
렌더한다. **각 행이 이후 이슈 분리의 단위**가 된다.)

## 4. 범위 밖 (Out of Scope)
> ⚠️ **범위 밖** — 이번 버전에서 하지 않을 것들.
```

### 3) MCP 적재

기획서를 issue-board MCP 서버에 적재한다.

- **최초 적재**: `create_plan(projectRoot, title, sections)` 호출 → `planId` 확보.
- **다듬는 중(편집)**: `update_plan(planId, sections)`만 호출한다. 편집은 버전을
  쌓지 않으므로 여러 번 다듬어도 이력이 지저분해지지 않는다.
- 애매하면 사용자에게 "새 기획인가요, 기존 기획 개정인가요?"라고 물어라.

**버전 확정(마일스톤)** — 매 편집이 아니라 **의미 있는 시점에만** 남긴다:

- 기획을 확정하면 `update_plan(planId, status="approved")` → 그 시점이 **자동
  스냅샷**되고, MVP 기능표 각 행이 이슈로 생성된다.
- 중간 마일스톤을 남기고 싶으면 `snapshot_plan(planId, label="<사유>")`.
- 그냥 다듬는 중이면 스냅샷하지 마라 (작업본 덮어쓰기로 충분).

### 4) 보고

생성된 `projectId`와 `planId`를 출력하고, 다음 단계를 안내한다:
"기획을 대시보드(http://localhost:5173)에서 검토·수정한 뒤 `/ib-wireframe` → `/ib-issues` 순으로 진행하세요."

## 주의

- 이 커맨드는 issue-board MCP 서버(`http://localhost:4000/mcp`)에 의존한다.
  MCP 툴이 안 보이면 대상 프로젝트에 `.mcp.json`이 있는지, 서버가 떠 있는지 먼저 확인하라.
- 코드를 작성하지 마라. 이 단계의 산출물은 기획서 하나다.
```

- [ ] **Step 3: 검증**

Run: `test -f harness_global/.claude/commands/ib-plan.md && head -3 harness_global/.claude/commands/ib-plan.md`
Expected: frontmatter의 `description:` 줄이 출력됨

- [ ] **Step 4: Commit**

```bash
git add harness_global/.claude/commands/ib-plan.md
git commit -m "feat(dev-skill): /ib-plan 커맨드 추가"
```

> **후속 (이번 플랜 범위 밖):** `/ib-wireframe`, `/ib-issues` 커맨드는 아직 사용자로부터 구체 내용을 받지 못했다 — `/ib-plan`과 같은 자리(`harness_global/.claude/commands/`)에 별도로 정의해야 한다. 또한 `.mcp.json`(대상 프로젝트가 issue-board MCP 서버를 찾도록 등록하는 설정)이 install.sh에 아직 없다 — 지금은 수동으로 각 프로젝트에 추가해야 커맨드가 동작한다.

---

## 자체 검토 결과 (Self-Review)

**스펙 커버리지:**
- 아키텍처(MCP+REST 동시 노출) → Task 1, 9, 10, 11
- 데이터 모델 5개 테이블 → Task 3~7
- 데이터 흐름 5단계 → Task 5(plan), 6(issues), 7(wireframe), 8+9(approve 핸드오프)
- 에러 처리(서버 다운 시 대시보드 비파괴, 승인 멱등) → Task 9 테스트의 approve 재호출 케이스로 멱등성 커버. 대시보드 "연결 안 됨" 배너는 이번 플랜에 태스크가 없어 아래 "발견된 갭"에 추가함
- 테스트 전략(모델 단위 + REST 통합) → Task 3~9
- harness-hub 폐기 → Task 20
- Phase 0 연동 → Task 19

**발견된 갭 (인라인로 추가):** 스펙의 에러 처리 절 "대시보드는 서버 다운 시 연결 안 됨 배너만 띄운다"에 대응하는 태스크가 없었다. 이번 플랜은 최초 구현 범위(핵심 플로우 동작)에 집중하고, 이 배너는 후속 개선 사항으로 남긴다 — MVP 우선순위상 핵심 CRUD 플로우보다 낮음. (참고: 만약 지금 포함하길 원하면 `apps/issue-board`에 fetch 실패를 잡는 에러 바운더리 컴포넌트를 추가하는 Task 21을 별도로 요청할 것.)

**플레이스홀더 스캔:** TBD/TODO 없음. 모든 스텝에 실행 가능한 코드/명령이 포함됨.

**타입 일관성 확인:** `Issue`, `Plan`, `WireframeScreen` 등의 필드명이 `apps/issue-board-mcp/src/types.ts`(서버)와 `apps/issue-board/src/lib/api.ts`(클라이언트)에서 동일하게 유지됨 (`camelCase` 통일, REST 응답이 서버 타입을 그대로 JSON 직렬화하므로 별도 매핑 레이어 없음).

---

## 실행 순서 요약

Task 1→11 (MCP 서버, 독립적으로 테스트 가능) → Task 12→18 (대시보드, 서버 API에 의존) → Task 19 (기존 dev 파이프라인 연동) → Task 20 (구 앱 정리) → Task 21 (`/ib-plan` 커맨드, Task 10의 `update_plan` 시그니처 확정 후 작성 가능). Task 1~11 완료 시점에 이미 `curl`로 전체 백엔드 플로우(기획 생성→승인→이슈 생성→와이어프레임 저장→개발 승인→yaml 시딩)를 검증할 수 있다.
