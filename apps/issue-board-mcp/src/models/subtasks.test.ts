// src/models/subtasks.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import type Database from 'better-sqlite3'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createDb } from '../db.js'
import { getOrCreateProject } from './projects.js'
import { createPlan } from './plans.js'
import { createIssuesFromPlan, getIssue, approveIssueForDev } from './issues.js'
import {
  listSubtasksByIssue,
  createSubtask,
  createSubtasksBulk,
  getSubtask,
  updateSubtask,
  deleteSubtask,
  maybeAutoCompleteIssue,
} from './subtasks.js'
import type { PlanSections } from '../types.js'

const sections: PlanSections = {
  overview: 'o',
  targetUsers: 't',
  mvpFeatures: [{ priority: '높음', title: '로그인', description: 'd' }],
  outOfScope: 'x',
}

describe('subtasks model', () => {
  let db: Database.Database
  let issueId: number
  beforeEach(() => {
    db = createDb(':memory:')
    const projectId = getOrCreateProject(db, '/tmp/p').id
    const planId = createPlan(db, projectId, 'p', sections).id
    issueId = createIssuesFromPlan(db, projectId, planId, sections.mvpFeatures)[0].id
  })

  it('returns an empty array when the issue has no subtasks yet', () => {
    expect(listSubtasksByIssue(db, issueId)).toEqual([])
  })

  it('createSubtask creates a subtask that starts undone', () => {
    const subtask = createSubtask(db, issueId, 'API 라우터 추가')
    expect(subtask.title).toBe('API 라우터 추가')
    expect(subtask.done).toBe(false)
    expect(subtask.issueId).toBe(issueId)
  })

  it('createSubtask starts with empty notes', () => {
    const subtask = createSubtask(db, issueId, '제목')
    expect(subtask.notes).toBe('')
  })

  it('createSubtasksBulk creates multiple subtasks in order', () => {
    const created = createSubtasksBulk(db, issueId, ['하나', '둘', '셋'])
    expect(created.map((s) => s.title)).toEqual(['하나', '둘', '셋'])
    expect(listSubtasksByIssue(db, issueId).map((s) => s.title)).toEqual(['하나', '둘', '셋'])
  })

  it('updateSubtask toggles done and updates title independently', () => {
    const subtask = createSubtask(db, issueId, '원래 제목')
    const toggled = updateSubtask(db, subtask.id, { done: true })
    expect(toggled?.done).toBe(true)
    expect(toggled?.title).toBe('원래 제목')

    const renamed = updateSubtask(db, subtask.id, { title: '새 제목' })
    expect(renamed?.title).toBe('새 제목')
    expect(renamed?.done).toBe(true)
  })

  it('updateSubtask updates notes independently of title and done', () => {
    const subtask = createSubtask(db, issueId, '제목')
    const withNotes = updateSubtask(db, subtask.id, { notes: '완료: API 라우터 작성함' })
    expect(withNotes?.notes).toBe('완료: API 라우터 작성함')
    expect(withNotes?.title).toBe('제목')
    expect(withNotes?.done).toBe(false)

    const toggled = updateSubtask(db, subtask.id, { done: true })
    expect(toggled?.notes).toBe('완료: API 라우터 작성함')
  })

  it('updateSubtask returns null for a nonexistent id', () => {
    expect(updateSubtask(db, 999999, { done: true })).toBeNull()
  })

  it('deleteSubtask removes the row and returns true, then false if already gone', () => {
    const subtask = createSubtask(db, issueId, '삭제될 것')
    expect(deleteSubtask(db, subtask.id)).toBe(true)
    expect(getSubtask(db, subtask.id)).toBeNull()
    expect(deleteSubtask(db, subtask.id)).toBe(false)
  })

  describe('maybeAutoCompleteIssue', () => {
    // completeIssue requires the issue to have already gone through
    // approve_issue (status 'dev_approved'), which seeds .harness/issues/*.yaml
    // on disk — so this issue needs a real, writable project root.
    let approvedIssueId: number

    beforeEach(async () => {
      const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'issue-board-subtasks-'))
      const approvedProjectId = getOrCreateProject(db, projectRoot).id
      const approvedPlanId = createPlan(db, approvedProjectId, 'p', sections).id
      const [approvedIssue] = createIssuesFromPlan(
        db,
        approvedProjectId,
        approvedPlanId,
        sections.mvpFeatures
      )
      approvedIssueId = approvedIssue.id
      await approveIssueForDev(db, approvedIssueId)
    })

    it('sets the issue status to done when every subtask is done', async () => {
      const a = createSubtask(db, approvedIssueId, '하나')
      const b = createSubtask(db, approvedIssueId, '둘')
      updateSubtask(db, a.id, { done: true })
      updateSubtask(db, b.id, { done: true })

      await maybeAutoCompleteIssue(db, approvedIssueId)

      expect(getIssue(db, approvedIssueId)?.status).toBe('done')
    })

    it('does nothing while some subtasks are still open', async () => {
      const a = createSubtask(db, approvedIssueId, '하나')
      createSubtask(db, approvedIssueId, '둘')
      updateSubtask(db, a.id, { done: true })

      await maybeAutoCompleteIssue(db, approvedIssueId)

      expect(getIssue(db, approvedIssueId)?.status).toBe('dev_approved')
    })

    it('does nothing when the issue has no subtasks at all', async () => {
      await maybeAutoCompleteIssue(db, approvedIssueId)
      expect(getIssue(db, approvedIssueId)?.status).toBe('dev_approved')
    })

    it('is a no-op when the issue is already done', async () => {
      const a = createSubtask(db, approvedIssueId, '하나')
      updateSubtask(db, a.id, { done: true })
      await maybeAutoCompleteIssue(db, approvedIssueId)
      expect(getIssue(db, approvedIssueId)?.status).toBe('done')

      // Re-running after it's already done must not throw or change anything.
      await maybeAutoCompleteIssue(db, approvedIssueId)
      expect(getIssue(db, approvedIssueId)?.status).toBe('done')
    })

    it('does not auto-complete an issue that has not been approved for dev yet', async () => {
      const a = createSubtask(db, issueId, '하나')
      updateSubtask(db, a.id, { done: true })

      await maybeAutoCompleteIssue(db, issueId)

      expect(getIssue(db, issueId)?.status).toBe('planned')
    })
  })
})
