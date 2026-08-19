'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { completeGithubLogin } from '@/app/actions/auth'
import { NEXT_COOKIE, safeNextPath } from '../../../lib/auth/paths'

function readAccessTokenFromHash(): string | null {
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash
  return new URLSearchParams(hash).get('access_token')
}

function readNextPath(): string {
  const match = document.cookie.split('; ').find((row) => row.startsWith(`${NEXT_COOKIE}=`))
  const raw = match ? decodeURIComponent(match.slice(NEXT_COOKIE.length + 1)) : '/'
  return safeNextPath(raw)
}

export default function AuthCallbackPage() {
  const router = useRouter()
  const [message, setMessage] = useState('GitHub 로그인 처리 중...')

  useEffect(() => {
    let cancelled = false

    async function run() {
      const params = new URLSearchParams(window.location.search)
      const oauthError = params.get('error_description') || params.get('error')
      if (oauthError) {
        setMessage(oauthError)
        return
      }

      const accessToken = readAccessTokenFromHash()
      if (!accessToken) {
        setMessage('GitHub 로그인 토큰이 없습니다. 다시 로그인해 주세요.')
        return
      }

      const result = await completeGithubLogin(accessToken)
      if (cancelled) return
      if (!result.ok) {
        setMessage(result.error)
        return
      }

      const next = readNextPath()
      document.cookie = `${NEXT_COOKIE}=; path=/; max-age=0`
      window.history.replaceState({}, document.title, '/auth/callback')
      router.replace(next)
      router.refresh()
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [router])

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <p className="text-sm text-zinc-600">{message}</p>
    </main>
  )
}
