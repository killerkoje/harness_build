import path from 'path'
import { loadPatterns } from '@/lib/patterns'
import PatternViewer from '@/components/PatternViewer'

// Reads pattern YAML from disk on every request instead of at build time,
// since files under .harness/patterns change without a rebuild/redeploy.
export const dynamic = 'force-dynamic'

export default function Home() {
  const patternsDir =
    process.env.PATTERNS_DIR ??
    path.resolve(process.cwd(), '../../.harness/patterns')

  const categories = loadPatterns(patternsDir)

  return <PatternViewer categories={categories} />
}
