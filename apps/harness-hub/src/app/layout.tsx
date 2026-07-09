import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Harness Hub',
  description: '하네스 프로젝트 — 패턴 · 기획 · 화면',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-zinc-50 text-zinc-900 min-h-screen antialiased">{children}</body>
    </html>
  )
}
