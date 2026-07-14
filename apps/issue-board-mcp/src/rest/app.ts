// src/rest/app.ts
import express from 'express'
import cors from 'cors'
import type Database from 'better-sqlite3'
import { getOrCreateProject, getProject } from '../models/projects.js'
import {
  createPlan,
  createPlanFromMarkdown,
  getPlan,
  getLatestPlanForProject,
  approvePlanAndCreateIssues,
  syncIssuesFromPlan,
} from '../models/plans.js'
import {
  listIssuesByProject,
  getIssue,
  setIssueStatus,
  approveIssueForDev,
  completeIssue,
  setIssueNotionStatus,
} from '../models/issues.js'
import { upsertWireframe, getWireframeByIssue } from '../models/wireframes.js'
import { getDesignSystemByProject, upsertDesignSystem } from '../models/design-systems.js'
import { pushIssueToNotion } from '../models/notion.js'
import { NOTION_STATUS_OPTIONS } from '../types.js'

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
    const projectId = Number(req.params.projectId)
    if (req.body.content) {
      return res.json(createPlanFromMarkdown(db, projectId, req.body.title, req.body.content))
    }
    const plan = createPlan(db, projectId, req.body.title, req.body.sections)
    res.json(plan)
  })

  app.get('/api/plans/:id', (req, res) => {
    const plan = getPlan(db, Number(req.params.id))
    if (!plan) return res.status(404).json({ error: 'not found' })
    res.json(plan)
  })

  app.get('/api/projects/:projectId/plans/latest', (req, res) => {
    const plan = getLatestPlanForProject(db, Number(req.params.projectId))
    if (!plan) return res.status(404).json({ error: 'not found' })
    res.json(plan)
  })

  app.post('/api/plans/:id/approve', async (req, res) => {
    const planId = Number(req.params.id)
    const plan = getPlan(db, planId)
    if (!plan) return res.status(404).json({ error: 'not found' })

    if (plan.status === 'approved') {
      const result = await syncIssuesFromPlan(db, planId)
      return res.json(result)
    }

    const result = await approvePlanAndCreateIssues(db, planId)
    res.json(result)
  })

  app.post('/api/plans/:id/sync-issues', async (req, res) => {
    const planId = Number(req.params.id)
    const plan = getPlan(db, planId)
    if (!plan) return res.status(404).json({ error: 'not found' })
    try {
      res.json(await syncIssuesFromPlan(db, planId))
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : String(e) })
    }
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

  app.post('/api/issues/:id/approve', async (req, res) => {
    const issueId = Number(req.params.id)
    const updated = await approveIssueForDev(db, issueId)
    if (!updated) return res.status(404).json({ error: 'not found' })
    res.json(updated)
  })

  app.post('/api/issues/:id/complete', async (req, res) => {
    const issueId = Number(req.params.id)
    const updated = await completeIssue(db, issueId)
    if (!updated) return res.status(404).json({ error: 'not found' })
    res.json(updated)
  })

  app.put('/api/issues/:id/notion-status', async (req, res) => {
    const issueId = Number(req.params.id)
    const issue = getIssue(db, issueId)
    if (!issue) return res.status(404).json({ error: 'not found' })

    const { notionStatus } = req.body ?? {}
    if (notionStatus !== null && !NOTION_STATUS_OPTIONS.includes(notionStatus)) {
      return res.status(400).json({ error: `notionStatus must be one of ${NOTION_STATUS_OPTIONS.join(', ')} or null` })
    }

    setIssueNotionStatus(db, issueId, notionStatus)
    const updated = getIssue(db, issueId)!
    await pushIssueToNotion(db, updated)
    res.json(updated)
  })

  app.get('/api/projects/:projectId/design-system', (req, res) => {
    const ds = getDesignSystemByProject(db, Number(req.params.projectId))
    if (!ds) return res.status(404).json({ error: 'not found' })
    res.json(ds)
  })

  app.put('/api/projects/:projectId/design-system', (req, res) => {
    const projectId = Number(req.params.projectId)
    const project = getProject(db, projectId)
    if (!project) return res.status(404).json({ error: 'not found' })

    const { name, version, packageName, storybookPath, tokens, components } = req.body ?? {}
    if (!name || !version || !packageName || !storybookPath || tokens == null || !Array.isArray(components)) {
      return res.status(400).json({ error: 'invalid body' })
    }

    const ds = upsertDesignSystem(db, projectId, {
      name,
      version,
      packageName,
      storybookPath,
      tokens,
      components,
    })
    res.json(ds)
  })

  // Safety net: any error thrown/forwarded from a route handler above lands
  // here instead of Node's default HTML+stacktrace error page.
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err)
    res.status(500).json({ error: 'internal error' })
  })

  return app
}
