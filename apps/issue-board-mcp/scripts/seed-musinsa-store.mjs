#!/usr/bin/env node
/**
 * 무신사 스토어 앱 가정 — 기획 / 이슈 / 와이어프레임 시드
 * + design-system/ 산출물(fixtures)
 *
 * Usage: node scripts/seed-musinsa-store.mjs
 * Env: ISSUE_BOARD_API_URL (default http://localhost:4000)
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = process.env.ISSUE_BOARD_API_URL ?? 'http://localhost:4000'
const ROOT =
  process.env.MUSINSA_ROOT ??
  path.join(path.dirname(fileURLToPath(import.meta.url)), '../fixtures/musinsa-store')

const PLAN = {
  title: '무신사 스토어 앱 MVP',
  sections: {
    overview: `패션 커머스 모바일 앱(무신사 스토어 톤).
홈 큐레이션 → 탐색/검색 → 상품 상세 → 장바구니 → 주문까지 핵심 구매 루프를 MVP로 제공한다.
디자인 시스템: fixtures/musinsa-store/design-system/ (Primary #111, Accent #FF4800, ProductCard 3:4, TabBar 5탭).`,
    targetUsers: `• 20–30대 패션 관심 유저 (브랜드·트렌드 탐색)
• 세일/랭킹 중심으로 빠르게 구매 결정하는 모바일 유저
• 위시리스트로 비교 후 구매하는 유저`,
    mvpFeatures: [
      {
        priority: '높음',
        title: '홈 피드',
        description: '큐레이션 배너·랭킹·세일 상품 그리드, 하단 TabBar',
      },
      {
        priority: '높음',
        title: '카테고리·브랜드 탐색',
        description: '카테고리 트리 + 브랜드 리스트, 필터 칩',
      },
      {
        priority: '높음',
        title: '검색·필터',
        description: '키워드 검색, 정렬/가격/사이즈 필터 BottomSheet',
      },
      {
        priority: '높음',
        title: '상품 상세',
        description: '이미지 갤러리, 가격/세일, 옵션 선택, 구매 CTA',
      },
      {
        priority: '높음',
        title: '장바구니',
        description: '옵션별 수량 변경, 품절 처리, 주문하기',
      },
      {
        priority: '높음',
        title: '주문·결제',
        description: '배송지·쿠폰·결제수단, 주문 완료',
      },
      {
        priority: '보통',
        title: '위시리스트',
        description: '좋아요 상품 그리드, 장바구니 담기',
      },
      {
        priority: '보통',
        title: '마이·주문내역',
        description: '프로필 요약, 주문 상태 리스트, 설정 진입',
      },
    ],
    outOfScope: `• 라이브 커머스 / 숏폼
• 커뮤니티·코디 소셜
• 글로벌 다통화·다언어
• 판매자(셀러) 어드민
• 다크 모드 완성 스펙 (DS v0.1 범위 밖)`,
  },
}

/** issue number(1-based after approve) → screens */
const WIREFRAMES = {
  1: [
    {
      name: '홈',
      route: '/home',
      layout: {
        regions: [
          { type: 'nav', label: '로고 · 알림 · 장바구니' },
          { type: 'content', label: '큐레이션 배너 캐러셀' },
          { type: 'content', label: '랭킹/세일 Chip + ProductCard 그리드 2열' },
          { type: 'footer', label: 'TabBar: 홈 · 카테고리 · 검색 · 좋아요 · 마이' },
        ],
      },
    },
  ],
  2: [
    {
      name: '카테고리',
      route: '/category',
      layout: {
        regions: [
          { type: 'nav', label: '카테고리' },
          { type: 'sidebar', label: '대분류 리스트' },
          { type: 'content', label: '중분류 + 브랜드 바로가기' },
          { type: 'footer', label: 'TabBar' },
        ],
      },
    },
    {
      name: '브랜드',
      route: '/brands/:id',
      layout: {
        regions: [
          { type: 'nav', label: '브랜드명 · 위시' },
          { type: 'content', label: '브랜드 헤더 + 필터 Chip' },
          { type: 'content', label: 'ProductCard 그리드' },
        ],
      },
    },
  ],
  3: [
    {
      name: '검색',
      route: '/search',
      layout: {
        regions: [
          { type: 'nav', label: '검색 입력 · 취소' },
          { type: 'content', label: '최근/인기 검색어' },
          { type: 'content', label: '결과 그리드 + 정렬' },
          { type: 'content', label: '필터 BottomSheet (가격·사이즈·색상)' },
        ],
      },
    },
  ],
  4: [
    {
      name: '상품 상세',
      route: '/products/:id',
      layout: {
        regions: [
          { type: 'nav', label: '뒤로 · 공유 · 장바구니' },
          { type: 'content', label: '이미지 갤러리 3:4' },
          { type: 'content', label: '브랜드 · 상품명 · Price(정가/할인/세일%)' },
          { type: 'content', label: '배송/혜택 요약' },
          { type: 'footer', label: '위시 · 장바구니 · 구매하기(primary)' },
        ],
      },
    },
    {
      name: '옵션 선택',
      route: null,
      layout: {
        regions: [
          { type: 'content', label: 'BottomSheet: 컬러/사이즈/수량' },
          { type: 'footer', label: '확인 CTA' },
        ],
      },
    },
  ],
  5: [
    {
      name: '장바구니',
      route: '/cart',
      layout: {
        regions: [
          { type: 'nav', label: '장바구니' },
          { type: 'content', label: '전체선택 · 품절 분리' },
          { type: 'content', label: '라인아이템 (썸네일·옵션·수량·삭제)' },
          { type: 'footer', label: '예상 금액 + 주문하기' },
        ],
      },
    },
  ],
  6: [
    {
      name: '주문서',
      route: '/checkout',
      layout: {
        regions: [
          { type: 'nav', label: '주문/결제' },
          { type: 'content', label: '배송지' },
          { type: 'content', label: '주문 상품 요약' },
          { type: 'content', label: '쿠폰 · 포인트 · 결제수단' },
          { type: 'footer', label: '약관 동의 + 결제하기' },
        ],
      },
    },
    {
      name: '주문 완료',
      route: '/orders/:id/complete',
      layout: {
        regions: [
          { type: 'content', label: '완료 메시지 · 주문번호' },
          { type: 'footer', label: '주문내역 · 홈으로' },
        ],
      },
    },
  ],
  7: [
    {
      name: '위시리스트',
      route: '/wish',
      layout: {
        regions: [
          { type: 'nav', label: '좋아요' },
          { type: 'content', label: 'ProductCard 그리드 + 장바구니 담기' },
          { type: 'footer', label: 'TabBar (좋아요 활성)' },
        ],
      },
    },
  ],
  8: [
    {
      name: '마이페이지',
      route: '/my',
      layout: {
        regions: [
          { type: 'nav', label: '마이' },
          { type: 'content', label: '프로필 요약 · 등급' },
          { type: 'content', label: '주문 상태 숏컷 (입금/배송/완료)' },
          { type: 'content', label: '메뉴: 주문내역 · 쿠폰 · 설정' },
          { type: 'footer', label: 'TabBar' },
        ],
      },
    },
    {
      name: '주문내역',
      route: '/my/orders',
      layout: {
        regions: [
          { type: 'nav', label: '뒤로 · 주문내역' },
          { type: 'content', label: '상태 필터 Chip' },
          { type: 'content', label: '주문 카드 리스트' },
        ],
      },
    },
  ],
}

