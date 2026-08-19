import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import { COOKIE_NAME } from './paths'

const MAX_AGE_SECONDS = 60 * 60 * 24 * 7

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('AUTH_SECRET가 설정되지 않았거나 32자 미만입니다')
  }
  return new TextEncoder().encode(secret)
}

export async function createSessionToken(email: string, nickname: string): Promise<string> {
  return new SignJWT({ email, nickname })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecretKey())
}

export async function setSessionCookie(email: string, nickname: string): Promise<void> {
  const token = await createSessionToken(email, nickname)
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  })
}

export async function getSession(): Promise<{ email: string; nickname: string } | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getSecretKey())
    if (typeof payload.email !== 'string') return null
    return {
      email: payload.email,
      nickname: typeof payload.nickname === 'string' ? payload.nickname : payload.email,
    }
  } catch {
    return null
  }
}
