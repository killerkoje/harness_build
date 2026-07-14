// src/rest/app.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import type Database from 'better-sqlite3'
import request from 'supertest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createDb } from '../db.js'
import { createApp } from './app.js'

describe('REST API', () => {
  let db: Database.Database
  let app: ReturnType<typeof createApp>
  let projectRoot: string

  beforeEach(() => {
    db = createDb(':memory:')
    projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'issue-board-rest-'))
    app = createApp(db)
  })

  it('POST /api/projects creates or reuses a project', async () => {
    const res = await request(app).post('/api/projects').send({ rootPath: projectRoot })
    expect(res.status).toBe(200)
    expect(res.body.name).toBe(path.basename(projectRoot))
  })

  it('GET /api/projects/:id returns the project', async () => {
    const project = (await request(app).post('/api/projects').send({ rootPath: projectRoot })).body
    const res = await request(app).get(`/api/projects/${project.id}`)
    expect(res.status).toBe(200)
    expect(res.body.id).toBe(project.id)
  })

  it('CORS: responds to a cross-origin GET with Access-Control-Allow-Origin', async () => {
    const project = (await request(app).post('/api/projects').send({ rootPath: projectRoot })).body
    const res = await request(app)
      .get(`/api/projects/${project.id}`)
      .set('Origin', 'http://localhost:5173')
    expect(res.status).toBe(200)
    expect(res.headers['access-control-allow-origin']).toBe('*')
  })

  it('CORS: responds to an OPTIONS preflight with Access-Control-Allow-Origin', async () => {
    const res = await request(app)
      .options('/api/projects/1')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'GET')
    expect(res.headers['access-control-allow-origin']).toBe('*')
  })

  it('POST /api/plans/:id/approve returns 404 (not 500) for a nonexistent plan', async () => {
    const res = await request(app).post('/api/plans/999999/approve')
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'not found' })
  })

  it('PUT /api/issues/:id/wireframe returns 404 (not 500) for a nonexistent issue', async () => {
    const res = await request(app)
      .put('/api/issues/999999/wireframe')
      .send({ screens: [] })
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'not found' })
  })

  it('PUT /api/issues/:id/notion-status returns 404 for a nonexistent issue', async () => {
    const res = await request(app)
      .put('/api/issues/999999/notion-status')
      .send({ notionStatus: '보류' })
    expect(res.status).toBe(404)
  })

  it('PUT /api/issues/:id/notion-status rejects an option outside the Notion schema', async () => {
    const project = (await request(app).post('/api/projects').send({ rootPath: projectRoot })).body
    const plan = (
      await request(app)
        .post(`/api/projects/${project.id}/plans`)
        .send({
          title: 'p',
          sections: {
            overview: 'o',
            targetUsers: 't',
            mvpFeatures: [{ priority: '높음', title: '로그인', description: 'd' }],
            outOfScope: 'x',
          },
        })
    ).body
    await request(app).post(`/api/plans/${plan.id}/approve`)
    const issue = (await request(app).get(`/api/projects/${project.id}/issues`)).body[0]

    const res = await request(app)
      .put(`/api/issues/${issue.id}/notion-status`)
      .send({ notionStatus: '없는옵션' })
    expect(res.status).toBe(400)
  })

  it('PUT /api/issues/:id/notion-status sets and clears (null) the manual override', async () => {
    const project = (await request(app).post('/api/projects').send({ rootPath: projectRoot })).body
    const plan = (
      await request(app)
        .post(`/api/projects/${project.id}/plans`)
        .send({
          title: 'p',
          sections: {
            overview: 'o',
            targetUsers: 't',
            mvpFeatures: [{ priority: '높음', title: '로그인', description: 'd' }],
            outOfScope: 'x',
          },
        })
    ).body
    await request(app).post(`/api/plans/${plan.id}/approve`)
    const issue = (await request(app).get(`/api/projects/${project.id}/issues`)).body[0]

    const setRes = await request(app)
      .put(`/api/issues/${issue.id}/notion-status`)
      .send({ notionStatus: '보류' })
    expect(setRes.status).toBe(200)
    expect(setRes.body.notionStatus).toBe('보류')

    const clearRes = await request(app)
      .put(`/api/issues/${issue.id}/notion-status`)
      .send({ notionStatus: null })
    expect(clearRes.status).toBe(200)
    expect(clearRes.body.notionStatus).toBeNull()
  })

  it('full flow: create plan -> approve -> issues created -> wireframe -> approve issue seeds yaml', async () => {
    const project = (await request(app).post('/api/projects').send({ rootPath: projectRoot })).body

    const sections = {
      overview: 'o',
      targetUsers: 't',
      mvpFeatures: [{ priority: '높음', title: '로그인', description: 'd' }],
      outOfScope: 'x',
    }
    const plan = (
      await request(app).post(`/api/projects/${project.id}/plans`).send({ title: 'p', sections })
    ).body
    expect(plan.status).toBe('draft')

    const approveRes = await request(app).post(`/api/plans/${plan.id}/approve`)
    expect(approveRes.status).toBe(200)

    const issuesRes = await request(app).get(`/api/projects/${project.id}/issues`)
    expect(issuesRes.body).toHaveLength(1)
    const issue = issuesRes.body[0]
    expect(issue.number).toBe(1)
    expect(issue.status).toBe('planned')

    const screens = [
      { name: '로그인', route: '/login', html: '<div>폼</div>' },
    ]
    const wfRes = await request(app)
      .put(`/api/issues/${issue.id}/wireframe`)
      .send({ screens })
    expect(wfRes.status).toBe(200)
    expect(wfRes.body.screens).toHaveLength(1)

    const issueAfterWf = (await request(app).get(`/api/issues/${issue.id}`)).body
    expect(issueAfterWf.status).toBe('wireframed')

    const approveIssueRes = await request(app).post(`/api/issues/${issue.id}/approve`)
    expect(approveIssueRes.status).toBe(200)
    expect(approveIssueRes.body.status).toBe('dev_approved')

    const yamlPath = path.join(projectRoot, '.harness/issues/1.yaml')
    expect(fs.existsSync(yamlPath)).toBe(true)
  })

  it('PUT/GET design-system upserts and returns tokens + component issue links', async () => {
    const project = (await request(app).post('/api/projects').send({ rootPath: projectRoot })).body
    const body = {
      name: 'Musinsa Store DS',
      version: '0.1.0',
      packageName: '@musinsa/ui',
      storybookPath: 'apps/docs',
      tokens: { color: { brand: { primary: '#111111' } } },
      components: [
        {
          name: 'Button',
          packageExport: '@musinsa/ui/button',
          description: 'CTA',
          issueNumbers: [4],
        },
      ],
    }
    const put = await request(app).put(`/api/projects/${project.id}/design-system`).send(body)
    expect(put.status).toBe(200)
    expect(put.body.packageName).toBe('@musinsa/ui')

    const get = await request(app).get(`/api/projects/${project.id}/design-system`)
    expect(get.status).toBe(200)
    expect(get.body.components[0].issueNumbers).toEqual([4])
    expect(get.body.tokens.color.brand.primary).toBe('#111111')
  })
})
