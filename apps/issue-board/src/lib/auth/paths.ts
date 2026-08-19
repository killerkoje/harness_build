export const COOKIE_NAME = 'session'
export const NEXT_COOKIE = 'oauth_next'

export function safeNextPath(value: string | null | undefined): string {
  if (!value) return '/'
  if (!value.startsWith('/') || value.startsWith('//')) return '/'
  return value
}
