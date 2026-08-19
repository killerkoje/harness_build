'use server'

import { getGithubCompanyProfile } from '@/lib/auth/github'
import { setSessionCookie } from '@/lib/auth/session'

export async function completeGithubLogin(accessToken: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!accessToken) return { ok: false, error: 'GitHub 로그인 토큰이 없습니다' }

  try {
    const profile = await getGithubCompanyProfile(accessToken)
    await setSessionCookie(profile.email, profile.nickname)
    return { ok: true }
  } catch (error) {
    if (error instanceof Error && error.message === 'SSO_EMAIL_DOMAIN_FORBIDDEN') {
      return { ok: false, error: '@wonjd.com GitHub 회사 계정만 로그인할 수 있습니다' }
    }
    return { ok: false, error: 'GitHub 로그인 처리에 실패했습니다' }
  }
}
