// src/rest/app.ts
import express from 'express'
import cors from 'cors'
import type Database from 'better-sqlite3'
import { getOrCreateProject, getProject } from '../models/projects.js'
import { createPlan, getPlan, approvePlanAndCreateIssues } from '../models/plans.js'
import { listIssuesByProject, getIssue, setIssueStatus } from '../models/issues.js'
import { upsertWireframe, getWireframeByIssue } from '../models/wireframes.js'
import { seedIssueYaml } from '../handoff.js'

export function createApp(db: Database.Database) {
  const app = express()
  // This server is an explicitly local, single-user tool (see design doc) with
  // no auth anywhere — permissive CORS lets the dashboard (a different origin/port)
  // call the REST API directly from the browser.
  app.use(cors())
  app.use(express.json())

  app.post('/api/projects', (req, res) => {
    const project = getOrCreateProject(db, req.body.rootPath)
    res.json(project)
  })

  app.get('/api/projects/:id', (req, res) => {
    const project = getProject(db, Number(req.params.id))
    if (!project) return res.status(404).json({ error: 'not found' })
    res.json(project)
  })

  app.post('/api/projects/:projectId/plans', (req, res) => {
    const plan = createPlan(db, Number(req.params.projectId), req.body.title, req.body.sections)
    res.json(plan)
  })

  app.get('/api/plans/:id', (req, res) => {
    const plan = getPlan(db, Number(req.params.id))
    if (!plan) return res.status(404).json({ error: 'not found' })
    res.json(plan)
  })

  app.post('/api/plans/:id/approve', (req, res) => {
    const planId = Number(req.params.id)
    const plan = getPlan(db, planId)
    if (!plan) return res.status(404).json({ error: 'not found' })

    const result = approvePlanAndCreateIssues(db, planId)
    res.json(result)
  })

  app.get('/api/projects/:projectId/issues', (req, res) => {
    res.json(listIssuesByProject(db, Number(req.params.projectId)))
  })

  app.get('/api/issues/:id', (req, res) => {
    const issue = getIssue(db, Number(req.params.id))
    if (!issue) return res.status(404).json({ error: 'not found' })
    res.json(issue)
  })

  app.put('/api/issues/:id/wireframe', (req, res) => {
    const issueId = Number(req.params.id)
    const issue = getIssue(db, issueId)
    if (!issue) return res.status(404).json({ error: 'not found' })

    const wireframe = upsertWireframe(db, issueId, req.body.screens)
    setIssueStatus(db, issueId, 'wireframed')
    res.json(wireframe)
  })

  app.get('/api/issues/:id/wireframe', (req, res) => {
    const wireframe = getWireframeByIssue(db, Number(req.params.id))
    if (!wireframe) return res.status(404).json({ error: 'not found' })
    res.json(wireframe)
  })

  app.post('/api/issues/:id/approve', (req, res) => {
    const issueId = Number(req.params.id)
    const issue = getIssue(db, issueId)
    if (!issue) return res.status(404).json({ error: 'not found' })

    setIssueStatus(db, issueId, 'dev_approved')
    const updated = getIssue(db, issueId)!
    const project = getProject(db, updated.projectId)!
    seedIssueYaml(project.rootPath, updated)
    res.json(updated)
  })

  // Safety net: any error thrown/forwarded from a route handler above lands
  // here instead of Node's default HTML+stacktrace error page.
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err)
    res.status(500).json({ error: 'internal error' })
  })

  return app
}
