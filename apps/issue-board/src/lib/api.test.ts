// src/lib/api.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  fetchIssues,
  approveIssue,
  fetchProjects,
  deleteProject,
  fetchPlans,
  fetchSubtasks,
  createSubtask,
  updateSubtask,
  deleteSubtask,
} from './api.js'

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

  it('fetchPlans calls GET /api/projects/:id/plans and returns parsed json', async () => {
    ;(fetch as any).mockResolvedValue({ ok: true, json: async () => [{ id: 1, title: 'p1' }] })
    const plans = await fetchPlans(42)
    expect(fetch).toHaveBeenCalledWith('http://localhost:4000/api/projects/42/plans')
    expect(plans).toEqual([{ id: 1, title: 'p1' }])
  })

  it('fetchSubtasks calls GET /api/issues/:id/subtasks and returns parsed json', async () => {
    ;(fetch as any).mockResolvedValue({ ok: true, json: async () => [{ id: 1, title: 't', done: false }] })
    const subtasks = await fetchSubtasks(7)
    expect(fetch).toHaveBeenCalledWith('http://localhost:4000/api/issues/7/subtasks')
    expect(subtasks).toEqual([{ id: 1, title: 't', done: false }])
  })

  it('createSubtask calls POST /api/issues/:id/subtasks with the title', async () => {
    ;(fetch as any).mockResolvedValue({ ok: true, json: async () => ({ id: 1, title: '새 태스크', done: false }) })
    const subtask = await createSubtask(7, '새 태스크')
    expect(fetch).toHaveBeenCalledWith('http://localhost:4000/api/issues/7/subtasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '새 태스크' }),
    })
    expect(subtask.title).toBe('새 태스크')
  })

  it('updateSubtask calls PUT /api/subtasks/:id with partial fields', async () => {
    ;(fetch as any).mockResolvedValue({ ok: true, json: async () => ({ id: 1, title: 't', done: true }) })
    const updated = await updateSubtask(1, { done: true })
    expect(fetch).toHaveBeenCalledWith('http://localhost:4000/api/subtasks/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: true }),
    })
    expect(updated.done).toBe(true)
  })

  it('updateSubtask forwards the notes field', async () => {
    ;(fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ id: 1, title: 't', done: false, notes: '메모' }),
    })
    const updated = await updateSubtask(1, { notes: '메모' })
    expect(fetch).toHaveBeenCalledWith('http://localhost:4000/api/subtasks/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: '메모' }),
    })
    expect(updated.notes).toBe('메모')
  })

  it('deleteSubtask calls DELETE /api/subtasks/:id', async () => {
    ;(fetch as any).mockResolvedValue({ ok: true })
    await deleteSubtask(1)
    expect(fetch).toHaveBeenCalledWith('http://localhost:4000/api/subtasks/1', { method: 'DELETE' })
  })
})
