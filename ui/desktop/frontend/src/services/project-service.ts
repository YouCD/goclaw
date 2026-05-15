import { getWsClient } from '../lib/ws'
import type { Project, ProjectInput, ProjectMetadata, ProjectStatus } from '../types/project'

export interface ProjectListFilter {
  status?: ProjectStatus | 'all'
  ownerUserId?: string
}

export const projectService = {
  list(filter: ProjectListFilter = {}): Promise<{ projects: Project[] | null }> {
    const params: Record<string, unknown> = {}
    if (filter.status && filter.status !== 'all') params.status = filter.status
    if (filter.ownerUserId) params.ownerUserId = filter.ownerUserId
    return getWsClient().call('projects.list', params) as Promise<{ projects: Project[] | null }>
  },

  create(input: ProjectInput): Promise<{ project: Project }> {
    return getWsClient().call('projects.create', {
      slug: input.slug,
      ownerUserId: input.ownerUserId,
      metadata: input.metadata ?? null,
    }) as Promise<{ project: Project }>
  },

  updateMetadata(id: string, metadata: ProjectMetadata | null): Promise<{ ok: boolean; project?: Project }> {
    return getWsClient().call('projects.update_metadata', { id, metadata }) as Promise<{ ok: boolean; project?: Project }>
  },

  updateStatus(id: string, status: ProjectStatus): Promise<{ ok: boolean }> {
    return getWsClient().call('projects.update_status', { id, status }) as Promise<{ ok: boolean }>
  },

  archive(id: string): Promise<{ ok: boolean; archived: boolean }> {
    return getWsClient().call('projects.delete', { id }) as Promise<{ ok: boolean; archived: boolean }>
  },
}
