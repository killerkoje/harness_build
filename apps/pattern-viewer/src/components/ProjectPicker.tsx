import type { Project } from '@/lib/issue-board-client'

export default function ProjectPicker({
  projects,
  notice,
}: {
  projects: Project[]
  notice?: string
}) {
  return (
    <div className="max-w-lg mx-auto mt-16 px-4">
      <h1 className="text-lg font-semibold text-zinc-900 mb-1">프로젝트를 선택하세요</h1>
      <p className="text-sm text-zinc-500 mb-6">패턴을 확인할 프로젝트를 골라주세요.</p>
      {notice && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-4">
          {notice}
        </p>
      )}
      {projects.length === 0 ? (
        <p className="text-sm text-zinc-400">등록된 프로젝트가 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {projects.map((project) => (
            <li key={project.id}>
              <a
                href={`/patterns?projectId=${project.id}`}
                className="block rounded-lg border border-zinc-200 px-4 py-3 hover:bg-zinc-50"
              >
                <span className="font-medium text-zinc-900">{project.name}</span>
                <span className="block text-xs text-zinc-400 mt-0.5">{project.rootPath}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
