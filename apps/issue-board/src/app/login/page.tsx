import { Suspense } from 'react'
import LoginButton from './login-button'

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center p-6">
          <p className="text-sm text-zinc-600">로그인 화면 준비 중...</p>
        </main>
      }
    >
      <LoginButton />
    </Suspense>
  )
}
