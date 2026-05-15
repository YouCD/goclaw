export type ProjectStatus = 'active' | 'archived'

export interface Project {
  id: string
  slug: string
  ownerUserId: string
  status: ProjectStatus
  metadata?: ProjectMetadata | null
  createdAt: string
  updatedAt: string
}

export interface ProjectMetadata {
  displayName?: string
  description?: string
  desktopDefault?: boolean
  desktopDefaultAt?: string
  [key: string]: unknown
}

export interface ProjectInput {
  slug: string
  ownerUserId?: string
  metadata?: ProjectMetadata | null
}
