'use client'

// src/components/ProjectSidebar.tsx
import { useRouter } from 'next/navigation'
import { deleteProject } from '@/lib/api'

interface Props {
  projects: { id: number; name: string }[]
  activeId: number
}

export default function ProjectSidebar({ projects, activeId }: Props) {
  const router = useRouter()

  async function handleDelete(e: React.MouseEvent, project: { id: number; name: string }) {
    e.preventDefault()
    if (!confirm(`"${project.name}" 프로젝트를 삭제할까요? 기획/이슈/와이어프레임이 모두 사라지며 되돌릴 수 없습니다.`)) {
      return
    }
    await deleteProject(project.id)
    if (project.id === activeId) {
      router.push('/')
    } else {
      router.refresh()
    }
  }

  return (
    <aside className="shrink-0 border-b md:border-b-0 md:border-r border-zinc-200 md:w-52 lg:w-56">
      <div className="flex md:flex-col gap-1 p-2 sm:p-3 md:p-4 overflow-x-auto md:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {projects.map((p) => (
          <div
            key={p.id}
            className={`group shrink-0 flex items-center gap-1 rounded-lg text-sm ${
              p.id === activeId ? 'bg-indigo-50 text-indigo-800' : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <a href={`/projects/${p.id}/plan`} className="flex-1 px-3 py-2 whitespace-nowrap">
              {p.name}
            </a>
            <button
              type="button"
              onClick={(e) => handleDelete(e, p)}
              aria-label={`${p.name} 프로젝트 삭제`}
              title="프로젝트 삭제"
              className="shrink-0 px-2 py-2 text-zinc-400 opacity-0 group-hover:opacity-100 hover:text-red-600"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </aside>
  )
}
