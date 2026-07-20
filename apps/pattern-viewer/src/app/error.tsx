'use client'

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
      <p className="text-sm text-red-600">패턴 데이터를 불러오는 중 문제가 발생했습니다.</p>
      <button
        onClick={() => reset()}
        className="px-4 py-2 rounded-lg border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50"
      >
        다시 시도
      </button>
    </div>
  )
}
