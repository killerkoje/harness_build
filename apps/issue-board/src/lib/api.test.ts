// src/lib/api.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchIssues, approveIssue, fetchProjects, deleteProject } from './api.js'

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

  it('fetchProjects calls GET /api/projects and returns parsed json', async () => {
    ;(fetch as any).mockResolvedValue({ ok: true, json: async () => [{ id: 1, name: 'a' }] })
    const projects = await fetchProjects()
    expect(fetch).toHaveBeenCalledWith('http://localhost:4000/api/projects')
    expect(projects).toEqual([{ id: 1, name: 'a' }])
  })

  it('deleteProject calls DELETE /api/projects/:id', async () => {
    ;(fetch as any).mockResolvedValue({ ok: true })
    await deleteProject(5)
    expect(fetch).toHaveBeenCalledWith('http://localhost:4000/api/projects/5', { method: 'DELETE' })
  })

  it('deleteProject throws when the request fails', async () => {
    ;(fetch as any).mockResolvedValue({ ok: false, status: 404 })
    await expect(deleteProject(999)).rejects.toThrow('request failed: 404')
  })
})
