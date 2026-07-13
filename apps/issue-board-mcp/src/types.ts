export type PlanStatus = 'draft' | 'approved'
export type IssueStatus = 'planned' | 'wireframed' | 'dev_approved'
export type Priority = '높음' | '보통' | '낮음'

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
}

export interface Project {
  id: number
  rootPath: string
  name: string
}

export interface Plan {
  id: number
  projectId: number
  title: string
  sections: PlanSections
  status: PlanStatus
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
  createdAt: string
  updatedAt: string
}

export interface WireframeRegion {
  type: string
  label: string
}

export interface WireframeScreen {
  name: string
  route: string | null
  layout: { regions: WireframeRegion[] }
}

export interface Wireframe {
  id: number
  issueId: number
  screens: WireframeScreen[]
  createdAt: string
  updatedAt: string
}
