// src/rest/app.ts
import express from 'express'
import cors from 'cors'
import type Database from 'better-sqlite3'
import { pushIssueToNotion } from '../models/notion.js'
import { NOTION_STATUS_OPTIONS } from '../types.js'
import { sqliteStore, type Store } from '../store.js'

function asyncHandler(
  fn: (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<unknown>
) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    fn(req, res, next).catch(next)
  }
}

export function createApp(db: Database.Database, store: Store = sqliteStore(db)) {
  const app = express()
  app.use(cors())
  app.use(express.json())

  app.post('/api/projects', asyncHandler(async (req, res) => {
    res.json(await store.getOrCreateProject(req.body.rootPath))
  }))

  app.get('/api/projects', asyncHandler(async (_req, res) => {
    res.json(await store.listProjects())
  }))

  app.get('/api/projects/:id', asyncHandler(async (req, res) => {
    const project = await store.getProject(Number(req.params.id))
    if (!project) return res.status(404).json({ error: 'not found' })
    res.json(project)
  }))

  app.delete('/api/projects/:id', asyncHandler(async (req, res) => {
    const deleted = await store.deleteProject(Number(req.params.id))
    if (!deleted) return res.status(404).json({ error: 'not found' })
    res.status(204).end()
  }))

  app.patch('/api/projects/:id/dev-url', asyncHandler(async (req, res) => {
    const project = await store.updateProjectDevUrl(Number(req.params.id), req.body.devUrl ?? null)
    if (!project) return res.status(404).json({ error: 'not found' })
    res.json(project)
  }))

  app.post('/api/projects/:projectId/plans', asyncHandler(async (req, res) => {
    const projectId = Number(req.params.projectId)
    if (req.body.content) {
      return res.json(await store.createPlanFromMarkdown(projectId, req.body.title, req.body.content))
    }
    res.json(await store.createPlan(projectId, req.body.title, req.body.sections))
  }))

  app.get('/api/plans/:id', asyncHandler(async (req, res) => {
    const plan = await store.getPlan(Number(req.params.id))
    if (!plan) return res.status(404).json({ error: 'not found' })
    res.json(plan)
  }))

  app.get('/api/projects/:projectId/plans/latest', asyncHandler(async (req, res) => {
    const plan = await store.getLatestPlanForProject(Number(req.params.projectId))
    if (!plan) return res.status(404).json({ error: 'not found' })
    res.json(plan)
  }))

  app.get('/api/projects/:projectId/plans', asyncHandler(async (req, res) => {
    res.json(await store.listPlansByProject(Number(req.params.projectId)))
  }))

  app.post('/api/plans/:id/approve', asyncHandler(async (req, res) => {
    const planId = Number(req.params.id)
    const plan = await store.getPlan(planId)
    if (!plan) return res.status(404).json({ error: 'not found' })

    if (plan.status === 'approved') {
      return res.json(await store.syncIssuesFromPlan(planId))
    }
    res.json(await store.approvePlanAndCreateIssues(planId))
  }))

  app.post('/api/plans/:id/sync-issues', asyncHandler(async (req, res) => {
    const planId = Number(req.params.id)
    const plan = await store.getPlan(planId)
    if (!plan) return res.status(404).json({ error: 'not found' })
    try {
      res.json(await store.syncIssuesFromPlan(planId))
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : String(e) })
    }
  }))

  app.get('/api/projects/:projectId/issues', asyncHandler(async (req, res) => {
    res.json(await store.listIssuesByProjectWithProgress(Number(req.params.projectId)))
  }))

  app.get('/api/issues/:id', asyncHandler(async (req, res) => {
    const issue = await store.getIssue(Number(req.params.id))
    if (!issue) return res.status(404).json({ error: 'not found' })
    res.json(issue)
  }))

  app.put('/api/issues/:id/wireframe', asyncHandler(async (req, res) => {
    const issueId = Number(req.params.id)
    const issue = await store.getIssue(issueId)
    if (!issue) return res.status(404).json({ error: 'not found' })
    const wireframe = await store.upsertWireframe(issueId, req.body.screens)
    await store.advanceIssueStatus(issueId, 'wireframed')
    res.json(wireframe)
  }))

  app.get('/api/issues/:id/wireframe', asyncHandler(async (req, res) => {
    const wireframe = await store.getWireframeByIssue(Number(req.params.id))
    if (!wireframe) return res.status(404).json({ error: 'not found' })
    res.json(wireframe)
  }))

  app.get('/api/projects/:projectId/wireframes', asyncHandler(async (req, res) => {
    res.json(await store.listWireframesByProject(Number(req.params.projectId)))
  }))

  app.get('/api/issues/:id/subtasks', asyncHandler(async (req, res) => {
    const issueId = Number(req.params.id)
    const issue = await store.getIssue(issueId)
    if (!issue) return res.status(404).json({ error: 'not found' })
    res.json(await store.listSubtasksByIssue(issueId))
  }))

  app.post('/api/issues/:id/subtasks', asyncHandler(async (req, res) => {
    const issueId = Number(req.params.id)
    const issue = await store.getIssue(issueId)
    if (!issue) return res.status(404).json({ error: 'not found' })
    const { title } = req.body ?? {}
    if (!title) return res.status(400).json({ error: 'title required' })
    res.json(await store.createSubtask(issueId, title))
  }))

  app.put('/api/subtasks/:id', asyncHandler(async (req, res) => {
    const { title, done, notes } = req.body ?? {}
    if (title !== undefined && !title) return res.status(400).json({ error: 'title required' })
    const updated = await store.updateSubtask(Number(req.params.id), { title, done, notes })
    if (!updated) return res.status(404).json({ error: 'not found' })
    await store.maybeAutoCompleteIssue(updated.issueId)
    res.json(updated)
  }))

  app.delete('/api/subtasks/:id', asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    const existing = await store.getSubtask(id)
    if (!existing) return res.status(404).json({ error: 'not found' })
    await store.deleteSubtask(id)
    await store.maybeAutoCompleteIssue(existing.issueId)
    res.status(204).end()
  }))

  app.post('/api/issues/:id/approve', asyncHandler(async (req, res) => {
    const updated = await store.approveIssueForDev(Number(req.params.id))
    if (!updated) return res.status(404).json({ error: 'not found' })
    res.json(updated)
  }))

  app.post('/api/issues/:id/complete', asyncHandler(async (req, res) => {
    const updated = await store.completeIssue(Number(req.params.id))
    if (!updated) return res.status(404).json({ error: 'not found' })
    res.json(updated)
  }))

  app.put('/api/issues/:id/notion-status', asyncHandler(async (req, res) => {
    const issueId = Number(req.params.id)
    const issue = await store.getIssue(issueId)
    if (!issue) return res.status(404).json({ error: 'not found' })

    const { notionStatus } = req.body ?? {}
    if (notionStatus !== null && !NOTION_STATUS_OPTIONS.includes(notionStatus)) {
      return res.status(400).json({ error: `notionStatus must be one of ${NOTION_STATUS_OPTIONS.join(', ')} or null` })
    }

    await store.setIssueNotionStatus(issueId, notionStatus)
    const updated = (await store.getIssue(issueId))!
    await pushIssueToNotion(null, updated, null, undefined, (id, pageId) =>
      store.setIssueNotionPageId(id, pageId)
    )
    res.json(updated)
  }))

  app.get('/api/projects/:projectId/design-system', asyncHandler(async (req, res) => {
    const ds = await store.getDesignSystemByProject(Number(req.params.projectId))
    if (!ds) return res.status(404).json({ error: 'not found' })
    res.json(ds)
  }))

  app.put('/api/projects/:projectId/design-system', asyncHandler(async (req, res) => {
    const projectId = Number(req.params.projectId)
    const project = await store.getProject(projectId)
    if (!project) return res.status(404).json({ error: 'not found' })

    const { name, version, packageName, storybookPath, tokens, components } = req.body ?? {}
    if (
      !name ||
      !version ||
      !packageName ||
      !storybookPath ||
      tokens == null ||
      (components !== undefined && !Array.isArray(components))
    ) {
      return res.status(400).json({ error: 'invalid body' })
    }

    res.json(
      await store.upsertDesignSystem(projectId, {
        name,
        version,
        packageName,
        storybookPath,
        tokens,
        components,
      })
    )
  }))

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err)
    res.status(500).json({ error: 'internal error' })
  })

  return app
}
