import { NextResponse } from 'next/server'

/**
 * GitHub OAuth App callback이 실수로 이 도메인으로 온 경우
 * Supabase Auth 콜백으로 넘긴다.
 */
export async function GET(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    return NextResponse.json({ error: 'missing supabase url' }, { status: 500 })
  }
  const target = new URL('/auth/v1/callback', supabaseUrl)
  target.search = new URL(request.url).search
  return NextResponse.redirect(target)
}
