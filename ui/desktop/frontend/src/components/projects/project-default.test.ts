import { describe, expect, it } from 'vitest'
import { defaultProjectId } from './project-default'
import type { Project } from '../../types/project'

function project(id: string, metadata: Project['metadata'] = null): Project {
  return {
    id,
    slug: id,
    ownerUserId: 'user-1',
    status: 'active',
    metadata,
    createdAt: '2026-05-15T00:00:00Z',
    updatedAt: '2026-05-15T00:00:00Z',
  }
}

describe('defaultProjectId', () => {
  it('uses the newest explicit desktop default marker', () => {
    expect(defaultProjectId([
      project('old', { desktopDefault: true, desktopDefaultAt: '2026-05-15T01:00:00Z' }),
      project('new', { desktopDefault: true, desktopDefaultAt: '2026-05-15T02:00:00Z' }),
    ])).toBe('new')
  })

  it('falls back to first active project', () => {
    expect(defaultProjectId([project('first'), project('second')])).toBe('first')
  })
})
