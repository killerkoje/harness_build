export type PlanStatus = 'draft' | 'approved'
export type IssueStatus = 'planned' | 'wireframed' | 'dev_approved' | 'done'
export type Priority = '높음' | '보통' | '낮음'

/** Notion `상태` 속성의 실제 옵션 전체 — 이슈보드 파이프라인 상태와 무관하게
 *  사람이 대시보드에서 직접 골라 Notion에 그대로 반영할 수 있는 값들. */
export const NOTION_STATUS_OPTIONS = ['기획 중', '시작 전', '보류', '진행 중', '반영 대기', '완료'] as const
export type NotionStatus = (typeof NOTION_STATUS_OPTIONS)[number]

export interface MvpFeature {
  priority: Priority
  title: string
  description: string
}

export interface PlanSections {
  overview: string
  targetUsers: string
  mvpFeatures: MvpFeature[]
  outOfScope: string
  /** /ib-plan 마크다운 전문 — 있으면 대시보드가 이걸 렌더 */
  markdown?: string
}

export interface Project {
  id: number
  rootPath: string
  name: string
  description?: string
  devUrl: string | null
}

export interface Plan {
  id: number
  projectId: number
  title: string
  sections: PlanSections
  status: PlanStatus
  notionEpicPageId: string | null
  createdAt: string
  updatedAt: string
}

export interface PlanSnapshot {
  id: number
  planId: number
  label: string
  content: PlanSections
  createdAt: string
}

export interface Issue {
  id: number
  projectId: number
  number: number
  planId: number | null
  title: string
  priority: Priority
  description: string
  status: IssueStatus
  notionPageId: string | null
  /** 사람이 대시보드에서 직접 고른 Notion 상태 — 있으면 status 기반 자동 매핑을 덮어쓴다 */
  notionStatus: NotionStatus | null
  createdAt: string
  updatedAt: string
}

export interface WireframeScreen {
  name: string
  route: string | null
  html: string
}

export interface Wireframe {
  id: number
  issueId: number
  screens: WireframeScreen[]
  createdAt: string
  updatedAt: string
}

/** Turborepo design-system 스타일 패키지 메타 + 토큰/컴포넌트 카탈로그 */
export interface DesignSystemComponent {
  name: string
  packageExport: string
  description: string
  issueNumbers: number[]
}

export interface DesignSystem {
  id: number
  projectId: number
  name: string
  version: string
  packageName: string
  storybookPath: string
  tokens: Record<string, unknown>
  components: DesignSystemComponent[]
  createdAt: string
  updatedAt: string
}
