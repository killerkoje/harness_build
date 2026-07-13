#!/usr/bin/env node
/**
 * projectId=2 (harness_build) 목데이터 시드.
 * 기존 이슈(#1 기획 탭, #2 이슈 탭, #3 와이어프레임 탭) 기준으로
 * 기획(plan) 보강 + 와이어프레임 upsert.
 *
 * Usage: node scripts/seed-project2-mock.mjs
 * Env: ISSUE_BOARD_API_URL (default http://localhost:4000)
 */

const BASE = process.env.ISSUE_BOARD_API_URL ?? 'http://localhost:4000'
const PROJECT_ID = 2

const PLAN = {
  title: 'issue-board 대시보드',
  sections: {
    overview:
      '기획/이슈/와이어프레임을 한 곳에서 확인하고, 검토 후 CLI에서 개발을 승인하는 대시보드.',
    targetUsers: '1인 개발자 및 소규모 팀',
    mvpFeatures: [
      {
        priority: '높음',
        title: '기획 탭',
        description: 'PRD 섹션(개요/타깃/MVP기능/범위밖)을 구조화된 형태로 확인',
      },
      {
        priority: '높음',
        title: '이슈 탭',
        description: '기획의 MVP 기능표에서 자동 생성된 이슈 목록과 상태 확인',
      },
      {
        priority: '보통',
        title: '와이어프레임 탭',
        description: '화면 레이아웃을 박스형으로 미리보고 개발 승인',
      },
    ],
    outOfScope: '팀 코드 패턴 탭은 개발 시점에 별도 추가 예정.',
  },
}

const WIREFRAMES = {
  1: [
    {
      name: '기획 탭',
      route: '/projects/:id/plan',
      layout: {
        regions: [
          { type: 'nav', label: '상단 탭 (기획 · 이슈 · 와이어프레임)' },
          { type: 'sidebar', label: '프로젝트 사이드바' },
          { type: 'content', label: 'PRD 개요 / 타깃 사용자' },
          { type: 'content', label: 'MVP 기능표 (우선순위 · 제목 · 설명)' },
          { type: 'content', label: '범위 밖' },
          { type: 'footer', label: '승인 / 스냅샷 메타' },
        ],
      },
    },
  ],
  2: [
    {
      name: '이슈 목록',
      route: '/projects/:id/issues',
      layout: {
        regions: [
          { type: 'nav', label: '상단 탭 (기획 · 이슈 · 와이어프레임)' },
          { type: 'sidebar', label: '프로젝트 사이드바' },
          { type: 'content', label: '이슈 카드 리스트 (#번호 · 제목 · 상태 뱃지 · 설명)' },
          { type: 'content', label: '와이어프레임 보기 링크' },
        ],
      },
    },
    {
      name: '이슈 상태 뱃지',
      route: null,
      layout: {
        regions: [
          { type: 'content', label: 'planned → wireframed → dev_approved 상태칩' },
        ],
      },
    },
  ],
  3: [
    {
      name: '와이어프레임 보드',
      route: '/projects/:id/wireframe?issueId=:issueId',
      layout: {
        regions: [
          { type: 'nav', label: '상단 탭 + 이슈 제목' },
          { type: 'sidebar', label: '프로젝트 사이드바' },
          { type: 'content', label: '화면 카드 (route · 박스형 regions)' },
          { type: 'content', label: '개발 승인 버튼 / 승인됨 뱃지' },
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
  const issues = await json(await fetch(`${BASE}/api/projects/${PROJECT_ID}/issues`))
  console.log(`issues: ${issues.map((i) => `#${i.number} ${i.title}`).join(', ')}`)

  // plan: 이미 planId가 있으면 유지, 없으면 생성(승인하면 이슈 중복 생기므로 생성만)
  const planId = issues[0]?.planId
  if (planId) {
    const plan = await json(await fetch(`${BASE}/api/plans/${planId}`))
    console.log(`plan #${plan.id} already exists (${plan.status}): ${plan.title}`)
  } else {
    const plan = await json(
      await fetch(`${BASE}/api/projects/${PROJECT_ID}/plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(PLAN),
      })
    )
    console.log(`created draft plan #${plan.id} (approve separately to avoid duplicate issues)`)
  }

  for (const issue of issues) {
    const screens = WIREFRAMES[issue.number]
    if (!screens) {
      console.warn(`no wireframe mock for #${issue.number}`)
      continue
    }
    const prevStatus = issue.status
    await json(
      await fetch(`${BASE}/api/issues/${issue.id}/wireframe`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ screens }),
      })
    )
    // PUT은 status를 wireframed로 바꿈 — 기존 승인 상태 복구
    if (prevStatus === 'dev_approved') {
      await json(await fetch(`${BASE}/api/issues/${issue.id}/approve`, { method: 'POST' }))
    }
    console.log(`wireframe upserted for #${issue.number} (${screens.length} screens)`)
  }

  console.log('done')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
