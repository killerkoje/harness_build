import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  fetchIssues,
  approveIssue,
  fetchProjects,
  deleteProject,
  fetchPlans,
  fetchSubtasks,
  updatePlanStatus,
  createSubtask,
  updateSubtask,
  deleteSubtask,
} from './api.js'

const URL = 'https://example.supabase.co'

describe('api client', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', URL)
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon')
    vi.stubGlobal('fetch', vi.fn())
  })

  it('fetchIssues calls supabase issues + subtasks', async () => {
    ;(fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 1, project_id: 42, number: 1, plan_id: null, title: 'a', priority: '보통', description: '', status: 'planned', notion_page_id: null, notion_status: null, created_at: '', updated_at: '' }],
      })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
    const issues = await fetchIssues(42)
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      `${URL}/rest/v1/issues?select=*&project_id=eq.42&order=number`,
      expect.any(Object)
    )
    expect(issues[0]?.id).toBe(1)
  })

  it('approveIssue patches issue status', async () => {
    ;(fetch as any).mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 7,
          project_id: 1,
          number: 1,
          plan_id: null,
          title: 'a',
          priority: '보통',
          description: '',
          status: 'dev_approved',
          notion_page_id: null,
          notion_status: null,
          created_at: '',
          updated_at: '',
        },
      ],
    })
    const issue = await approveIssue(7)
    expect(fetch).toHaveBeenCalledWith(
      `${URL}/rest/v1/issues?id=eq.7`,
      expect.objectContaining({ method: 'PATCH' })
    )
    expect(issue.status).toBe('dev_approved')
  })

  it('fetchProjects calls supabase projects', async () => {
    ;(fetch as any).mockResolvedValue({
      ok: true,
      json: async () => [{ id: 1, root_path: '/a', name: 'a', description: '', dev_url: null }],
    })
    const projects = await fetchProjects()
    expect(fetch).toHaveBeenCalledWith(`${URL}/rest/v1/projects?select=*&order=id`, expect.any(Object))
    expect(projects).toEqual([{ id: 1, rootPath: '/a', name: 'a', description: '', devUrl: null }])
  })

  it('deleteProject deletes via supabase', async () => {
    ;(fetch as any).mockResolvedValue({ ok: true })
    await deleteProject(5)
    expect(fetch).toHaveBeenCalledWith(
      `${URL}/rest/v1/projects?id=eq.5`,
      expect.objectContaining({ method: 'DELETE' })
    )
  })

  it('deleteProject throws when the request fails', async () => {
    ;(fetch as any).mockResolvedValue({ ok: false, status: 404 })
    await expect(deleteProject(999)).rejects.toThrow('request failed: 404')
  })

  it('updatePlanStatus patches plan status', async () => {
    ;(fetch as any).mockResolvedValue({
      ok: true,
      json: async () => [
        { id: 1, project_id: 42, title: 'p1', status: 'approved', sections: { overview: '', targetUsers: '', mvpFeatures: [], outOfScope: '' } },
      ],
    })
    const plan = await updatePlanStatus(1, 'approved')
    expect(fetch).toHaveBeenCalledWith(
      `${URL}/rest/v1/plans?id=eq.1`,
      expect.objectContaining({ method: 'PATCH' })
    )
    expect(plan.status).toBe('approved')
  })

  it('fetchPlans calls supabase plans', async () => {
    ;(fetch as any).mockResolvedValue({
      ok: true,
      json: async () => [
        { id: 1, project_id: 42, title: 'p1', status: 'draft', sections: { overview: '', targetUsers: '', mvpFeatures: [], outOfScope: '' } },
      ],
    })
    const plans = await fetchPlans(42)
    expect(fetch).toHaveBeenCalledWith(
      `${URL}/rest/v1/plans?select=*&project_id=eq.42&order=id`,
      expect.any(Object)
    )
    expect(plans[0]?.title).toBe('p1')
  })

  it('fetchSubtasks calls supabase issue_subtasks', async () => {
    ;(fetch as any).mockResolvedValue({
      ok: true,
      json: async () => [{ id: 1, issue_id: 7, title: 't', done: false, notes: '' }],
    })
    const subtasks = await fetchSubtasks(7)
    expect(fetch).toHaveBeenCalledWith(
      `${URL}/rest/v1/issue_subtasks?select=*&issue_id=eq.7&order=id`,
      expect.any(Object)
    )
    expect(subtasks).toEqual([{ id: 1, issueId: 7, title: 't', done: false, notes: '' }])
  })

  it('createSubtask posts to supabase', async () => {
    ;(fetch as any).mockResolvedValue({
      ok: true,
      json: async () => [{ id: 1, issue_id: 7, title: '새 태스크', done: false, notes: '' }],
    })
    const subtask = await createSubtask(7, '새 태스크')
    expect(fetch).toHaveBeenCalledWith(
      `${URL}/rest/v1/issue_subtasks`,
      expect.objectContaining({ method: 'POST' })
    )
    expect(subtask.title).toBe('새 태스크')
  })

  it('updateSubtask patches supabase', async () => {
    ;(fetch as any).mockResolvedValue({
      ok: true,
      json: async () => [{ id: 1, issue_id: 7, title: 't', done: true, notes: '' }],
    })
    const updated = await updateSubtask(1, { done: true })
    expect(fetch).toHaveBeenCalledWith(
      `${URL}/rest/v1/issue_subtasks?id=eq.1`,
      expect.objectContaining({ method: 'PATCH' })
    )
    expect(updated.done).toBe(true)
  })

  it('updateSubtask forwards the notes field', async () => {
    ;(fetch as any).mockResolvedValue({
      ok: true,
      json: async () => [{ id: 1, issue_id: 7, title: 't', done: false, notes: '메모' }],
    })
    const updated = await updateSubtask(1, { notes: '메모' })
    expect(updated.notes).toBe('메모')
  })

  it('deleteSubtask deletes via supabase', async () => {
    ;(fetch as any).mockResolvedValue({ ok: true })
    await deleteSubtask(1)
    expect(fetch).toHaveBeenCalledWith(
      `${URL}/rest/v1/issue_subtasks?id=eq.1`,
      expect.objectContaining({ method: 'DELETE' })
    )
  })
})
