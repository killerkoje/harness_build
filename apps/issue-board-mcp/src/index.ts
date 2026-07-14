// src/index.ts
import path from 'node:path'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import express from 'express'
import { createDb } from './db.js'
import { createApp } from './rest/app.js'
import { createMcpServer } from './mcp/server.js'

try {
  process.loadEnvFile(path.join(process.cwd(), '.env'))
} catch {
  // .env is optional — Notion sync just stays disabled without it
}

if (!process.env.NOTION_API_KEY || !process.env.NOTION_DATABASE_ID) {
  console.warn(
    '[issue-board-mcp] NOTION_API_KEY/NOTION_DATABASE_ID not set — Notion sync disabled.\n' +
      '  → 연동하려면 apps/issue-board-mcp/.env.example을 .env로 복사하고 값을 채우세요.'
  )
}

const PORT = Number(process.env.PORT ?? 4000)
const DB_PATH = process.env.ISSUE_BOARD_DB ?? path.join(process.cwd(), 'issue-board.db')

const db = createDb(DB_PATH)
const restApp = createApp(db)

restApp.post('/mcp', express.json(), async (req, res) => {
  // This route is registered after createApp()'s own error middleware, so
  // next(err) here would fall through to Express's default HTML error page
  // instead of that JSON handler — respond directly instead.
  try {
    const server = createMcpServer(db)
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
    res.on('close', () => {
      transport.close()
      server.close()
    })
    await server.connect(transport)
    await transport.handleRequest(req, res, req.body)
  } catch (err) {
    console.error(err)
    if (!res.headersSent) {
      res.status(500).json({ error: 'internal error' })
    }
  }
})

restApp.listen(PORT, () => {
  console.log(`issue-board-mcp listening on :${PORT} (REST /api/*, MCP /mcp), db=${DB_PATH}`)
})
