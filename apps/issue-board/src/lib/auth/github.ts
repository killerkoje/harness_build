interface SupabaseUserResponse {
  email?: string
  identities?: Array<{
    identity_data?: { email?: string; name?: string; user_name?: string }
  }>
  user_metadata?: {
    email?: string
    name?: string
    full_name?: string
    user_name?: string
  }
}

function allowedDomain(): string {
  return process.env.SSO_ALLOWED_EMAIL_DOMAIN ?? 'wonjd.com'
}

function collectEmails(user: SupabaseUserResponse): string[] {
  const emails = [
    user.email,
    user.user_metadata?.email,
    ...(user.identities ?? []).map((identity) => identity.identity_data?.email),
  ]
  return [...new Set(emails.map((email) => email?.trim().toLowerCase()).filter((email): email is string => Boolean(email)))]
}

export async function getGithubCompanyProfile(accessToken: string): Promise<{ email: string; nickname: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) throw new Error('SUPABASE_ENV_MISSING')

  const res = await fetch(`${url.replace(/\/$/, '')}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: anonKey,
    },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('SSO_PROFILE_FETCH_FAILED')

  const user = (await res.json()) as SupabaseUserResponse
  const domain = allowedDomain().toLowerCase()
  const email = collectEmails(user).find((value) => value.endsWith(`@${domain}`))
  if (!email) throw new Error('SSO_EMAIL_DOMAIN_FORBIDDEN')

  const nickname =
    user.user_metadata?.name?.trim() ||
    user.user_metadata?.full_name?.trim() ||
    user.user_metadata?.user_name?.trim() ||
    email.split('@')[0] ||
    '원정대'

  return { email, nickname }
}
