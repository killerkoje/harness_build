// Apply issue-board DDL + seed wonjd_CRM when SUPABASE_DB_PASSWORD is set.
// Usage: npx tsx --env-file=.env scripts/supabase-setup.ts
import fs from 'node:fs'
import path from 'node:path'
import pg from 'pg'
import Database from 'better-sqlite3'

const appRoot = path.join(import.meta.dirname, '..')
try {
  process.loadEnvFile(path.join(appRoot, '.env'))
} catch {
  // already loaded
}

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const dbPassword = process.env.SUPABASE_DB_PASSWORD
const projectRef = url?.match(/^https:\/\/([^.]+)\.supabase\.co/)?.[1]

if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing in .env')

async function tableExists(client: pg.Client): Promise<boolean> {
  const res = await client.query(
    `select 1 from information_schema.tables where table_schema = 'public' and table_name = 'projects'`
  )
  return (res.rowCount ?? 0) > 0
}

async function applySchema(): Promise<void> {
  if (!dbPassword || !projectRef) {
    console.log(
      'SKIP schema: set SUPABASE_DB_PASSWORD in .env (Project Settings → Database → password)\n' +
        'Or paste SQL once in dashboard:\n' +
        `  https://supabase.com/dashboard/project/${projectRef}/sql/new\n` +
        `  file: ${path.join(appRoot, '../../supabase/migrations/20260818150000_issue_board.sql')}`
    )
    return
  }

  const encoded = encodeURIComponent(dbPassword)
  const candidates = [
    `postgresql://postgres.${projectRef}:${encoded}@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres`,
    `postgresql://postgres.${projectRef}:${encoded}@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres`,
    `postgresql://postgres.${projectRef}:${encoded}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
    `postgresql://postgres.${projectRef}:${encoded}@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`,
    `postgresql://postgres.${projectRef}:${encoded}@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres.${projectRef}:${encoded}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres:${encoded}@db.${projectRef}.supabase.co:5432/postgres`,
  ]

  let client: pg.Client | null = null
  let lastError: unknown
  for (const connectionString of candidates) {
    const host = connectionString.split('@')[1] ?? connectionString
    const next = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } })
    try {
      await next.connect()
      client = next
      console.log(`schema: connected via ${host.replace(encoded, '***')}`)
      break
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`schema: miss ${host.split('/')[0]} — ${msg}`)
      lastError = err
      await next.end().catch(() => undefined)
    }
  }
  if (!client) throw lastError ?? new Error('could not connect to postgres')

  try {
    if (await tableExists(client)) {
      console.log('schema: projects table already exists')
      return
    }
    const sqlPath = path.join(appRoot, '../../supabase/migrations/20260818150000_issue_board.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    await client.query(sql)
    console.log('schema: applied migration')
  } finally {
    await client.end()
  }
}

async function sbFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers)
  headers.set('apikey', key!)
  headers.set('Authorization', `Bearer ${key}`)
  if (!headers.has('Content-Type') && init.body) headers.set('Content-Type', 'application/json')
  return fetch(`${url}/rest/v1${path}`, { ...init, headers })
}

async function seedWonjd(): Promise<void> {
  const sqlite = new Database(path.join(appRoot, 'issue-board.db'), { readonly: true })
  const project = sqlite.prepare(`SELECT * FROM projects WHERE name = ?`).get('wonjd_CRM') as
    | { id: number; root_path: string; name: string; description: string; dev_url: string | null }
    | undefined
  if (!project) throw new Error('wonjd_CRM not found in local sqlite')

  const plan = sqlite
    .prepare(`SELECT * FROM plans WHERE project_id = ? ORDER BY id DESC LIMIT 1`)
    .get(project.id) as
    | { title: string; sections: string; status: string; created_at: string; updated_at: string }
    | undefined
  if (!plan) throw new Error('wonjd_CRM plan not found in local sqlite')

  const sections = typeof plan.sections === 'string' ? JSON.parse(plan.sections) : plan.sections

  const findRes = await sbFetch(
    `/projects?select=*&root_path=eq.${encodeURIComponent(project.root_path)}&limit=1`
  )
  if (!findRes.ok) throw new Error(`projects lookup: ${findRes.status} ${await findRes.text()}`)
  const existingProjects = (await findRes.json()) as Array<{ id: number }>

  let projectId: number
  if (existingProjects.length > 0) {
    projectId = Number(existingProjects[0]!.id)
    const updateRes = await sbFetch(`/projects?id=eq.${projectId}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        name: project.name,
        description: project.description ?? '',
        dev_url: project.dev_url,
      }),
    })
    if (!updateRes.ok) throw new Error(`projects update: ${updateRes.status} ${await updateRes.text()}`)
  } else {
    const insertRes = await sbFetch('/projects', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        root_path: project.root_path,
        name: project.name,
        description: project.description ?? '',
        dev_url: project.dev_url,
      }),
    })
    if (!insertRes.ok) throw new Error(`projects insert: ${insertRes.status} ${await insertRes.text()}`)
    const inserted = (await insertRes.json()) as Array<{ id: number }>
    projectId = Number(inserted[0]!.id)
  }

  const planFindRes = await sbFetch(
    `/plans?select=id&project_id=eq.${projectId}&title=eq.${encodeURIComponent(plan.title)}&limit=1`
  )
  if (!planFindRes.ok) throw new Error(`plans lookup: ${planFindRes.status} ${await planFindRes.text()}`)
  const existingPlans = (await planFindRes.json()) as Array<{ id: number }>

  if (existingPlans.length > 0) {
    const planId = existingPlans[0]!.id
    const updateRes = await sbFetch(`/plans?id=eq.${planId}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ sections, status: plan.status, updated_at: plan.updated_at }),
    })
    if (!updateRes.ok) throw new Error(`plans update: ${updateRes.status} ${await updateRes.text()}`)
    console.log(`seed: updated project ${projectId} plan ${planId}`)
  } else {
    const insertRes = await sbFetch('/plans', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        project_id: projectId,
        title: plan.title,
        sections,
        status: plan.status,
        created_at: plan.created_at,
        updated_at: plan.updated_at,
      }),
    })
    if (!insertRes.ok) throw new Error(`plans insert: ${insertRes.status} ${await insertRes.text()}`)
    const inserted = (await insertRes.json()) as Array<{ id: number }>
    console.log(`seed: inserted project ${projectId} plan ${inserted[0]!.id}`)
  }
}

await applySchema()

let schemaReady = true
try {
  const probe = await sbFetch('/projects?select=id&limit=1')
  const probeText = await probe.text()
  if (probe.status === 404 && probeText.includes('PGRST205')) schemaReady = false
  else if (!probe.ok) throw new Error(`projects probe: ${probe.status} ${probeText}`)
} catch (e) {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
}

if (!schemaReady) {
  console.error('\nschema not applied yet — complete the SQL step above, then re-run: npm run supabase:setup')
  process.exit(1)
}

await seedWonjd()
console.log('done')
