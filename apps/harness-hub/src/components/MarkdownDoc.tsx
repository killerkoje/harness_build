interface Props {
  content: string
}

export default function MarkdownDoc({ content }: Props) {
  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-6 overflow-x-auto">
      <pre className="text-sm text-zinc-700 whitespace-pre-wrap font-sans leading-relaxed">
        {content}
      </pre>
    </article>
  )
}
