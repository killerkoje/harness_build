// src/handoff.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import yaml from 'js-yaml'
import { seedIssueYaml } from './handoff.js'
import type { Issue } from './types.js'

describe('seedIssueYaml', () => {
  let tmpDir: string
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'issue-board-'))
  })
  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('writes .harness/issues/{number}.yaml with runs: [] and status: active', () => {
    const issue: Issue = {
      id: 1,
      projectId: 1,
      number: 7,
      planId: 1,
      title: '로그인',
      priority: '높음',
      description: '이메일 로그인',
      status: 'dev_approved',
      notionPageId: null,
      notionStatus: null,
      createdAt: '2026-07-13T00:00:00.000Z',
      updatedAt: '2026-07-13T00:00:00.000Z',
    }

    seedIssueYaml(tmpDir, issue)

    const written = fs.readFileSync(path.join(tmpDir, '.harness/issues/7.yaml'), 'utf-8')
    const parsed = yaml.load(written) as any
    expect(parsed.id).toBe(7)
    expect(parsed.title).toBe('로그인')
    expect(parsed.status).toBe('active')
    expect(parsed.runs).toEqual([])
    expect(parsed.files).toEqual([])
  })

  it('is idempotent — calling twice does not throw and keeps id stable', () => {
    const issue: Issue = {
      id: 1,
      projectId: 1,
      number: 3,
      planId: 1,
      title: 't',
      priority: '보통',
      description: 'd',
      status: 'dev_approved',
      notionPageId: null,
      notionStatus: null,
      createdAt: '2026-07-13T00:00:00.000Z',
      updatedAt: '2026-07-13T00:00:00.000Z',
    }
    seedIssueYaml(tmpDir, issue)
    expect(() => seedIssueYaml(tmpDir, issue)).not.toThrow()
    const parsed = yaml.load(
      fs.readFileSync(path.join(tmpDir, '.harness/issues/3.yaml'), 'utf-8')
    ) as any
    expect(parsed.id).toBe(3)
  })
})
