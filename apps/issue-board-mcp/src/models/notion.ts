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

// 팀 공유 Notion DB("2-1.애자일 업무 관리")의 select 옵션 — 이 DB엔 프로젝트별
// 태그가 없어 harness로 만든 항목은 전부 "기타"로 분류한다.
const NOTION_GUBUN = '기타'

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

const NOTION_TIMEOUT_MS = 10_000

/**
 * fetch() wrapper for Notion calls: bounds the wait with a timeout and turns
 * network errors / non-2xx responses into a logged failure instead of a
 * silently-swallowed one or an unhandled rejection. Returns null on any
 * failure so callers can no-op — Notion sync is best-effort, not a hard
 * dependency of the DB write path.
 */
async function notionFetch(url: string, init: RequestInit, label: string): Promise<Response | null> {
  let res: Response
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(NOTION_TIMEOUT_MS) })
  } catch (err) {
    console.error(`[notion] ${label} failed (request error):`, err)
    return null
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error(`[notion] ${label} failed: ${res.status} ${res.statusText} ${body}`)
    return null
  }
  return res
}

/** Whether NOTION_API_KEY/NOTION_DATABASE_ID are both set. */
export function isNotionConfigured(): boolean {
  return getNotionConfig() !== null
}

function buildIssueProperties(issue: Issue, epicPageId?: string | null) {
  const properties: Record<string, unknown> = {
    이름: { title: [{ text: { content: issue.title } }] },
    '우선 순위': { select: { name: PRIORITY_MAP[issue.priority] } },
    // 사람이 대시보드에서 직접 고른 값이 있으면 파이프라인 자동 매핑보다 우선한다.
    상태: { status: { name: issue.notionStatus ?? STATUS_MAP[issue.status] } },
    선택: { select: { name: '이슈(스토리)' } },
    구분: { select: { name: NOTION_GUBUN } },
  }
  if (epicPageId) {
    properties['상위 항목'] = { relation: [{ id: epicPageId }] }
  }
  return properties
}

function buildEpicProperties(planTitle: string) {
  return {
    이름: { title: [{ text: { content: planTitle } }] },
    선택: { select: { name: '에픽' } },
    구분: { select: { name: NOTION_GUBUN } },
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
  epicPageId?: string | null,
  config: NotionConfig | null = getNotionConfig()
): Promise<void> {
  if (!config) return

  const headers = {
    Authorization: `Bearer ${config.apiKey}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  }

  if (issue.notionPageId) {
    await notionFetch(
      `https://api.notion.com/v1/pages/${issue.notionPageId}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ properties: buildIssueProperties(issue, epicPageId) }),
      },
      `patch issue ${issue.id}`
    )
    return
  }

  const res = await notionFetch(
    'https://api.notion.com/v1/pages',
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        parent: { database_id: config.databaseId },
        properties: buildIssueProperties(issue, epicPageId),
      }),
    },
    `create issue ${issue.id}`
  )
  if (!res) return
  const data = (await res.json()) as { id?: string }
  if (data.id) {
    setIssueNotionPageId(db, issue.id, data.id)
  } else {
    console.error(`[notion] create issue ${issue.id} succeeded but response had no page id`)
  }
}

/**
 * Creates (or patches, if `existingEpicPageId` is set) the Notion page that
 * represents a plan as an Epic ("선택" = 에픽). Stories link back to it via
 * their "상위 항목" relation. Pure Notion I/O — no DB access, so callers
 * (plans.ts) own persisting the returned page id to avoid a circular import
 * with notion.ts. Returns null when Notion sync isn't configured.
 */
export async function pushEpicToNotion(
  existingEpicPageId: string | null,
  planTitle: string,
  config: NotionConfig | null = getNotionConfig()
): Promise<string | null> {
  if (!config) return null

  const headers = {
    Authorization: `Bearer ${config.apiKey}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  }

  if (existingEpicPageId) {
    await notionFetch(
      `https://api.notion.com/v1/pages/${existingEpicPageId}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ properties: buildEpicProperties(planTitle) }),
      },
      `patch epic ${existingEpicPageId}`
    )
    return existingEpicPageId
  }

  const res = await notionFetch(
    'https://api.notion.com/v1/pages',
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        parent: { database_id: config.databaseId },
        properties: buildEpicProperties(planTitle),
      }),
    },
    `create epic "${planTitle}"`
  )
  if (!res) return null
  const data = (await res.json()) as { id?: string }
  return data.id ?? null
}
