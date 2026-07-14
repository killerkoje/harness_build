// src/models/notion.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type Database from 'better-sqlite3'
import { createDb } from '../db.js'
import { getOrCreateProject } from './projects.js'
import { createPlan } from './plans.js'
import { createIssuesFromPlan, getIssue } from './issues.js'
import { pushIssueToNotion } from './notion.js'

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
    await pushIssueToNotion(db, issue, null)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('creates a page for an issue with no notionPageId, then stores the returned page id', async () => {
    ;(fetch as any).mockResolvedValue({ json: async () => ({ id: 'page-123' }) })

    const [issue] = createIssuesFromPlan(db, projectId, planId, [
      { priority: '보통', title: '검색', description: '필터' },
    ])
    await pushIssueToNotion(db, issue, CONFIG)

    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, init] = (fetch as any).mock.calls[0]
    expect(url).toBe('https://api.notion.com/v1/pages')
    expect(init.method).toBe('POST')
    const body = JSON.parse(init.body)
    expect(body.parent).toEqual({ database_id: 'test-db-id' })
    expect(body.properties.이름.title[0].text.content).toBe('검색')
    expect(body.properties.우선순위.select.name).toBe('중간')
    expect(body.properties.상태.status.name).toBe('기획 중')

    expect(getIssue(db, issue.id)?.notionPageId).toBe('page-123')
  })

  it('maps done status to 완료', async () => {
    ;(fetch as any).mockResolvedValue({ json: async () => ({}) })

    const [issue] = createIssuesFromPlan(db, projectId, planId, [
      { priority: '높음', title: '결제', description: 'PG 연동' },
    ])
    await pushIssueToNotion(db, { ...issue, status: 'done' }, CONFIG)

    const [, init] = (fetch as any).mock.calls[0]
    const body = JSON.parse(init.body)
    expect(body.properties.상태.status.name).toBe('완료')
  })

  it('prefers a manually-set notionStatus over the status-derived mapping', async () => {
    ;(fetch as any).mockResolvedValue({ json: async () => ({}) })

    const [issue] = createIssuesFromPlan(db, projectId, planId, [
      { priority: '높음', title: '결제', description: 'PG 연동' },
    ])
    await pushIssueToNotion(db, { ...issue, status: 'dev_approved', notionStatus: '보류' }, CONFIG)

    const [, init] = (fetch as any).mock.calls[0]
    const body = JSON.parse(init.body)
    expect(body.properties.상태.status.name).toBe('보류')
  })

  it('patches the existing page when the issue already has a notionPageId', async () => {
    ;(fetch as any).mockResolvedValue({ json: async () => ({}) })

    const [issue] = createIssuesFromPlan(db, projectId, planId, [
      { priority: '낮음', title: '마이', description: '프로필' },
    ])
    const withPageId = { ...issue, notionPageId: 'existing-page' }
    await pushIssueToNotion(db, withPageId, CONFIG)

    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, init] = (fetch as any).mock.calls[0]
    expect(url).toBe('https://api.notion.com/v1/pages/existing-page')
    expect(init.method).toBe('PATCH')
  })
})
