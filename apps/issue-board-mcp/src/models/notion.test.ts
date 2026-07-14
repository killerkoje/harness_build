// src/models/notion.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type Database from 'better-sqlite3'
import { createDb } from '../db.js'
import { getOrCreateProject } from './projects.js'
import { createPlan } from './plans.js'
import { createIssuesFromPlan, getIssue } from './issues.js'
import { pushIssueToNotion, pushEpicToNotion } from './notion.js'

const CONFIG = { apiKey: 'test-key', databaseId: 'test-db-id' }

describe('pushIssueToNotion', () => {
  let db: Database.Database
  let projectId: number
  let planId: number

  beforeEach(() => {
    db = createDb(':memory:')
    projectId = getOrCreateProject(db, '/tmp/notion-push').id
    planId = createPlan(db, projectId, 'p', {
      overview: 'o',
      targetUsers: 't',
      mvpFeatures: [],
      outOfScope: 'x',
    }).id
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('no-ops when Notion isn\'t configured', async () => {
    const [issue] = createIssuesFromPlan(db, projectId, planId, [
      { priority: '높음', title: '홈', description: '피드' },
    ])
    await pushIssueToNotion(db, issue, null, null)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('creates a page for an issue with no notionPageId, then stores the returned page id', async () => {
    ;(fetch as any).mockResolvedValue({ ok: true, json: async () => ({ id: 'page-123' }) })

    const [issue] = createIssuesFromPlan(db, projectId, planId, [
      { priority: '보통', title: '검색', description: '필터' },
    ])
    await pushIssueToNotion(db, issue, null, CONFIG)

    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, init] = (fetch as any).mock.calls[0]
    expect(url).toBe('https://api.notion.com/v1/pages')
    expect(init.method).toBe('POST')
    const body = JSON.parse(init.body)
    expect(body.parent).toEqual({ database_id: 'test-db-id' })
    expect(body.properties.이름.title[0].text.content).toBe('검색')
    expect(body.properties['우선 순위'].select.name).toBe('중간')
    expect(body.properties.상태.status.name).toBe('기획 중')
    expect(body.properties.선택.select.name).toBe('이슈(스토리)')
    expect(body.properties.구분.select.name).toBe('기타')
    expect(body.properties['상위 항목']).toBeUndefined()

    expect(getIssue(db, issue.id)?.notionPageId).toBe('page-123')
  })

  it('includes a 상위 항목 relation to the epic when an epicPageId is passed', async () => {
    ;(fetch as any).mockResolvedValue({ ok: true, json: async () => ({ id: 'page-456' }) })

    const [issue] = createIssuesFromPlan(db, projectId, planId, [
      { priority: '높음', title: '홈', description: '피드' },
    ])
    await pushIssueToNotion(db, issue, 'epic-page-id', CONFIG)

    const [, init] = (fetch as any).mock.calls[0]
    const body = JSON.parse(init.body)
    expect(body.properties['상위 항목']).toEqual({ relation: [{ id: 'epic-page-id' }] })
  })

  it('maps done status to 완료', async () => {
    ;(fetch as any).mockResolvedValue({ ok: true, json: async () => ({}) })

    const [issue] = createIssuesFromPlan(db, projectId, planId, [
      { priority: '높음', title: '결제', description: 'PG 연동' },
    ])
    await pushIssueToNotion(db, { ...issue, status: 'done' }, null, CONFIG)

    const [, init] = (fetch as any).mock.calls[0]
    const body = JSON.parse(init.body)
    expect(body.properties.상태.status.name).toBe('완료')
  })

  it('prefers a manually-set notionStatus over the status-derived mapping', async () => {
    ;(fetch as any).mockResolvedValue({ ok: true, json: async () => ({}) })

    const [issue] = createIssuesFromPlan(db, projectId, planId, [
      { priority: '높음', title: '결제', description: 'PG 연동' },
    ])
    await pushIssueToNotion(db, { ...issue, status: 'dev_approved', notionStatus: '보류' }, null, CONFIG)

    const [, init] = (fetch as any).mock.calls[0]
    const body = JSON.parse(init.body)
    expect(body.properties.상태.status.name).toBe('보류')
  })

  it('patches the existing page when the issue already has a notionPageId', async () => {
    ;(fetch as any).mockResolvedValue({ ok: true, json: async () => ({}) })

    const [issue] = createIssuesFromPlan(db, projectId, planId, [
      { priority: '낮음', title: '마이', description: '프로필' },
    ])
    const withPageId = { ...issue, notionPageId: 'existing-page' }
    await pushIssueToNotion(db, withPageId, null, CONFIG)

    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, init] = (fetch as any).mock.calls[0]
    expect(url).toBe('https://api.notion.com/v1/pages/existing-page')
    expect(init.method).toBe('PATCH')
  })
})

describe('pushEpicToNotion', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('no-ops when Notion isn\'t configured', async () => {
    const result = await pushEpicToNotion(null, '기획 제목', null)
    expect(result).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('creates an Epic page and returns the new page id', async () => {
    ;(fetch as any).mockResolvedValue({ ok: true, json: async () => ({ id: 'epic-1' }) })

    const result = await pushEpicToNotion(null, 'FoodNow 기획', CONFIG)

    expect(result).toBe('epic-1')
    const [url, init] = (fetch as any).mock.calls[0]
    expect(url).toBe('https://api.notion.com/v1/pages')
    expect(init.method).toBe('POST')
    const body = JSON.parse(init.body)
    expect(body.properties.이름.title[0].text.content).toBe('FoodNow 기획')
    expect(body.properties.선택.select.name).toBe('에픽')
    expect(body.properties.구분.select.name).toBe('기타')
  })

  it('patches the existing Epic page and returns the same id', async () => {
    ;(fetch as any).mockResolvedValue({ ok: true, json: async () => ({}) })

    const result = await pushEpicToNotion('epic-1', 'FoodNow 기획 (수정)', CONFIG)

    expect(result).toBe('epic-1')
    const [url, init] = (fetch as any).mock.calls[0]
    expect(url).toBe('https://api.notion.com/v1/pages/epic-1')
    expect(init.method).toBe('PATCH')
  })
})
