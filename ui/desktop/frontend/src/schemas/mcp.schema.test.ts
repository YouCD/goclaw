import { describe, expect, it } from 'vitest'
import { mcpFormSchema, type MCPFormData } from './mcp.schema'

const base: MCPFormData = {
  name: 'filesystem',
  displayName: 'Filesystem',
  transport: 'stdio',
  command: 'npx',
  args: '',
  url: '',
  headers: {},
  env: {},
  toolPrefix: '',
  timeoutSec: 30,
  requireUserCredentials: false,
  enabled: true,
  scope: 'global',
  teamId: '',
  projectId: '',
}

describe('mcp form schema', () => {
  it('rejects team scope without a team id', () => {
    const result = mcpFormSchema.safeParse({ ...base, scope: 'team' })

    expect(result.success).toBe(false)
  })

  it('rejects project scope without a project id', () => {
    const result = mcpFormSchema.safeParse({ ...base, scope: 'project' })

    expect(result.success).toBe(false)
  })

  it('accepts scoped create when target id is present', () => {
    const result = mcpFormSchema.safeParse({ ...base, scope: 'project', projectId: 'project-1' })

    expect(result.success).toBe(true)
  })
})
