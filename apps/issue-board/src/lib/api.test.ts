// src/lib/api.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchIssues, approveIssue } from './api.js'

describe('api client', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('fetchIssues calls GET /api/projects/:id/issues and returns parsed json', async () => {
    ;(fetch as any).mockResolvedValue({ ok: true, json: async () => [{ id: 1, number: 1 }] })
    const issues = await fetchIssues(42)
    expect(fetch).toHaveBeenCalledWith('http://localhost:4000/api/projects/42/issues')
    expect(issues).toEqual([{ id: 1, number: 1 }])
  })

  it('approveIssue calls POST /api/issues/:id/approve', async () => {
    ;(fetch as any).mockResolvedValue({ ok: true, json: async () => ({ id: 7, status: 'dev_approved' }) })
    const issue = await approveIssue(7)
    expect(fetch).toHaveBeenCalledWith('http://localhost:4000/api/issues/7/approve', { method: 'POST' })
    expect(issue.status).toBe('dev_approved')
  })
})
