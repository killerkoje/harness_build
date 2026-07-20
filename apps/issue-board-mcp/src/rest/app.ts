// src/rest/app.ts
import express from 'express'
import cors from 'cors'
import type Database from 'better-sqlite3'
import {
  getOrCreateProject,
  getProject,
  listProjects,
  deleteProject,
  updateProjectDevUrl,
} from '../models/projects.js'
import {
  createPlan,
  createPlanFromMarkdown,
  getPlan,
  getLatestPlanForProject,
  listPlansByProject,
  approvePlanAndCreateIssues,
  syncIssuesFromPlan,
} from '../models/plans.js'
import {
  listIssuesByProjectWithProgress,
  getIssue,
  advanceIssueStatus,
  approveIssueForDev,
  completeIssue,
  setIssueNotionStatus,
} from '../models/issues.js'
import { upsertWireframe, getWireframeByIssue, listWireframesByProject } from '../models/wireframes.js'
import {
  listSubtasksByIssue,
  createSubtask,
  getSubtask,
  updateSubtask,
  deleteSubtask,
  maybeAutoCompleteIssue,
} from '../models/subtasks.js'
import { getDesignSystemByProject, upsertDesignSystem } from '../models/design-systems.js'
import { pushIssueToNotion } from '../models/notion.js'
import { NOTION_STATUS_OPTIONS } from '../types.js'

// Express 4 doesn't forward a rejected promise from an async handler to the
// error middleware on its own — an uncaught rejection would otherwise crash
// the process instead of producing a 500. This wraps handlers so any
// rejection is routed to next(err).
function asyncHandler(
  fn: (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<unknown>
) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    fn(req, res, next).catch(next)
  }
}

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

  app.get('/api/projects', (_req, res) => {
    res.json(listProjects(db))
  })

  app.get('/api/projects/:id', (req, res) => {
    const project = getProject(db, Number(req.params.id))
    if (!project) return res.status(404).json({ error: 'not found' })
    res.json(project)
  })

  app.delete('/api/projects/:id', (req, res) => {
    const deleted = deleteProject(db, Number(req.params.id))
    if (!deleted) return res.status(404).json({ error: 'not found' })
    res.status(204).end()
  })

  app.patch('/api/projects/:id/dev-url', (req, res) => {
    const project = updateProjectDevUrl(db, Number(req.params.id), req.body.devUrl ?? null)
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

  app.get('/api/projects/:projectId/plans', (req, res) => {
    res.json(listPlansByProject(db, Number(req.params.projectId)))
  })

  app.post('/api/plans/:id/approve', asyncHandler(async (req, res) => {
    const planId = Number(req.params.id)
    const plan = getPlan(db, planId)
    if (!plan) return res.status(404).json({ error: 'not found' })

    if (plan.status === 'approved') {
      const result = await syncIssuesFromPlan(db, planId)
      return res.json(result)
    }

    const result = await approvePlanAndCreateIssues(db, planId)
    res.json(result)
  }))

  app.post('/api/plans/:id/sync-issues', asyncHandler(async (req, res) => {
    const planId = Number(req.params.id)
    const plan = getPlan(db, planId)
    if (!plan) return res.status(404).json({ error: 'not found' })
    try {
      res.json(await syncIssuesFromPlan(db, planId))
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : String(e) })
    }
  }))

  app.get('/api/projects/:projectId/issues', (req, res) => {
    res.json(listIssuesByProjectWithProgress(db, Number(req.params.projectId)))
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
    advanceIssueStatus(db, issueId, 'wireframed')
    res.json(wireframe)
  })

  app.get('/api/issues/:id/wireframe', (req, res) => {
    const wireframe = getWireframeByIssue(db, Number(req.params.id))
    if (!wireframe) return res.status(404).json({ error: 'not found' })
    res.json(wireframe)
  })

  app.get('/api/projects/:projectId/wireframes', (req, res) => {
    res.json(listWireframesByProject(db, Number(req.params.projectId)))
  })

  app.get('/api/issues/:id/subtasks', (req, res) => {
    const issueId = Number(req.params.id)
    const issue = getIssue(db, issueId)
    if (!issue) return res.status(404).json({ error: 'not found' })
    res.json(listSubtasksByIssue(db, issueId))
  })

  app.post('/api/issues/:id/subtasks', (req, res) => {
    const issueId = Number(req.params.id)
    const issue = getIssue(db, issueId)
    if (!issue) return res.status(404).json({ error: 'not found' })
    const { title } = req.body ?? {}
    if (!title) return res.status(400).json({ error: 'title required' })
    res.json(createSubtask(db, issueId, title))
  })

  app.put('/api/subtasks/:id', asyncHandler(async (req, res) => {
    const { title, done, notes } = req.body ?? {}
    if (title !== undefined && !title) return res.status(400).json({ error: 'title required' })
    const updated = updateSubtask(db, Number(req.params.id), { title, done, notes })
    if (!updated) return res.status(404).json({ error: 'not found' })
    await maybeAutoCompleteIssue(db, updated.issueId)
    res.json(updated)
  }))

  app.delete('/api/subtasks/:id', asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    const existing = getSubtask(db, id)
    if (!existing) return res.status(404).json({ error: 'not found' })
    deleteSubtask(db, id)
    await maybeAutoCompleteIssue(db, existing.issueId)
    res.status(204).end()
  }))

  app.post('/api/issues/:id/approve', asyncHandler(async (req, res) => {
    const issueId = Number(req.params.id)
    const updated = await approveIssueForDev(db, issueId)
    if (!updated) return res.status(404).json({ error: 'not found' })
    res.json(updated)
  }))

  app.post('/api/issues/:id/complete', asyncHandler(async (req, res) => {
    const issueId = Number(req.params.id)
    const updated = await completeIssue(db, issueId)
    if (!updated) return res.status(404).json({ error: 'not found' })
    res.json(updated)
  }))

  app.put('/api/issues/:id/notion-status', asyncHandler(async (req, res) => {
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
  }))

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
