import { afterEach, describe, expect, it, vi } from 'vitest'
import { getWsClient } from '../lib/ws'
import { projectService } from './project-service'

vi.mock('../lib/ws', () => ({ getWsClient: vi.fn() }))

describe('project service', () => {
  afterEach(() => vi.clearAllMocks())

  it('uses projects WS methods with camelCase params', async () => {
    const call = vi.fn().mockResolvedValue({ projects: [] })
    vi.mocked(getWsClient).mockReturnValue({ call } as never)

    await projectService.list({ status: 'active', ownerUserId: 'user-1' })
    await projectService.create({ slug: 'client-portal', metadata: { displayName: 'Client Portal' } })
    await projectService.updateMetadata('project-1', { desktopDefault: true })
    await projectService.archive('project-1')

    expect(call).toHaveBeenNthCalledWith(1, 'projects.list', { status: 'active', ownerUserId: 'user-1' })
    expect(call).toHaveBeenNthCalledWith(2, 'projects.create', {
      slug: 'client-portal',
      ownerUserId: undefined,
      metadata: { displayName: 'Client Portal' },
    })
    expect(call).toHaveBeenNthCalledWith(3, 'projects.update_metadata', {
      id: 'project-1',
      metadata: { desktopDefault: true },
    })
    expect(call).toHaveBeenNthCalledWith(4, 'projects.delete', { id: 'project-1' })
  })
})
