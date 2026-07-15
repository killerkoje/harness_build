// src/app/page.tsx
import { redirect } from 'next/navigation'
import { fetchProjects } from '@/lib/api'

export default async function RootPage() {
  let projects: { id: number }[] = []
  try {
    projects = await fetchProjects()
  } catch {
    // MCP 서버 미기동 등 — 아래 빈 상태 화면으로 안내
  }

  if (projects.length > 0) {
    redirect(`/projects/${projects[0].id}/plan`)
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="text-center text-zinc-600">
        <p className="text-lg font-medium text-zinc-800">등록된 프로젝트가 없습니다</p>
        <p className="mt-2 text-sm">
          Claude Code에서 <code className="rounded bg-zinc-100 px-1.5 py-0.5">create_project</code> MCP
          도구로 프로젝트를 먼저 등록해주세요.
        </p>
      </div>
    </main>
  )
}
