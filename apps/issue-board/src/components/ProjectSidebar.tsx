// src/components/ProjectSidebar.tsx
interface Props {
  projects: { id: number; name: string }[]
  activeId: number
}

export default function ProjectSidebar({ projects, activeId }: Props) {
  return (
    <aside className="w-56 shrink-0 border-r border-zinc-200 p-4 space-y-1">
      {projects.map((p) => (
        <a
          key={p.id}
          href={`/projects/${p.id}/plan`}
          className={`block px-3 py-2 rounded-lg text-sm ${
            p.id === activeId ? 'bg-indigo-50 text-indigo-800' : 'text-zinc-600 hover:bg-zinc-100'
          }`}
        >
          {p.name}
        </a>
      ))}
    </aside>
  )
}
