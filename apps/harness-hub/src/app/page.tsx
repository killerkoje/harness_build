import Link from 'next/link'
import { discoverProjects } from '@/lib/projects'

export default function HomePage() {
  const projects = discoverProjects()

  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white">
            H
          </div>
          <span className="font-semibold text-sm">Harness Hub</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-semibold text-zinc-900 mb-2">프로젝트</h1>
        <p className="text-sm text-zinc-500 mb-8">
          하네스로 관리하는 프로젝트를 선택하세요.
        </p>

        {projects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center">
            <p className="text-zinc-600 mb-2">등록된 프로젝트가 없습니다.</p>
            <p className="text-sm text-zinc-400">
              <code className="bg-zinc-100 px-1 rounded">.env.local</code>에{' '}
              <code className="bg-zinc-100 px-1 rounded">HARNESS_PROJECTS</code> 또는{' '}
              <code className="bg-zinc-100 px-1 rounded">PROJECTS_ROOT</code>를 설정하세요.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {projects.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/projects/${project.id}/patterns`}
                  className="block rounded-xl border border-zinc-200 bg-white px-5 py-4 hover:border-indigo-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-semibold text-zinc-900">{project.name}</h2>
                      <p className="text-xs text-zinc-400 mt-1 font-mono truncate max-w-md">
                        {project.rootPath}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs px-2 py-1 rounded-md bg-zinc-100 text-zinc-600 font-medium">
                        {project.stack}
                      </span>
                      {project.harnessVersion && (
                        <span className="text-xs px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 font-medium">
                          v{project.harnessVersion}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-4 mt-3 text-xs text-zinc-500">
                    <span>패턴 {project.patternCount}</span>
                    <span>기획 {project.specCount}</span>
                    <span>화면 {project.screenCount}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
