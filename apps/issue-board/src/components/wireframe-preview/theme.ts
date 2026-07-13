export interface PreviewTheme {
  primary: string
  primaryInverse: string
  accent: string
  canvas: string
  sunken: string
  border: string
  text: string
  textSecondary: string
  textTertiary: string
  sale: string
  font: string
}

const DEFAULT: PreviewTheme = {
  primary: '#111111',
  primaryInverse: '#FFFFFF',
  accent: '#FF4800',
  canvas: '#FFFFFF',
  sunken: '#FAFAFA',
  border: '#E8E8E8',
  text: '#111111',
  textSecondary: '#525252',
  textTertiary: '#A3A3A3',
  sale: '#FF4800',
  font: '"Pretendard", "Apple SD Gothic Neo", system-ui, sans-serif',
}

function pick(obj: unknown, path: string[], fallback: string): string {
  let cur: unknown = obj
  for (const key of path) {
    if (!cur || typeof cur !== 'object') return fallback
    cur = (cur as Record<string, unknown>)[key]
  }
  return typeof cur === 'string' ? cur : fallback
}

export function resolveTheme(tokens?: Record<string, unknown> | null): PreviewTheme {
  if (!tokens) return DEFAULT
  return {
    primary: pick(tokens, ['color', 'brand', 'primary'], DEFAULT.primary),
    primaryInverse: pick(tokens, ['color', 'brand', 'primaryInverse'], DEFAULT.primaryInverse),
    accent: pick(tokens, ['color', 'brand', 'accent'], DEFAULT.accent),
    canvas: pick(tokens, ['color', 'surface', 'canvas'], DEFAULT.canvas),
    sunken: pick(tokens, ['color', 'surface', 'sunken'], DEFAULT.sunken),
    border: pick(tokens, ['color', 'border', 'default'], DEFAULT.border),
    text: pick(tokens, ['color', 'text', 'primary'], DEFAULT.text),
    textSecondary: pick(tokens, ['color', 'text', 'secondary'], DEFAULT.textSecondary),
    textTertiary: pick(tokens, ['color', 'text', 'tertiary'], DEFAULT.textTertiary),
    sale: pick(tokens, ['color', 'semantic', 'sale'], DEFAULT.sale),
    font: Array.isArray((tokens as any)?.typography?.fontFamily?.sans)
      ? ((tokens as any).typography.fontFamily.sans as string[]).map((f) => `"${f}"`).join(', ')
      : DEFAULT.font,
  }
}

export const MOCK_PRODUCTS = [
  { brand: 'ADER ERROR', name: '오버핏 로고 후드', price: 89000, sale: 71200, rate: 20, tone: '#1a1a1a' },
  { brand: 'COVERNAT', name: '코튼 치노 팬츠', price: 69000, sale: 48300, rate: 30, tone: '#3d4a3a' },
  { brand: 'STUSSY', name: '베이직 로고 티', price: 52000, sale: 52000, rate: 0, tone: '#2c3e50' },
  { brand: 'NIKE', name: '에어포스 1 \'07', price: 139000, sale: 118150, rate: 15, tone: '#e8e4df' },
]

export function formatWon(n: number) {
  return `${n.toLocaleString('ko-KR')}원`
}
