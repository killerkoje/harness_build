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
      { name: '로그인', route: '/login', layout: { regions: [{ type: 'content', label: '폼' }] } },
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
})
