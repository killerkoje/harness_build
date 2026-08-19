import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import pg from 'pg'

const mcpRoot = path.join(import.meta.dirname, '..')
const boardRoot = path.join(mcpRoot, '../issue-board')
try {
  process.loadEnvFile(path.join(mcpRoot, '.env'))
} catch {
  // already loaded
}

const url = process.env.SUPABASE_URL
const dbPassword = process.env.SUPABASE_DB_PASSWORD
const projectRef = url?.match(/^https:\/\/([^.]+)\.supabase\.co/)?.[1]
if (!url || !dbPassword || !projectRef) throw new Error('SUPABASE_URL / SUPABASE_DB_PASSWORD missing')

const encoded = encodeURIComponent(dbPassword)
const candidates = [
  `postgresql://postgres.${projectRef}:${encoded}@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres`,
  `postgresql://postgres.${projectRef}:${encoded}@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres`,
  `postgresql://postgres.${projectRef}:${encoded}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
  `postgresql://postgres:${encoded}@db.${projectRef}.supabase.co:5432/postgres`,
]

async function connect(): Promise<pg.Client> {
  let lastError: unknown
  for (const connectionString of candidates) {
    const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } })
    try {
      await client.connect()
      return client
    } catch (err) {
      lastError = err
      await client.end().catch(() => undefined)
    }
  }
  throw lastError ?? new Error('could not connect to postgres')
}

function signJwt(payload: Record<string, unknown>, secret: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${sig}`
}

async function jwtSecret(client: pg.Client): Promise<string | null> {
  const tries = [
    `select current_setting('app.settings.jwt_secret', true) as v`,
    `select current_setting('pgrst.jwt_secret', true) as v`,
    `select decrypted_secret as v from vault.decrypted_secrets where name = 'jwt_secret' limit 1`,
    `select decrypted_secret as v from vault.decrypted_secrets where name ilike '%jwt%' limit 1`,
    `select decrypted_secret as v from vault.decrypted_secrets limit 1`,
  ]
  for (const sql of tries) {
    try {
      const res = await client.query(sql)
      const v = res.rows[0]?.v
      if (typeof v === 'string' && v.length > 0) return v
    } catch {
      // try next
    }
  }
  try {
    const names = await client.query(`select name from vault.secrets`)
    console.log('vault secret names:', names.rows.map((r) => r.name).join(', ') || '(none)')
  } catch (err) {
    console.log('vault: not readable')
  }
  return null
}

const client = await connect()
try {
  const sqlPath = path.join(mcpRoot, '../../supabase/migrations/20260818160000_issue_board_realtime.sql')
  await client.query(fs.readFileSync(sqlPath, 'utf8'))
  console.log('realtime: publication + rls applied')

  const secret = await jwtSecret(client)
  const envPath = path.join(boardRoot, '.env.local')
  const lines = [`NEXT_PUBLIC_SUPABASE_URL=${url}`]
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    lines.push(`SUPABASE_SERVICE_ROLE_KEY=${process.env.SUPABASE_SERVICE_ROLE_KEY}`)
  }
  if (!secret) {
    fs.writeFileSync(envPath, `${lines.join('\n')}\n`)
    console.log('wrote issue-board .env.local (server key only). Realtime needs NEXT_PUBLIC_SUPABASE_ANON_KEY from dashboard API Keys (publishable / anon).')
    process.exit(0)
  }
  const anon = signJwt(
    {
      iss: 'supabase',
      ref: projectRef,
      role: 'anon',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365 * 10,
    },
    secret
  )
  lines.push(`NEXT_PUBLIC_SUPABASE_ANON_KEY=${anon}`)
  fs.writeFileSync(envPath, `${lines.join('\n')}\n`)
  console.log('anon: wrote issue-board .env.local')
} finally {
  await client.end()
}
