// src/components/ProjectSidebar.tsx
interface Props {
  projects: { id: number; name: string }[]
  activeId: number
}

export default function ProjectSidebar({ projects, activeId }: Props) {
  return (
    <aside className="shrink-0 border-b md:border-b-0 md:border-r border-zinc-200 md:w-52 lg:w-56">
      <div className="flex md:flex-col gap-1 p-2 sm:p-3 md:p-4 overflow-x-auto md:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {projects.map((p) => (
          <a
            key={p.id}
            href={`/projects/${p.id}/plan`}
            className={`shrink-0 block px-3 py-2 rounded-lg text-sm whitespace-nowrap ${
              p.id === activeId ? 'bg-indigo-50 text-indigo-800' : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            {p.name}
          </a>
        ))}
      </div>
    </aside>
  )
}
