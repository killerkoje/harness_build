import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Team Patterns',
  description: '팀 학습 패턴 뷰어',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-zinc-950 text-zinc-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  )
}