async function json(res) {
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(body)}`)
  return body
}

async function main() {
  const project = await json(
    await fetch(`${BASE}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rootPath: ROOT }),
    })
  )
  console.log(`project #${project.id} ${project.name}`)

  const existing = await json(await fetch(`${BASE}/api/projects/${project.id}/issues`))
  if (existing.length > 0) {
    console.log(`already has ${existing.length} issues — upserting wireframes only`)
    for (const issue of existing) {
      const screens = WIREFRAMES[issue.number]
      if (!screens) continue
      const prev = issue.status
      await json(
        await fetch(`${BASE}/api/issues/${issue.id}/wireframe`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ screens }),
        })
      )
      if (prev === 'dev_approved') {
        await json(await fetch(`${BASE}/api/issues/${issue.id}/approve`, { method: 'POST' }))
      }
      console.log(`  #${issue.number} wireframe ok (${screens.length})`)
    }
    console.log(`plan: /projects/${project.id}/plan?planId=${existing[0].planId}`)
    await seedDesignSystem(project.id)
    return
  }

  const plan = await json(
    await fetch(`${BASE}/api/projects/${project.id}/plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(PLAN),
    })
  )
  console.log(`plan #${plan.id} draft`)

  const approved = await json(await fetch(`${BASE}/api/plans/${plan.id}/approve`, { method: 'POST' }))
  console.log(`approved → ${approved.issues.length} issues`)

  for (const issue of approved.issues) {
    const screens = WIREFRAMES[issue.number]
    if (!screens) {
      console.warn(`  no wireframe for #${issue.number}`)
      continue
    }
    await json(
      await fetch(`${BASE}/api/issues/${issue.id}/wireframe`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ screens }),
      })
    )
    await json(await fetch(`${BASE}/api/issues/${issue.id}/approve`, { method: 'POST' }))
    console.log(`  #${issue.number} ${issue.title} · ${screens.length} screens · approved`)
  }

  await seedDesignSystem(project.id)

  console.log('\nOpen:')
  console.log(`  이슈   http://localhost:5173/projects/${project.id}/issues`)
  console.log(`  기획   http://localhost:5173/projects/${project.id}/plan?planId=${plan.id}`)
  console.log(`  DS탭  http://localhost:5173/projects/${project.id}/design-system`)
}

