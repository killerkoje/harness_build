import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Team Patterns',
  description: '팀이 검증하고 채택한 코드 패턴 모음',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-white text-zinc-900 min-h-screen antialiased">
        {children}
      </body>
    </html>
  )
}
