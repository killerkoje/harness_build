// src/models/parse-plan-markdown.test.ts
import { describe, it, expect } from 'vitest'
import { parsePlanMarkdown } from './parse-plan-markdown.js'

const SAMPLE = `# 무신사 스토어

## 1. 개요 / 목적
> 🎯 **목적** — 패션 커머스 MVP
배경 문단입니다.

## 2. 타깃 사용자 & 유스케이스
| 페르소나 | 니즈 | 핵심 유스케이스 |
| --- | --- | --- |
| 20대 | 빠른 탐색 | 홈→상세→구매 |

## 3. 핵심 기능 (MVP)
| 우선순위 | 기능 | 설명 |
| --- | --- | --- |
| 높음 | 홈 피드 | 배너와 그리드 |
| 보통 | 위시리스트 | 좋아요 목록 |

## 4. 범위 밖 (Out of Scope)
> ⚠️ **범위 밖** — 라이브 커머스

## 5. 비기능 요구사항
| 항목 | 요구사항/기준 |
| --- | --- |
| 성능 | LCP 2.5s |

## 6. 성공 지표
| 지표 | 목표값 | 측정 방법 |
| --- | --- | --- |
| 전환율 | 3% | 분석 |

## 7. 테스트 시나리오
| # | 시나리오 | 절차 (핵심 흐름) | 기대 결과 |
| --- | --- | --- | --- |
| 1 | 구매 | 홈 → 상세 → 결제 | 주문 완료 |

## 8. 핵심 가정 / 미결 질문
> 📝 **가정/미결** — 결제 PG 미정
`

describe('parsePlanMarkdown', () => {
  it('extracts mvp rows and keeps full markdown', () => {
    const sections = parsePlanMarkdown(SAMPLE)
    expect(sections.mvpFeatures).toEqual([
      { priority: '높음', title: '홈 피드', description: '배너와 그리드' },
      { priority: '보통', title: '위시리스트', description: '좋아요 목록' },
    ])
    expect(sections.markdown).toContain('## 7. 테스트 시나리오')
    expect(sections.overview).toContain('목적')
    expect(sections.outOfScope).toContain('라이브')
  })

  it('stops a section at the next heading even without a space after ##', () => {
    const noSpaceHeading = `## 3. 핵심 기능 (MVP)
| 우선순위 | 기능 | 설명 |
| --- | --- | --- |
| 높음 | 홈 피드 | 배너 |
##4. 범위 밖 (Out of Scope)
| 낮음 | 범위밖기능 | 이건 섞이면 안 됨 |
`
    const sections = parsePlanMarkdown(noSpaceHeading)
    expect(sections.mvpFeatures).toEqual([
      { priority: '높음', title: '홈 피드', description: '배너' },
    ])
  })
})
