import { PostgrestClient } from '@supabase/postgrest-js'

export function isSupabaseEnabled(): boolean {
  if (process.env.VITEST) return false
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

let client: PostgrestClient | null = null

export function getSupabase(): PostgrestClient {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing')
  if (!client) {
    client = new PostgrestClient(`${url}/rest/v1`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    })
  }
  return client
}
