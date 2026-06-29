import path from 'path'
import { loadPatterns } from '@/lib/patterns'
import PatternViewer from '@/components/PatternViewer'

export default function Home() {
  const patternsDir =
    process.env.PATTERNS_DIR ??
    path.resolve(process.cwd(), '../../.harness/patterns')

  const categories = loadPatterns(patternsDir)

  return <PatternViewer categories={categories} />
}
