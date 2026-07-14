// src/models/notion.ts
import type Database from 'better-sqlite3'
import type { Issue, IssueStatus, Priority } from '../types.js'
import { setIssueNotionPageId } from './issues.js'

const PRIORITY_MAP: Record<Priority, string> = {
  높음: '높음',
  보통: '중간',
  낮음: '낮음',
}

const STATUS_MAP: Record<IssueStatus, string> = {
  planned: '기획 중',
  wireframed: '시작 전',
  dev_approved: '진행 중',
  done: '완료',
}

interface NotionConfig {
  apiKey: string
  databaseId: string
}

function getNotionConfig(): NotionConfig | null {
  const apiKey = process.env.NOTION_API_KEY
  const databaseId = process.env.NOTION_DATABASE_ID
  if (!apiKey || !databaseId) return null
  return { apiKey, databaseId }
}

function buildProperties(issue: Issue) {
  return {
    이름: { title: [{ text: { content: issue.title } }] },
    우선순위: { select: { name: PRIORITY_MAP[issue.priority] } },
    // 사람이 대시보드에서 직접 고른 값이 있으면 파이프라인 자동 매핑보다 우선한다.
    상태: { status: { name: issue.notionStatus ?? STATUS_MAP[issue.status] } },
  }
}

/**
 * Pushes one issue to the configured Notion database: creates a page on
 * first push, patches the same page afterward (tracked via notion_page_id).
 * No-ops silently if NOTION_API_KEY/NOTION_DATABASE_ID aren't set — Notion
 * sync is optional, not a hard dependency of the DB write path.
 *
 * This is network I/O, so — like seedIssueYaml — callers must invoke it
 * outside any db.transaction() (transactions are DB-only, and this is
 * async).
 */
export async function pushIssueToNotion(
  db: Database.Database,
  issue: Issue,
  config: NotionConfig | null = getNotionConfig()
): Promise<void> {
  if (!config) return

  const headers = {
    Authorization: `Bearer ${config.apiKey}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  }

  if (issue.notionPageId) {
    await fetch(`https://api.notion.com/v1/pages/${issue.notionPageId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ properties: buildProperties(issue) }),
    })
    return
  }

  const res = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      parent: { database_id: config.databaseId },
      properties: buildProperties(issue),
    }),
  })
  const data = (await res.json()) as { id?: string }
  if (data.id) {
    setIssueNotionPageId(db, issue.id, data.id)
  }
}
