# React / Next.js 프로젝트 컨벤션

> 하네스 파이프라인(분석 → 구현 → QA)에서 **모든 에이전트가 구현 전 반드시 참조**하는 규칙 문서.
> 기준: [Next.js App Router](https://nextjs.org/docs/app), [React 19](https://react.dev), [Vercel React Best Practices](https://vercel.com/blog/react-best-practices)

---

## 목차

1. [기술 스택](#1-기술-스택)
2. [폴더 구조](#2-폴더-구조)
3. [파일·네이밍 규칙](#3-파일네이밍-규칙)
4. [App Router 파일 컨벤션](#4-app-router-파일-컨벤션)
5. [Server / Client 컴포넌트 경계](#5-server--client-컴포넌트-경계)
6. [비동기 API (Next.js 15+)](#6-비동기-api-nextjs-15)
7. [데이터 패턴](#7-데이터-패턴)
8. [코드 작성 규칙](#8-코드-작성-규칙)
9. [TypeScript 규칙](#9-typescript-규칙)
10. [UI / 스타일링](#10-ui--스타일링)
11. [에러 처리](#11-에러-처리)
12. [메타데이터 & SEO](#12-메타데이터--seo)
13. [성능 규칙](#13-성능-규칙)
14. [금지 사항](#14-금지-사항)
15. [구현 순서 (하네스 Implementer용)](#15-구현-순서-하네스-implementer용)

---

## 1. 기술 스택

| 영역 | 선택 | 비고 |
|------|------|------|
| 프레임워크 | **Next.js 15+** (App Router) | Pages Router 사용 금지 |
| UI 라이브러리 | **React 19** | |
| 언어 | **TypeScript** (strict) | `any` 사용 금지 |
| 스타일 | **Tailwind CSS** | CSS-in-JS(styled-components, Emotion) 금지 |
| 컴포넌트 | **shadcn/ui** (Radix + Tailwind) | `components/ui/` 에 소스 복사 방식 |
| 폰트 | **next/font** | Google Fonts CDN `<link>` 금지 |
| 이미지 | **next/image** | `<img>` 직접 사용 금지 |
| 내비게이션 | **next/link**, **next/navigation** | `next/router` 금지 |
| 인증 | Clerk / Auth0 / Descope | next-auth 레거시 패턴 금지 |

---

## 2. 폴더 구조

### 2-1. 기본 레이아웃

```
project-root/
├── app/                          # App Router (라우팅 + 페이지)
│   ├── layout.tsx                # 루트 레이아웃 (필수)
│   ├── page.tsx                  # 홈 (/)
│   ├── loading.tsx               # 전역 로딩 UI
│   ├── error.tsx                 # 전역 에러 UI
│   ├── not-found.tsx             # 404
│   ├── global-error.tsx          # 루트 레이아웃 에러
│   ├── (marketing)/              # Route Group (URL에 미포함)
│   │   └── about/
│   │       └── page.tsx          # /about
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   └── dashboard/
│   │       └── page.tsx          # /dashboard
│   ├── api/                      # Route Handlers (REST API)
│   │   └── users/
│   │       └── route.ts          # GET/POST /api/users
│   └── [slug]/                   # Dynamic segment
│       └── page.tsx              # /:slug
│
├── components/                   # 공유 컴포넌트
│   ├── ui/                       # shadcn/ui (CLI로 추가, 직접 수정 가능)
│   ├── layout/                   # Header, Footer, Sidebar 등
│   └── features/                 # 도메인별 기능 컴포넌트
│       └── {domain}/
│           ├── {Feature}Card.tsx
│           └── {Feature}Form.tsx
│
├── lib/                          # 유틸리티, DB 클라이언트, 헬퍼
│   ├── utils.ts                  # cn() 등 공통 유틸
│   ├── db.ts                     # DB 클라이언트
│   └── validations/              # Zod 스키마
│       └── {domain}.ts
│
├── actions/                      # Server Actions (뮤테이션)
│   └── {domain}.ts
│
├── hooks/                        # 커스텀 React 훅 (Client 전용)
│   └── use-{name}.ts
│
├── types/                        # 공유 TypeScript 타입
│   └── {domain}.ts
│
├── public/                       # 정적 파일 (favicon, og-image 등)
│
├── proxy.ts                      # Next.js 16+ 요청 가로채기 (구 middleware.ts)
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── components.json               # shadcn/ui 설정
```

### 2-2. `src/` 디렉토리 사용 시

`src/` 를 쓰는 프로젝트는 위 구조를 `src/` 아래로 이동한다.

```
src/
├── app/
├── components/
├── lib/
├── actions/
├── hooks/
└── types/
```

> **규칙:** `app/` 과 `src/app/` 을 동시에 두지 않는다. 프로젝트 하나만 선택.

### 2-3. Private 폴더 (라우팅 제외)

`app/` 내부에서 라우트가 되면 안 되는 파일/폴더는 `_` 접두사를 붙인다.

```
app/
├── _components/          # 이 세그먼트는 URL이 되지 않음
│   └── LocalWidget.tsx
└── dashboard/
    └── page.tsx
```

### 2-4. Route Group vs Feature 폴더

| 패턴 | 위치 | 용도 |
|------|------|------|
| `(group)/` | `app/` 내부 | 레이아웃 분리, URL 변경 없음 |
| `features/` | `components/features/` | 재사용 가능한 도메인 UI |
| `api/` | `app/api/` | 외부/클라이언트용 REST 엔드포인트 |

---

## 3. 파일·네이밍 규칙

### 3-1. 파일명

| 종류 | 규칙 | 예시 |
|------|------|------|
| App Router 특수 파일 | Next.js 고정명 | `page.tsx`, `layout.tsx`, `route.ts` |
| React 컴포넌트 | `PascalCase.tsx` | `UserCard.tsx`, `LoginForm.tsx` |
| Server Action | `{domain}.ts` (camelCase 함수) | `actions/user.ts` → `createUser()` |
| 커스텀 훅 | `use-{name}.ts` | `use-debounce.ts` |
| 유틸/헬퍼 | `kebab-case.ts` 또는 `{name}.ts` | `utils.ts`, `format-date.ts` |
| 타입 정의 | `{domain}.ts` | `types/user.ts` |
| Zod 스키마 | `{domain}.ts` | `validations/user.ts` |
| Route Handler | `route.ts` (고정) | `app/api/users/route.ts` |

### 3-2. 컴포넌트 접두사

| 접두사 | 용도 | 예시 |
|--------|------|------|
| (없음) | 일반 UI | `Button`, `Card` → shadcn/ui |
| `{Domain}` | 도메인 기능 | `UserProfile`, `OrderList` |
| `{Domain}{Role}` | 역할별 변형 | `ProductCard`, `ProductForm` |

### 3-3. Export 규칙

```tsx
// ✅ Named export (재사용 컴포넌트, 훅, 유틸)
export function UserCard({ user }: UserCardProps) { ... }

// ✅ Default export (page.tsx, layout.tsx만)
export default async function Page() { ... }

// ❌ page/layout/error 외 default export 남용 금지
```

### 3-4. Import 경로

```tsx
// ✅ 절대 경로 alias (@/) 사용
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createUser } from '@/actions/user'

// ❌ 상대 경로 깊은 체인 금지
import { Button } from '../../../components/ui/button'
```

---

## 4. App Router 파일 컨벤션

### 4-1. 특수 파일 역할

| 파일 | 역할 | `'use client'` |
|------|------|----------------|
| `page.tsx` | 라우트 UI | Server 기본 (Client는 최소화) |
| `layout.tsx` | 공유 레이아웃 (navigation 간 유지) | Server 기본 |
| `template.tsx` | navigation마다 재렌더되는 레이아웃 | Server 기본 |
| `loading.tsx` | Suspense fallback | Server |
| `error.tsx` | Error boundary | **Client 필수** |
| `not-found.tsx` | 404 UI | Server 또는 Client |
| `global-error.tsx` | 루트 레이아웃 에러 | **Client 필수** |
| `route.ts` | API 엔드포인트 | Server (React 훅 불가) |
| `default.tsx` | Parallel route fallback | Server |

### 4-2. Route Segments

```
app/
├── blog/               → /blog          (Static)
├── [slug]/             → /:slug         (Dynamic)
├── [...slug]/          → /a/b/c         (Catch-all)
├── [[...slug]]/        → / 또는 /a/b/c  (Optional catch-all)
└── (marketing)/        → URL에 미포함   (Route Group)
```

### 4-3. Route Handler vs page.tsx 충돌

**같은 폴더에 `route.ts`와 `page.tsx`를 동시에 두지 않는다.**

```
✅ app/users/page.tsx          → /users (페이지)
✅ app/api/users/route.ts      → /api/users (API)

❌ app/users/page.tsx + route.ts  → 충돌
```

### 4-4. Proxy (Next.js 16+)

```ts
// proxy.ts (프로젝트 루트)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  // 인증, 리다이렉트, rewrite
  return NextResponse.next()
}

export const proxyConfig = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
}
```

> Next.js 14–15: `middleware.ts` + `middleware()` + `config`
> Next.js 16+: `proxy.ts` + `proxy()` + `proxyConfig`

---

## 5. Server / Client 컴포넌트 경계

### 5-1. 기본 원칙

```
Server Component (기본) ──props──▶ Client Component ('use client')
                                      │
                                      └── hooks, events, browser API
```

- **모든 컴포넌트는 기본적으로 Server Component**다.
- `'use client'`는 꼭 필요할 때만 파일 최상단에 선언한다.
- Client Component를 가능한 한 **leaf(말단)** 에 배치한다.

### 5-2. `'use client'`가 필요한 경우

- React hooks (`useState`, `useEffect`, `useRef` 등)
- 이벤트 핸들러 (`onClick`, `onChange`, `onSubmit`)
- Browser API (`window`, `localStorage`, `navigator`)
- Context Provider/Consumer
- 서드파티 Client-only 라이브러리

### 5-3. `'use client'`가 불필요한 경우

- 데이터 fetch (async Server Component)
- DB/API 직접 접근
- 환경 변수 (서버 전용) 접근
- Server Action 호출 결과 렌더링
- `metadata`, `generateMetadata` export

### 5-4. RSC 경계 위반 (금지)

| 패턴 | 유효? | 수정 |
|------|-------|------|
| `'use client'` + `async function` | ❌ | Server 부모에서 fetch 후 props 전달 |
| Server → Client에 함수 prop 전달 | ❌ | Client 내부 정의 또는 Server Action |
| Server → Client에 `Date` 객체 전달 | ❌ | `.toISOString()` 으로 직렬화 |
| Server → Client에 `Map`/`Set`/클래스 인스턴스 | ❌ | plain object/array로 변환 |
| Server Action을 Client에 prop으로 전달 | ✅ | `'use server'` 함수만 예외 |
| string/number/boolean/plain object | ✅ | |

### 5-5. Server Action

```ts
// actions/user.ts
'use server'

import { revalidatePath } from 'next/cache'

export async function createUser(formData: FormData) {
  const name = formData.get('name') as string
  // DB 작업...
  revalidatePath('/users')
}
```

```tsx
// Client Component에서 사용
'use client'
import { createUser } from '@/actions/user'

export function UserForm() {
  return (
    <form action={createUser}>
      <input name="name" required />
      <button type="submit">Create</button>
    </form>
  )
}
```

---

## 6. 비동기 API (Next.js 15+)

Next.js 15+에서 `params`, `searchParams`, `cookies()`, `headers()`는 **모두 async**다.

### 6-1. Page / Layout

```tsx
type PageProps = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ query?: string }>
}

export default async function Page({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { query } = await searchParams
  // ...
}
```

### 6-2. generateMetadata

```tsx
type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return { title: slug }
}
```

### 6-3. Route Handler

```tsx
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  // ...
}
```

### 6-4. cookies / headers

```tsx
import { cookies, headers } from 'next/headers'

export default async function Page() {
  const cookieStore = await cookies()
  const headersList = await headers()
  const theme = cookieStore.get('theme')
}
```

### 6-5. React 19 useRef

```tsx
// ❌ React 19: 초기값 없는 useRef 금지
const ref = useRef()

// ✅
const ref = useRef<HTMLDivElement>(null)
const countRef = useRef(0)
```

---

## 7. 데이터 패턴

### 7-1. 선택 기준

```
데이터가 필요한가?
├── Server Component에서?
│   └── ✅ 직접 fetch / DB 접근 (API 레이어 불필요)
│
├── Client Component에서?
│   ├── Mutation (POST/PUT/DELETE)?
│   │   └── ✅ Server Action
│   └── Read (GET)?
│       ├── ✅ Server Component에서 fetch → props 전달 (우선)
│       └── ✅ Route Handler + client fetch (필요 시)
│
├── 외부 API / Webhook / 모바일 클라이언트?
│   └── ✅ Route Handler
│
└── 내부 UI mutation?
    └── ✅ Server Action (Route Handler 대신)
```

### 7-2. Server Component fetch (Read 우선)

```tsx
// app/users/page.tsx
export default async function UsersPage() {
  const users = await db.user.findMany()
  return <UserList users={users} />
}
```

### 7-3. Server Action (Mutation 우선)

```tsx
'use server'
export async function deleteUser(id: string) {
  await db.user.delete({ where: { id } })
  revalidateTag('users')
}
```

### 7-4. Route Handler (외부 API)

```tsx
// app/api/users/route.ts
export async function GET() {
  const users = await db.user.findMany()
  return Response.json(users)
}
```

### 7-5. Waterfall 방지

```tsx
// ❌ 순차 fetch
const user = await getUser()
const posts = await getPosts()

// ✅ 병렬 fetch
const [user, posts] = await Promise.all([getUser(), getPosts()])

// ✅ Suspense 스트리밍
<Suspense fallback={<Skeleton />}>
  <UserSection />
</Suspense>
```

### 7-6. React cache() 로 중복 fetch 방지

```tsx
import { cache } from 'react'

export const getPost = cache(async (slug: string) => {
  return db.post.findUnique({ where: { slug } })
})
```

---

## 8. 코드 작성 규칙

### 8-1. 컴포넌트 구조

```tsx
// 1. imports (외부 → 내부 → 타입)
import { Suspense } from 'react'
import { Button } from '@/components/ui/button'
import type { User } from '@/types/user'

// 2. 타입/인터페이스
interface UserCardProps {
  user: User
}

// 3. 컴포넌트 (named export)
export function UserCard({ user }: UserCardProps) {
  return (
    <div className="rounded-lg border p-4">
      <h2 className="text-lg font-semibold">{user.name}</h2>
    </div>
  )
}
```

### 8-2. Server Component page 패턴

```tsx
// app/users/page.tsx
import { Suspense } from 'react'
import { UserList } from '@/components/features/user/UserList'
import { UserListSkeleton } from '@/components/features/user/UserListSkeleton'

export default async function UsersPage() {
  return (
    <main className="container mx-auto py-8">
      <h1 className="text-2xl font-bold">Users</h1>
      <Suspense fallback={<UserListSkeleton />}>
        <UserList />
      </Suspense>
    </main>
  )
}
```

### 8-3. Client Component 패턴

```tsx
'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { createUser } from '@/actions/user'

export function CreateUserForm() {
  const [name, setName] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const formData = new FormData()
    formData.set('name', name)
    startTransition(async () => {
      await createUser(formData)
      setName('')
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <input value={name} onChange={(e) => setName(e.target.value)} />
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create'}
      </Button>
    </form>
  )
}
```

### 8-4. 내비게이션

```tsx
// ✅ 내부 링크
import Link from 'next/link'
<Link href="/about">About</Link>

// ✅ 프로그래매틱 내비게이션 (Client)
'use client'
import { useRouter } from 'next/navigation'
const router = useRouter()
router.push('/dashboard')

// ❌ Pages Router API
import { useRouter } from 'next/router'  // 금지
<a href="/about">About</a>               // 내부 링크에 금지
```

### 8-5. 환경 변수

```ts
// 서버 전용 (절대 Client에 노출 금지)
process.env.DATABASE_URL
process.env.API_SECRET

// 클라이언트 노출 (NEXT_PUBLIC_ 접두사 필수)
process.env.NEXT_PUBLIC_APP_URL
```

---

## 9. TypeScript 규칙

### 9-1. tsconfig 기본

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "paths": { "@/*": ["./*"] }
  }
}
```

### 9-2. 타입 작성

```tsx
// ✅ Props는 interface 또는 type
interface ButtonProps {
  label: string
  onClick?: () => void
  variant?: 'default' | 'destructive'
}

// ✅ API 응답 타입은 types/ 에 분리
// types/user.ts
export interface User {
  id: string
  name: string
  email: string
  createdAt: string  // ISO string (Date 직렬화)
}

// ✅ Zod로 런타임 검증 (Server Action, Route Handler 입력)
import { z } from 'zod'
const CreateUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
})
```

### 9-3. 금지

- `any` 타입 (불가피한 경우 `unknown` + type guard)
- `@ts-ignore` (사유 없는 사용 금지)
- non-null assertion (`!`) 남용

---

## 10. UI / 스타일링

### 10-1. shadcn/ui 사용

```bash
# 컴포넌트 추가 (에이전트/CI: 반드시 -d 플래그)
npx shadcn@latest add button dialog card -d
```

- `components/ui/` 파일은 프로젝트 소유 코드 — 필요 시 직접 수정 가능
- 새 UI 필요 시 shadcn 컴포넌트 조합 우선, raw HTML/CSS 최소화

### 10-2. Tailwind CSS

```tsx
import { cn } from '@/lib/utils'

// ✅ cn()으로 조건부 클래스 병합
<div className={cn('rounded-lg border p-4', isActive && 'border-primary')} />

// ❌ inline style 남용
<div style={{ padding: '16px' }} />

// ❌ CSS Modules / CSS-in-JS
```

### 10-3. next/image

```tsx
import Image from 'next/image'

<Image
  src="/hero.jpg"
  alt="Hero image"
  width={800}
  height={400}
  priority          // LCP 이미지
  sizes="(max-width: 768px) 100vw, 800px"
/>
```

### 10-4. next/font

```tsx
// app/layout.tsx
import { GeistSans } from 'geist/font/sans'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={GeistSans.className}>
      <body>{children}</body>
    </html>
  )
}
```

### 10-5. 접근성 (a11y)

- 모든 `<img>` / `<Image>`에 `alt` 필수
- 버튼/링크에 명확한 레이블
- shadcn/ui (Radix) 컴포넌트로 키보드 접근성 확보
- form input에 `<label>` 연결

---

## 11. 에러 처리

### 11-1. error.tsx (Client 필수)

```tsx
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div>
      <h2>Something went wrong</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  )
}
```

### 11-2. not-found

```tsx
import { notFound } from 'next/navigation'

export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser(id)
  if (!user) notFound()
  return <UserProfile user={user} />
}
```

### 11-3. Server Action에서 redirect/notFound

```tsx
'use server'
import { redirect } from 'next/navigation'

// ❌ redirect/notFound를 try-catch로 감싸지 않는다
// (Next.js가 내부적으로 throw하는 특수 에러)

export async function createPost(formData: FormData) {
  const post = await db.post.create({ ... })
  redirect(`/posts/${post.id}`)  // try-catch 밖에서 호출
}
```

### 11-4. API Route Handler 에러

```tsx
export async function GET() {
  try {
    const data = await fetchData()
    return Response.json(data)
  } catch (error) {
    console.error('[GET /api/users]', error)
    return Response.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
```

---

## 12. 메타데이터 & SEO

```tsx
// Server Component에서만 (Client Component 불가)
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Page Title',
  description: 'Page description',
  openGraph: {
    title: 'Page Title',
    description: 'Page description',
  },
}
```

- `'use client'` 페이지에는 metadata 불가 → 부모 layout 또는 Server wrapper 사용
- `generateMetadata`와 page가 같은 데이터 필요 시 `React.cache()` 공유

---

## 13. 성능 규칙

### 우선순위 (Vercel React Best Practices)

| 우선순위 | 카테고리 | 핵심 규칙 |
|----------|----------|-----------|
| 1 CRITICAL | Waterfall 제거 | `Promise.all`, Suspense 스트리밍 |
| 2 CRITICAL | 번들 크기 | barrel import 금지, `next/dynamic` lazy load |
| 3 HIGH | Server 성능 | `React.cache()`, Client로 전달 데이터 최소화 |
| 4 MEDIUM | Re-render | `useTransition`, derived state, memo 남용 금지 |
| 5 MEDIUM | 렌더링 | 정적 JSX hoist, `useSearchParams` → Suspense 필수 |

### 필수 체크

- [ ] 독립 fetch는 `Promise.all`로 병렬화
- [ ] Client Component 트리 최소화 (leaf 배치)
- [ ] 무거운 컴포넌트는 `next/dynamic(() => import(...), { ssr: false })`
- [ ] `useSearchParams`, `usePathname` 사용 Client → Suspense boundary 필수
- [ ] barrel file (`index.ts` re-export) import 지양 → 직접 import

---

## 14. 금지 사항

### Pages Router 레거시 (전면 금지)

| 금지 | 대안 |
|------|------|
| `pages/` 디렉토리 | `app/` App Router |
| `getServerSideProps` | Server Component async fetch |
| `getStaticProps` | `generateStaticParams` + Server Component |
| `next/router` | `next/navigation` |
| `next/head` | `metadata` / `generateMetadata` |
| `pages/api/` | `app/api/.../route.ts` |
| `_app.tsx`, `_document.tsx` | `app/layout.tsx` |

### 기타 금지

- `'use client'` 파일에서 `async` 컴포넌트
- Server → Client non-serializable props (함수, Date, Map, 클래스)
- 컴포넌트 내부에 컴포넌트 정의 (inline component)
- `useEffect`로 derive 가능한 state 관리
- 프로세스 메모리 캐시 (serverless 환경에서 무효)
- Express/Fastify 등 별도 서버 프레임워크
- `<img>` 대신 `<Image>` 미사용
- Google Fonts CDN `<link>` (next/font 사용)
- 요청 범위 밖 불필요한 리팩토링
- 요청되지 않은 기능 추가

---

## 15. 구현 순서 (하네스 Implementer용)

새 기능 구현 시 아래 순서를 따른다.

```
1. types/{domain}.ts          ← 타입 정의
2. lib/validations/{domain}.ts ← Zod 스키마 (입력 검증)
3. actions/{domain}.ts         ← Server Action (mutation)
   또는 app/api/{domain}/route.ts ← Route Handler (외부 API)
4. lib/{domain}.ts             ← 데이터 fetch 헬퍼 (React.cache())
5. components/features/{domain}/ ← UI 컴포넌트
6. app/{route}/page.tsx        ← 페이지 조립
7. app/{route}/loading.tsx     ← 로딩 UI (필요 시)
8. app/{route}/error.tsx       ← 에러 UI (필요 시)
```

### Implementer 체크리스트

- [ ] 기존 파일 패턴과 동일한 방식으로 구현
- [ ] Server/Client 경계 올바르게 분리
- [ ] `params`, `cookies`, `headers` await 처리
- [ ] Props 직렬화 가능 여부 확인
- [ ] TypeScript strict 준수 (`any` 없음)
- [ ] shadcn/ui + Tailwind 사용
- [ ] 불필요한 `'use client'` 없음
- [ ] 요청 범위 외 코드 수정 없음

---

## 참고 문서

- [Next.js App Router](https://nextjs.org/docs/app)
- [Next.js Project Structure](https://nextjs.org/docs/app/getting-started/project-structure)
- [React Server Components](https://react.dev/reference/rsc/server-components)
- [React 'use client'](https://react.dev/reference/rsc/use-client)
- [React 'use server'](https://react.dev/reference/rsc/use-server)
- [shadcn/ui](https://ui.shadcn.com/docs)
- [Vercel React Best Practices](https://vercel.com/blog/react-best-practices)

---

**변경 이력**

| 날짜 | 변경 내용 |
|------|----------|
| 2026-06-08 | 초기 작성 — React/Next.js App Router 컨벤션 |
