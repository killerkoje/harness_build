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

const PORT = Number(process.env.PORT ?? 4000)
const DB_PATH = process.env.ISSUE_BOARD_DB ?? path.join(process.cwd(), 'issue-board.db')

const db = createDb(DB_PATH)
const restApp = createApp(db)

restApp.post('/mcp', express.json(), async (req, res) => {
  const server = createMcpServer(db)
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
  res.on('close', () => {
    transport.close()
    server.close()
  })
  await server.connect(transport)
  await transport.handleRequest(req, res, req.body)
})

restApp.listen(PORT, () => {
  console.log(`issue-board-mcp listening on :${PORT} (REST /api/*, MCP /mcp), db=${DB_PATH}`)
})
