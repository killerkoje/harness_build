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

  it('GET /api/projects lists every registered project', async () => {
    const p1 = (await request(app).post('/api/projects').send({ rootPath: projectRoot })).body
    const otherRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'issue-board-rest-'))
    const p2 = (await request(app).post('/api/projects').send({ rootPath: otherRoot })).body

    const res = await request(app).get('/api/projects')
    expect(res.status).toBe(200)
    expect(res.body.map((p: { id: number }) => p.id)).toEqual(expect.arrayContaining([p1.id, p2.id]))
  })

  it('DELETE /api/projects/:id removes the project', async () => {
    const project = (await request(app).post('/api/projects').send({ rootPath: projectRoot })).body

    const res = await request(app).delete(`/api/projects/${project.id}`)
    expect(res.status).toBe(204)

    const getRes = await request(app).get(`/api/projects/${project.id}`)
    expect(getRes.status).toBe(404)
  })

  it('DELETE /api/projects/:id returns 404 for a nonexistent project', async () => {
    const res = await request(app).delete('/api/projects/999999')
    expect(res.status).toBe(404)
  })

  it('PATCH /api/projects/:id/dev-url sets the dev server URL', async () => {
    const project = (await request(app).post('/api/projects').send({ rootPath: projectRoot })).body

    const res = await request(app)
      .patch(`/api/projects/${project.id}/dev-url`)
      .send({ devUrl: 'http://localhost:3000' })
    expect(res.status).toBe(200)
    expect(res.body.devUrl).toBe('http://localhost:3000')

    const getRes = await request(app).get(`/api/projects/${project.id}`)
    expect(getRes.body.devUrl).toBe('http://localhost:3000')
  })

  it('PATCH /api/projects/:id/dev-url returns 404 for a nonexistent project', async () => {
    const res = await request(app)
      .patch('/api/projects/999999/dev-url')
      .send({ devUrl: 'http://localhost:3000' })
    expect(res.status).toBe(404)
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

  it('PUT design-system without components defaults to an empty array', async () => {
    const project = (await request(app).post('/api/projects').send({ rootPath: projectRoot })).body
    const put = await request(app).put(`/api/projects/${project.id}/design-system`).send({
      name: 'Musinsa Store DS',
      version: '0.1.0',
      packageName: '@musinsa/ui',
      storybookPath: 'apps/docs',
      tokens: { color: { brand: { primary: '#111111' } } },
    })
    expect(put.status).toBe(200)
    expect(put.body.components).toEqual([])
  })

  it('PUT design-system with a non-array components field is rejected', async () => {
    const project = (await request(app).post('/api/projects').send({ rootPath: projectRoot })).body
    const put = await request(app).put(`/api/projects/${project.id}/design-system`).send({
      name: 'Musinsa Store DS',
      version: '0.1.0',
      packageName: '@musinsa/ui',
      storybookPath: 'apps/docs',
      tokens: {},
      components: 'not-an-array',
    })
    expect(put.status).toBe(400)
  })

  it('GET /api/projects/:projectId/plans lists all plans for a project in creation order', async () => {
    const project = (await request(app).post('/api/projects').send({ rootPath: projectRoot })).body
    const planBody = {
      sections: { overview: 'o', targetUsers: 't', mvpFeatures: [], outOfScope: 'x' },
    }
    const p1 = (
      await request(app).post(`/api/projects/${project.id}/plans`).send({ ...planBody, title: '1차' })
    ).body
    const p2 = (
      await request(app).post(`/api/projects/${project.id}/plans`).send({ ...planBody, title: '2차' })
    ).body

    const res = await request(app).get(`/api/projects/${project.id}/plans`)
    expect(res.status).toBe(200)
    expect(res.body.map((p: { id: number }) => p.id)).toEqual([p1.id, p2.id])
  })

  it('GET /api/projects/:projectId/plans returns an empty array for a project with no plans', async () => {
    const project = (await request(app).post('/api/projects').send({ rootPath: projectRoot })).body
    const res = await request(app).get(`/api/projects/${project.id}/plans`)
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('subtask CRUD: create, list, toggle done, rename, delete', async () => {
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

    const created = await request(app)
      .post(`/api/issues/${issue.id}/subtasks`)
      .send({ title: 'API 라우터 추가' })
    expect(created.status).toBe(200)
    expect(created.body.title).toBe('API 라우터 추가')
    expect(created.body.done).toBe(false)

    const listRes = await request(app).get(`/api/issues/${issue.id}/subtasks`)
    expect(listRes.status).toBe(200)
    expect(listRes.body).toHaveLength(1)

    const toggled = await request(app).put(`/api/subtasks/${created.body.id}`).send({ done: true })
    expect(toggled.status).toBe(200)
    expect(toggled.body.done).toBe(true)
    expect(toggled.body.title).toBe('API 라우터 추가')

    const renamed = await request(app)
      .put(`/api/subtasks/${created.body.id}`)
      .send({ title: '라우터 추가 (완료)' })
    expect(renamed.status).toBe(200)
    expect(renamed.body.title).toBe('라우터 추가 (완료)')
    expect(renamed.body.done).toBe(true)

    const del = await request(app).delete(`/api/subtasks/${created.body.id}`)
    expect(del.status).toBe(204)

    const afterDelete = await request(app).get(`/api/issues/${issue.id}/subtasks`)
    expect(afterDelete.body).toHaveLength(0)
  })

  it('GET /api/issues/:id/subtasks returns 404 for a nonexistent issue', async () => {
    const res = await request(app).get('/api/issues/999999/subtasks')
    expect(res.status).toBe(404)
  })

  it('POST /api/issues/:id/subtasks returns 400 without a title', async () => {
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

    const res = await request(app).post(`/api/issues/${issue.id}/subtasks`).send({})
    expect(res.status).toBe(400)
  })

  it('PUT /api/subtasks/:id returns 404 for a nonexistent subtask', async () => {
    const res = await request(app).put('/api/subtasks/999999').send({ done: true })
    expect(res.status).toBe(404)
  })

  it('PUT /api/subtasks/:id returns 400 for an empty title', async () => {
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
    const created = await request(app).post(`/api/issues/${issue.id}/subtasks`).send({ title: 't' })

    const res = await request(app).put(`/api/subtasks/${created.body.id}`).send({ title: '' })
    expect(res.status).toBe(400)
  })

  it('DELETE /api/subtasks/:id returns 404 for a nonexistent subtask', async () => {
    const res = await request(app).delete('/api/subtasks/999999')
    expect(res.status).toBe(404)
  })
})
