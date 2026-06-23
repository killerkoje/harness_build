# CSS / Tailwind CSS 프로젝트 컨벤션

> 하네스 파이프라인(분석 → 구현 → QA)에서 **스타일 작성·리팩토링 전 반드시 참조**하는 규칙 문서.
> `REACT_NEXT_CONVENTIONS.md`와 함께 사용한다.
>
> 기준:
> - [Tailwind CSS 공식 문서](https://tailwindcss.com/docs)
> - [MDN CSS 가이드](https://developer.mozilla.org/en-US/docs/Web/CSS)
> - [Next.js CSS Modules](https://nextjs.org/docs/app/building-your-application/styling/css-modules)
> - [Next.js Tailwind CSS](https://nextjs.org/docs/app/building-your-application/styling/tailwind-css)

---

## 목차

1. [스타일 모드 감지](#1-스타일-모드-감지)
2. [폴더 구조](#2-폴더-구조)
3. [Tailwind CSS 규칙](#3-tailwind-css-규칙)
4. [Pure CSS 규칙](#4-pure-css-규칙)
5. [CSS Modules 규칙](#5-css-modules-규칙)
6. [디자인 토큰 & 테마](#6-디자인-토큰--테마)
7. [네이밍 & 포맷팅](#7-네이밍--포맷팅)
8. [스타일 선택 결정 트리](#8-스타일-선택-결정-트리)
9. [자동 리팩토링 규칙](#9-자동-리팩토링-규칙)
10. [접근성 (a11y)](#10-접근성-a11y)
11. [성능 규칙](#11-성능-규칙)
12. [금지 사항](#12-금지-사항)
13. [QA 체크리스트](#13-qa-체크리스트)
14. [Implementer 구현 순서](#14-implementer-구현-순서)

---

## 1. 스타일 모드 감지

에이전트는 코드 작성 전 **프로젝트의 스타일 모드를 먼저 판별**한다.

| 모드 | 감지 조건 | 적용 규칙 |
|------|----------|----------|
| **Tailwind** | `tailwindcss` 의존성, `@import "tailwindcss"`, `tailwind.config.*` | §3 전체 |
| **Pure CSS** | `.css` 파일만, Tailwind 없음 | §4 전체 |
| **Hybrid** | Tailwind + `.module.css` 또는 `@layer components` | §3 + §4 + §5 |
| **shadcn/ui** | `components/ui/`, `components.json` | §3 + §6 (CSS 변수 테마) |

### 감지 우선순위

```
1. package.json → tailwindcss 존재 여부
2. app/globals.css 또는 src/app/globals.css → @import "tailwindcss" / @tailwind
3. components.json → shadcn/ui
4. *.module.css 파일 존재 → CSS Modules 병행
5. 위 모두 없음 → Pure CSS
```

> **원칙:** 프로젝트에 이미 Tailwind가 있으면 Pure CSS로 새 스타일을 추가하지 않는다. 반대로 Pure CSS 프로젝트에 Tailwind utility를 섞지 않는다.

---

## 2. 폴더 구조

### 2-1. Tailwind / Hybrid (Next.js App Router)

```
project-root/
├── app/
│   └── globals.css              # Tailwind 진입점 + @theme + CSS 변수
├── components/
│   ├── ui/                      # shadcn/ui (Tailwind utility)
│   └── features/
│       └── {domain}/
│           ├── {Feature}.tsx
│           └── {Feature}.module.css   # Hybrid: 컴포넌트 전용 CSS (필요 시)
├── styles/                      # Pure CSS / 공유 스타일 (선택)
│   ├── base/
│   │   ├── reset.css            # 리셋 / normalize
│   │   ├── typography.css       # h1~h6, p, a 기본
│   │   └── variables.css        # :root CSS 변수 (Pure CSS 토큰)
│   ├── components/
│   │   └── button.css           # 재사용 컴포넌트 스타일
│   ├── layouts/
│   │   └── grid.css
│   └── utilities/
│       └── helpers.css          # .sr-only, .truncate 등
└── tailwind.config.ts           # v3 프로젝트만 (v4는 globals.css @theme)
```

### 2-1. Pure CSS 전용

```
project-root/
├── app/
│   └── globals.css              # @import로 styles/ 하위 파일 로드
├── styles/
│   ├── base/
│   ├── components/
│   ├── layouts/
│   └── utilities/
└── components/
    └── features/
        └── {domain}/
            ├── {Feature}.tsx
            └── {Feature}.module.css
```

### 2-2. globals.css 구조 (Tailwind v4)

```css
/* app/globals.css */
@import "tailwindcss";

/* shadcn/ui + 커스텀 디자인 토큰 */
@theme {
  --color-primary: oklch(0.55 0.2 250);
  --color-primary-foreground: oklch(0.98 0 0);
  --radius-lg: 0.75rem;
  --font-sans: var(--font-geist-sans);
}

/* shadcn CSS 변수 (다크모드) */
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.15 0 0);
}
.dark {
  --background: oklch(0.15 0 0);
  --foreground: oklch(0.98 0 0);
}

/* 재사용 커스텀 클래스 (최소한만) */
@layer components {
  .btn-primary { /* §3-7 참조 */ }
}

/* 외부 UI 라이브러리 소스 (필요 시) */
@source "../node_modules/@my-ui-lib/dist/**/*.js";
```

### 2-3. globals.css 구조 (Pure CSS)

```css
/* app/globals.css — MDN 권장: 논리적 섹션 순서 */

/* || 1. Base */
@import "../styles/base/variables.css";
@import "../styles/base/reset.css";
@import "../styles/base/typography.css";

/* || 2. Layouts */
@import "../styles/layouts/grid.css";

/* || 3. Components */
@import "../styles/components/button.css";

/* || 4. Utilities */
@import "../styles/utilities/helpers.css";
```

---

## 3. Tailwind CSS 규칙

> 기준: [Styling with utility classes](https://tailwindcss.com/docs/styling-with-utility-classes)

### 3-1. 핵심 원칙

1. **Utility-first** — 스타일은 JSX `className`에 utility class로 작성
2. **컴포넌트 추출** — 반복 패턴은 React 컴포넌트로 추출 (`@apply` 남용 금지)
3. **디자인 토큰** — 색/간격/폰트는 `@theme` (v4) 또는 `tailwind.config` (v3)에서 정의
4. **충돌 방지** — 같은 속성의 utility 두 개를 동시에 붙이지 않음

### 3-2. className 작성 규칙

```tsx
import { cn } from '@/lib/utils'

// ✅ cn()으로 조건부 클래스 병합
<button
  className={cn(
    'inline-flex items-center justify-center rounded-md px-4 py-2',
    'text-sm font-medium transition-colors',
    'bg-primary text-primary-foreground hover:bg-primary/90',
    'disabled:pointer-events-none disabled:opacity-50',
    isActive && 'ring-2 ring-primary',
    className  // 외부 override 허용 시
  )}
/>

// ❌ template literal로 충돌 클래스 생성
className={`flex ${isGrid ? 'grid' : 'flex'}`}  // 둘 다 있으면 충돌
// ✅ 조건 분기로 하나만 적용
className={isGrid ? 'grid' : 'flex'}
```

### 3-3. 클래스 순서 (자동 정렬)

`prettier-plugin-tailwindcss` 권장 순서:

```
1. layout      (flex, grid, block, hidden)
2. position    (relative, absolute, sticky)
3. box model   (w-, h-, p-, m-, gap-)
4. typography  (text-, font-, leading-)
5. visual      (bg-, border-, shadow-, rounded-)
6. misc        (cursor-, transition-, animate-)
7. states      (hover:, focus:, active:)
8. responsive  (sm:, md:, lg:, xl:)
9. dark mode   (dark:)
```

설치:

```bash
npm install -D prettier prettier-plugin-tailwindcss
```

### 3-4. Variant (상태·반응형·다크모드)

```tsx
// 상태
'hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring'
'disabled:opacity-50 disabled:pointer-events-none'
'aria-[invalid=true]:border-destructive'

// 반응형 (mobile-first)
'flex flex-col sm:flex-row md:gap-6 lg:max-w-4xl'

// 다크모드
'bg-white text-gray-900 dark:bg-gray-800 dark:text-white'

// 그룹 / 형제
'group-hover:underline peer-disabled:opacity-50'
```

### 3-5. Arbitrary Values (제한적 사용)

```tsx
// ✅ 일회성 값 (테마에 없는 경우)
className="bg-[#316ff6] grid-cols-[1fr_2.5rem_minmax(0,1fr)]"

// ❌ 반복 사용되는 arbitrary value → @theme으로 승격
// 3회 이상 동일 값 → @theme { --color-brand: #316ff6; }
```

**승격 규칙:** 동일 arbitrary value가 **3회 이상** 반복되면 `@theme`에 토큰으로 등록한다.

### 3-6. 중복 관리 우선순위

Tailwind 공식 권장 순서:

```
1. loop/map으로 className 1회 작성
2. React 컴포넌트 추출 (Button, Card, Badge 등)
3. cn() + cva() (shadcn variant 패턴)
4. @layer components + @apply (단일 HTML 요소만, 최후 수단)
5. CSS Modules (Tailwind로 표현 불가한 복잡한 애니메이션)
```

### 3-7. @apply 사용 기준

```css
/* ✅ 허용: 단일 HTML 요소, 프로젝트 전역 반복 (btn-primary 등) */
@layer components {
  .btn-primary {
    border-radius: var(--radius-md);
    background-color: var(--color-primary);
    padding-inline: --spacing(4);
    padding-block: --spacing(2);
    font-weight: var(--font-weight-medium);
    color: var(--color-primary-foreground);
    &:hover {
      @media (hover: hover) {
        background-color: color-mix(in oklch, var(--color-primary), black 10%);
      }
    }
  }
}

/* ❌ 금지: @apply로 Tailwind utility 대량 복사 */
.card {
  @apply flex flex-col gap-4 rounded-lg border p-6 shadow-sm;
  /* → React <Card> 컴포넌트로 추출할 것 */
}
```

### 3-8. shadcn/ui + cva() 패턴

```tsx
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3',
        lg: 'h-11 px-8',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size, className }))} {...props} />
  )
}
```

### 3-9. Tailwind v3 vs v4

| 항목 | v3 | v4 |
|------|----|----|
| 진입점 | `@tailwind base/components/utilities` | `@import "tailwindcss"` |
| 설정 | `tailwind.config.ts` | `@theme` in CSS |
| 콘텐츠 | `content: [...]` | 자동 감지 + `@source` |
| 다크모드 | `darkMode: 'class'` in config | `@custom-variant dark` |
| 플러그인 | `plugins: []` in config | `@plugin` in CSS |

v4 마이그레이션: `npx @tailwindcss/upgrade`

### 3-10. inline style 허용 조건

Tailwind 공식 — 아래 경우만 `style` prop 허용:

```tsx
// ✅ 동적 값 (API/DB에서 오는 색상)
<button style={{ backgroundColor: brandColor }} className="rounded-md px-4 py-2" />

// ✅ CSS 변수 주입 + utility 참조
<div
  style={{ '--gutter': `${gutter}px` } as React.CSSProperties}
  className="gap-(--gutter)"
/>

// ❌ 정적 스타일을 inline으로 (→ utility class로 변환)
<div style={{ padding: '16px', display: 'flex' }} />
```

---

## 4. Pure CSS 규칙

> 기준: [MDN — Organizing your CSS](https://developer.mozilla.org/en-US/docs/Learn/CSS/Building_blocks/Organizing)

### 4-1. 핵심 원칙

1. **일관성** — 프로젝트 전체 동일 포맷·네이밍·단위
2. **낮은 특이성** — 클래스 선택자 우선, ID/`!important` 금지
3. **논리적 섹션** — base → layout → component → utility 순
4. **재사용** — OOCSS/BEM 패턴으로 중복 최소화

### 4-2. 파일 내 섹션 순서 (MDN 권장)

```css
/* || GENERAL / BASE */
/* reset, typography, body */

/* || LAYOUTS */
/* grid, container, header, footer */

/* || COMPONENTS */
/* button, card, form, nav */

/* || UTILITIES */
/* .sr-only, .hidden, .truncate */

/* || PAGE-SPECIFIC (최소화) */
/* 특정 페이지만 쓰는 스타일 — 가능하면 CSS Module로 */
```

### 4-3. BEM 네이밍 (Pure CSS 기본)

```
.block {}
.block__element {}
.block--modifier {}
.block__element--modifier {}
```

```html
<!-- ✅ -->
<article class="card card--featured">
  <img class="card__image" src="..." alt="..." />
  <div class="card__body">
    <h2 class="card__title">Title</h2>
    <p class="card__description">...</p>
  </div>
</article>
```

```css
.card {
  display: flex;
  flex-direction: column;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
}

.card--featured {
  border-color: var(--color-primary);
}

.card__image {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
}

.card__title {
  font-size: var(--text-lg);
  font-weight: var(--font-weight-semibold);
}
```

### 4-4. 선택자 규칙

```css
/* ✅ 단일 클래스 (특이성 0-1-0) */
.btn { }
.card__title { }

/* ✅ 최대 2단계 (0-2-0) */
.card .card__title { }   /* BEM이면 불필요 — .card__title 단독 사용 */

/* ❌ 과도한 특이성 */
article.main section.content div.box p.text { }
#header .nav ul li a { }

/* ❌ !important (리팩토링 불가) */
.text { color: red !important; }
```

### 4-5. CSS 포맷팅

```css
/* ✅ 속성당 한 줄 (MDN 권장) */
.card {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-6);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
}

/* ✅ 논리적 속성 그룹 순서 */
/* 1. display / position / overflow
   2. box model (width, height, margin, padding)
   3. typography
   4. visual (background, border, shadow)
   5. animation / transition
   6. misc (cursor, pointer-events) */

/* ✅ 2-space indent, 세미콜론 필수, 마지막 속성도 세미콜론 */
```

### 4-6. CSS 변수 (Pure CSS 토큰)

```css
/* styles/base/variables.css */
:root {
  /* Color */
  --color-primary: #2563eb;
  --color-primary-hover: #1d4ed8;
  --color-surface: #ffffff;
  --color-text: #0f172a;
  --color-border: #e2e8f0;

  /* Spacing (4px base) */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;

  /* Typography */
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --font-weight-normal: 400;
  --font-weight-semibold: 600;

  /* Radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.75rem;

  /* Shadow */
  --shadow-sm: 0 1px 2px rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px rgb(0 0 0 / 0.07);
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-surface: #0f172a;
    --color-text: #f8fafc;
    --color-border: #334155;
  }
}
```

> **규칙:** 하드코딩 hex/rgb/px 값을 컴포넌트 CSS에 직접 쓰지 않는다. 3회 이상 반복 → `:root` 변수로 승격.

### 4-7. 레이아웃 (Pure CSS)

```css
/* ✅ Flexbox / Grid 우선 */
.layout-sidebar {
  display: grid;
  grid-template-columns: 16rem 1fr;
  min-height: 100dvh;
}

/* ✅ Container */
.container {
  width: 100%;
  max-width: 72rem;
  margin-inline: auto;
  padding-inline: var(--space-4);
}

/* ❌ float 기반 레이아웃 (신규 코드 금지) */
/* ❌ table 레이아웃 (신규 코드 금지) */
```

### 4-8. 반응형 (Pure CSS)

```css
/* ✅ mobile-first */
.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
}

@media (min-width: 640px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* 브레이크포인트 (Tailwind 기본값과 통일) */
/* sm: 640px | md: 768px | lg: 1024px | xl: 1280px | 2xl: 1536px */
```

---

## 5. CSS Modules 규칙

> Next.js App Router: `*.module.css`는 컴포넌트 co-location

### 5-1. 사용 시점

| 상황 | 선택 |
|------|------|
| Tailwind로 표현 가능 | Tailwind utility |
| 복잡한 `@keyframes` 애니메이션 | CSS Module |
| `:hover` + `::before` pseudo 복합 | CSS Module |
| 서드파티 DOM 제어 불가 | CSS Module + `:global()` |
| Pure CSS 프로젝트 컴포넌트 스코프 | CSS Module |

### 5-2. 파일·클래스 네이밍

```
components/features/product/ProductCard.tsx
components/features/product/ProductCard.module.css
```

```css
/* ProductCard.module.css — camelCase (JS import 편의) */
.card { }
.cardFeatured { }       /* BEM __ → camelCase */
.cardImage { }
.cardTitle { }
```

```tsx
import styles from './ProductCard.module.css'
import { cn } from '@/lib/utils'

export function ProductCard({ featured }: { featured?: boolean }) {
  return (
    <article className={cn(styles.card, featured && styles.cardFeatured)}>
      <img className={styles.cardImage} src="..." alt="..." />
      <h2 className={styles.cardTitle}>Title</h2>
    </article>
  )
}
```

### 5-3. CSS Module + Tailwind 병행

```tsx
// Tailwind: 레이아웃·spacing·typography
// CSS Module: 복잡한 애니메이션·pseudo
import styles from './Hero.module.css'

export function Hero() {
  return (
    <section className={cn('relative overflow-hidden py-24', styles.heroGradient)}>
      ...
    </section>
  )
}
```

### 5-4. :global() 사용

```css
/* CSS Module 내 전역 스타일 (최소화) */
.wrapper :global(.third-party-class) {
  font-size: var(--text-sm);
}
```

---

## 6. 디자인 토큰 & 테마

### 6-1. Tailwind v4 @theme

```css
@import "tailwindcss";

@theme {
  /* Color */
  --color-primary: oklch(0.55 0.2 250);
  --color-destructive: oklch(0.55 0.22 25);

  /* Spacing — 기본 스케일 확장 */
  --spacing-18: 4.5rem;

  /* Radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.75rem;

  /* Font */
  --font-sans: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;

  /* Breakpoint */
  --breakpoint-3xl: 120rem;
}
/* → bg-primary, p-18, rounded-lg, font-sans, 3xl:grid-cols-6 자동 생성 */
```

### 6-2. shadcn/ui CSS 변수 (Hybrid 필수)

```css
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --border: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --radius: 0.625rem;
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  /* ... */
}
```

### 6-3. 토큰 ↔ Utility 매핑 규칙

| 토큰 종류 | Tailwind | Pure CSS |
|----------|----------|----------|
| 색상 | `@theme --color-*` | `:root --color-*` |
| 간격 | `@theme --spacing-*` | `:root --space-*` |
| 폰트 | `@theme --font-*` | `:root --font-*` |
| 반경 | `@theme --radius-*` | `:root --radius-*` |

> **@theme vs :root:** utility class가 필요하면 `@theme`, 순수 CSS 변수만 필요하면 `:root`.

---

## 7. 네이밍 & 포맷팅

### 7-1. Tailwind

- utility class는 Tailwind 기본 이름 그대로 (커스텀 줄임말 금지)
- 커스텀 `@layer components` 클래스: `kebab-case` (`.btn-primary`, `.card-elevated`)
- cva variant key: `camelCase` (`destructive`, `outline`)

### 7-2. Pure CSS

- 클래스: `kebab-case` + BEM (`.block__element--modifier`)
- CSS 변수: `--{category}-{name}` (`--color-primary`, `--space-4`)
- 파일: `kebab-case.css`
- CSS Module 클래스: `camelCase`

### 7-3. 주석

```css
/* ✅ 섹션 구분 (검색 가능한 마커) */
/* || COMPONENTS — Button */

/* ✅ 비自明한 결정만 */
.btn {
  min-height: 44px; /* WCAG 2.5.5 touch target minimum */
}

/* ❌ 자명한 주석 */
/* .btn의 color를 blue로 설정 */
```

---

## 8. 스타일 선택 결정 트리

에이전트가 **새 스타일 작성 시** 따르는 결정 트리:

```
스타일이 필요한가?
│
├─ Tailwind 프로젝트?
│   ├─ shadcn 컴포넌트로 해결 가능? → shadcn/ui 사용
│   ├─ 단일 요소, 1~10 utility? → className utility
│   ├─ variant 2개 이상 반복? → cva() + cn()
│   ├─ 3회+ 동일 class 조합? → React 컴포넌트 추출
│   ├─ 전역 단일 요소 (btn-primary)? → @layer components
│   ├─ 복잡한 keyframes/pseudo? → CSS Module co-location
│   └─ 동적 값 (API 색상)? → style prop + CSS variable
│
├─ Pure CSS 프로젝트?
│   ├─ 컴포넌트 스코프? → CSS Module
│   ├─ 재사용 2회+? → styles/components/ + BEM
│   ├─ 1회 페이지 전용? → CSS Module (styles/에 넣지 않음)
│   └─ 유틸리티 (.sr-only)? → styles/utilities/
│
└─ 기존 패턴과 충돌? → 기존 패턴 우선 (Analyzer 보고서 따름)
```

---

## 9. 자동 리팩토링 규칙

> QA 에이전트와 Implementer가 **스타일 리팩토링 시 자동 적용**하는 변환 규칙.

### 9-1. inline style → Tailwind

| inline style | Tailwind 변환 |
|-------------|--------------|
| `display: 'flex'` | `flex` |
| `flexDirection: 'column'` | `flex-col` |
| `alignItems: 'center'` | `items-center` |
| `justifyContent: 'space-between'` | `justify-between` |
| `gap: '16px'` | `gap-4` |
| `padding: '16px'` | `p-4` |
| `margin: '0 auto'` | `mx-auto` |
| `width: '100%'` | `w-full` |
| `maxWidth: '768px'` | `max-w-3xl` |
| `fontSize: '14px'` | `text-sm` |
| `fontWeight: 600` | `font-semibold` |
| `color: '#333'` | `text-gray-800` (또는 @theme 토큰) |
| `backgroundColor: '#fff'` | `bg-white` |
| `borderRadius: '8px'` | `rounded-lg` |
| `boxShadow: '...'` | `shadow-md` |
| `textAlign: 'center'` | `text-center` |
| `overflow: 'hidden'` | `overflow-hidden` |
| `position: 'relative'` | `relative` |
| `cursor: 'pointer'` | `cursor-pointer` |

**유지 (변환하지 않음):** API/DB 동적 값, `calc()` 복잡식, 런타임 CSS 변수 주입

### 9-2. inline style → Pure CSS

```tsx
// Before
<div style={{ display: 'flex', gap: '16px', padding: '24px' }}>

// After
<div className="flex-row">
```

```css
.flex-row {
  display: flex;
  gap: var(--space-4);
  padding: var(--space-6);
}
```

### 9-3. 반복 Tailwind class → 컴포넌트 추출

**트리거:** 동일 className 문자열 (또는 cn() 인자) **3회 이상** 등장

```tsx
// Before (5곳에서 반복)
<img className="inline-block h-12 w-12 rounded-full ring-2 ring-white" />

// After
function Avatar({ src, alt }: { src: string; alt: string }) {
  return (
    <img
      src={src}
      alt={alt}
      className="inline-block size-12 rounded-full ring-2 ring-white"
    />
  )
}
```

### 9-4. @apply 남용 → 컴포넌트 추출

**트리거:** `@apply` 3개 이상 utility

```css
/* Before — 리팩토링 대상 */
.card {
  @apply flex flex-col gap-4 rounded-lg border p-6 shadow-sm bg-white;
}
```

```tsx
/* After */
function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-4 rounded-lg border p-6 shadow-sm bg-white', className)}>
      {children}
    </div>
  )
}
```

### 9-5. magic number → 토큰 승격

**트리거:** 동일 리터럴 값 3회+ (색상 hex, px/rem, shadow)

```
#316ff6 × 4회 → @theme { --color-brand: #316ff6; } → bg-brand
16px × 5회    → @theme { --spacing-card: 1rem; } 또는 gap-4
```

### 9-6. 과도한 선택자 → BEM 단순화

```css
/* Before (특이성 0-3-1) */
article.post-list div.content p.description { color: gray; }

/* After (특이성 0-1-0) */
.post-list__description { color: var(--color-text-muted); }
```

### 9-7. !important 제거

```
1. 선택자 특이성 낮추기 (BEM 단일 클래스)
2. CSS 변수로 cascade 재정의
3. Tailwind: conflicting class 제거 (하나만 남기기)
4. Tailwind 최후: important modifier (bg-red-500!) — 사유 기록 필수
```

### 9-8. CSS-in-JS → Tailwind/shadcn 마이그레이션

| CSS-in-JS | 변환 |
|-----------|------|
| `styled.div`...`` | React 컴포넌트 + className |
| `css={{ ... }}` (Emotion) | Tailwind utility |
| `@emotion/styled` | shadcn/ui + cva() |
| `styled-components` ThemeProvider | `@theme` + CSS 변수 |

### 9-9. `<style>` 태그 / `<link>` 정리

| 패턴 | 변환 |
|------|------|
| `<style jsx>` | CSS Module 또는 Tailwind |
| `<link href="fonts.googleapis.com">` | `next/font` |
| `<style dangerouslySetInnerHTML>` | globals.css 또는 CSS Module |
| `<img>` without sizing | `next/image` + Tailwind size |

### 9-10. className 문자열 → cn() 통합

```tsx
// Before
className={`btn ${isActive ? 'btn--active' : ''} ${className ?? ''}`}

// After
className={cn('btn', isActive && 'btn--active', className)}
```

---

## 10. 접근성 (a11y)

### 10-1. 필수 CSS 규칙

```css
/* styles/utilities/helpers.css */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* Tailwind: sr-only utility 사용 (직접 정의 불필요) */
```

### 10-2. Tailwind a11y 패턴

```tsx
// ✅ focus-visible (마우스 클릭 시 outline 숨김, 키보드만 표시)
'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

// ✅ reduced motion
'motion-safe:transition-all motion-reduce:transition-none'

// ✅ touch target (최소 44×44px)
'min-h-11 min-w-11'

// ✅ color contrast — text-muted-foreground 대신 WCAG AA 충족 토큰 사용
```

### 10-3. 금지

- `outline: none` without `:focus-visible` 대체
- `color` 단독으로 정보 전달 (색맹 접근성)
- `font-size` 12px 미만 (본문 텍스트)

---

## 11. 성능 규칙

| 규칙 | Tailwind | Pure CSS |
|------|----------|----------|
| 미사용 CSS 제거 | JIT 자동 tree-shake | CSS Module co-location |
| Critical CSS | Next.js 자동 | globals.css 최소화 |
| 애니메이션 | `transform`/`opacity` only | `will-change` 남용 금지 |
| @import | v4: `@import "tailwindcss"` 1줄 | `@import` 체인 ≤ 10개 |
| 큰 CSS 파일 | 컴포넌트 추출로 utility 재사용 | 페이지별 CSS Module 분리 |

```css
/* ✅ GPU-friendly */
.animate-slide {
  transform: translateX(0);
  transition: transform 200ms ease;
}
.animate-slide.is-open {
  transform: translateX(100%);
}

/* ❌ layout-triggering animation */
.animate-slide { left: 0; transition: left 200ms; }
.animate-slide.is-open { left: 100%; }
```

---

## 12. 금지 사항

### 공통

- `!important` (Pure CSS 전면 / Tailwind 최후 수단만)
- ID 선택자로 스타일링 (`#header { }`)
- inline style로 정적 값 작성
- 요청 범위 밖 CSS 리팩토링
- 하드코딩 hex/px (3회+ → 토큰 승격)

### Tailwind

- `@apply` 3개+ utility 복사
- conflicting utility 동시 적용 (`grid flex`)
- arbitrary value 남용 (3회+ → @theme)
- Tailwind 없는 프로젝트에 utility class 추가

### Pure CSS

- float / table 레이아웃 (신규)
- 3단계+ 중첩 선택자
- 전역 태그 선택자 남용 (`div {}`, `p {}` — reset 제외)
- Pure CSS 프로젝트에 `@tailwind` 추가

### Next.js

- CSS-in-JS (styled-components, Emotion, MUI sx)
- `<link>` Google Fonts CDN
- Global CSS를 `app/` 외부에서 무단 import
- CSS Module without co-location (멀리 떨어진 경로)

---

## 13. QA 체크리스트

QA Validator가 스타일 관련 검증 시 확인:

### 모드 일치
- [ ] 프로젝트 스타일 모드(Tailwind/Pure/Hybrid)와 구현 방식 일치
- [ ] 기존 파일 패턴과 동일한 스타일링 방식 사용

### Tailwind
- [ ] `cn()` 사용 (문자열 concat 없음)
- [ ] conflicting utility 없음
- [ ] className Prettier 정렬 (가능 시)
- [ ] 3회+ 반복 class → 컴포넌트 추출됨
- [ ] arbitrary value 3회+ → @theme 승격
- [ ] `@apply` 3개 미만

### Pure CSS
- [ ] BEM 또는 프로젝트 네이밍 일관
- [ ] CSS 변수 사용 (magic number 없음)
- [ ] 선택자 특이성 ≤ 0-2-0
- [ ] `!important` 없음
- [ ] 섹션 순서: base → layout → component → utility

### CSS Module
- [ ] co-location (컴포넌트 옆 `.module.css`)
- [ ] camelCase 클래스명
- [ ] `:global()` 최소 사용

### a11y
- [ ] focus-visible 스타일 존재
- [ ] touch target ≥ 44px (인터랙티브)
- [ ] `outline: none` 단독 사용 없음

### 리팩토링
- [ ] inline style 정적 값 → utility/class 변환
- [ ] CSS-in-JS 잔존 없음
- [ ] 미사용 CSS 클래스 제거

---

## 14. Implementer 구현 순서

스타일 포함 기능 구현 시:

```
Tailwind 프로젝트:
1. @theme 토큰 확인/추가 (globals.css) — 새 색/간격 필요 시
2. shadcn/ui 컴포넌트 확인/추가 (npx shadcn@latest add ...)
3. cva() variant 정의 (variant 2개+)
4. React 컴포넌트 + className utility
5. CSS Module (복잡한 animation만)

Pure CSS 프로젝트:
1. styles/base/variables.css — 토큰 확인/추가
2. styles/components/ — 재사용 2회+ 스타일
3. CSS Module — 컴포넌트 co-location
4. globals.css @import 확인

Hybrid:
1. Tailwind utility (레이아웃·spacing·typography)
2. CSS Module (animation·pseudo·third-party)
3. cn(styles.xxx, 'tailwind classes') 병행
```

---

## 참고 문서

- [Tailwind CSS — Styling with utility classes](https://tailwindcss.com/docs/styling-with-utility-classes)
- [Tailwind CSS — Theme variables (@theme)](https://tailwindcss.com/docs/theme)
- [Tailwind CSS — Dark mode](https://tailwindcss.com/docs/dark-mode)
- [Tailwind CSS — Adding custom styles](https://tailwindcss.com/docs/adding-custom-styles)
- [MDN — Organizing your CSS](https://developer.mozilla.org/en-US/docs/Learn/CSS/Building_blocks/Organizing)
- [MDN — CSS custom properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- [MDN — Specificity](https://developer.mozilla.org/en-US/docs/Web/CSS/Specificity)
- [Next.js — Tailwind CSS](https://nextjs.org/docs/app/building-your-application/styling/tailwind-css)
- [Next.js — CSS Modules](https://nextjs.org/docs/app/building-your-application/styling/css-modules)
- [Next.js — CSS](https://nextjs.org/docs/app/building-your-application/styling/css)
- [shadcn/ui — Theming](https://ui.shadcn.com/docs/theming)

---

**변경 이력**

| 날짜 | 변경 내용 |
|------|----------|
| 2026-06-08 | 초기 작성 — Tailwind CSS + Pure CSS + 자동 리팩토링 규칙 |
