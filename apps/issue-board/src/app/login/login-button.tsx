'use client'

import { useState, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { NEXT_COOKIE, safeNextPath } from '../../lib/auth/paths'

export default function LoginButton() {
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    setError(null)
    startTransition(async () => {
      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        if (!url || !anonKey) {
          setError('Supabase 환경변수가 없습니다')
          return
        }

        const next = safeNextPath(searchParams.get('next'))
        document.cookie = `${NEXT_COOKIE}=${encodeURIComponent(next)}; path=/; samesite=lax; max-age=600`

        const supabase = createClient(url, anonKey, {
          auth: { flowType: 'implicit', persistSession: false, autoRefreshToken: false },
        })
        const redirectTo = `${window.location.origin}/auth/callback`
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'github',
          options: { redirectTo, skipBrowserRedirect: true },
        })
        if (error || !data.url) {
          setError('GitHub 로그인 URL을 만들지 못했습니다')
          return
        }
        window.location.assign(data.url)
      } catch {
        setError('GitHub 로그인 준비에 실패했습니다')
      }
    })
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-zinc-900">원정대 이슈보드</h1>
        <p className="mt-2 text-sm text-zinc-600">`@wonjd.com` GitHub 회사 계정으로만 접속할 수 있습니다.</p>
        <button
          type="button"
          onClick={handleClick}
          disabled={isPending}
          className="mt-6 w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isPending ? 'GitHub로 이동 중...' : 'GitHub 회사 계정으로 로그인'}
        </button>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    </main>
  )
}