async function seedDesignSystem(projectId) {
  const fs = await import('node:fs/promises')
  const tokensPath = path.join(ROOT, 'design-system/tokens.json')
  const tokens = JSON.parse(await fs.readFile(tokensPath, 'utf8'))
  const components = [
    {
      name: 'Button',
      packageExport: '@musinsa/ui/button',
      description: 'primary 구매 CTA · secondary · ghost',
      issueNumbers: [4, 5, 6],
    },
    {
      name: 'Chip',
      packageExport: '@musinsa/ui/chip',
      description: '필터 · 세일 · 랭킹',
      issueNumbers: [1, 2, 3, 8],
    },
    {
      name: 'ProductCard',
      packageExport: '@musinsa/ui/product-card',
      description: '3:4 이미지 · 브랜드/가격/세일/위시',
      issueNumbers: [1, 2, 3, 7],
    },
    {
      name: 'TopNav',
      packageExport: '@musinsa/ui/top-nav',
      description: '뒤로/로고 · 타이틀 · 액션',
      issueNumbers: [1, 4, 5, 6, 8],
    },
    {
      name: 'TabBar',
      packageExport: '@musinsa/ui/tab-bar',
      description: '홈 · 카테고리 · 검색 · 좋아요 · 마이',
      issueNumbers: [1, 2, 3, 7, 8],
    },
    {
      name: 'BottomSheet',
      packageExport: '@musinsa/ui/bottom-sheet',
      description: '옵션/필터/배송 시트',
      issueNumbers: [3, 4],
    },
    {
      name: 'Price',
      packageExport: '@musinsa/ui/price',
      description: '정가 · 할인가 · 할인율',
      issueNumbers: [4, 5, 6],
    },
  ]

  await json(
    await fetch(`${BASE}/api/projects/${projectId}/design-system`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: tokens.meta?.name ?? 'Musinsa Store DS',
        version: tokens.meta?.version ?? '0.1.0',
        packageName: '@musinsa/ui',
        storybookPath: 'apps/docs',
        tokens,
        components,
      }),
    })
  )
  console.log('design-system upserted')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
