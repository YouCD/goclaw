import { describe, expect, it } from 'vitest'
import { buildMcpServerInput, buildMcpTestInput } from './mcp-form-payload'
import type { MCPFormData } from '../../schemas/mcp.schema'

const base: MCPFormData = {
  name: 'filesystem',
  displayName: 'Filesystem',
  transport: 'stdio',
  command: 'npx',
  args: '-y @modelcontextprotocol/server-filesystem /tmp',
  url: '',
  headers: {},
  env: { API_KEY: 'secret' },
  toolPrefix: 'fs',
  timeoutSec: 45,
  requireUserCredentials: true,
  enabled: true,
  scope: 'project',
  teamId: '',
  projectId: 'project-1',
}

describe('mcp form payload', () => {
  it('preserves stdio args, env, settings, and create scope', () => {
    expect(buildMcpServerInput(base, false)).toEqual({
      name: 'filesystem',
      display_name: 'Filesystem',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
      env: { API_KEY: 'secret' },
      tool_prefix: 'fs',
      timeout_sec: 45,
      settings: { require_user_credentials: true },
      enabled: true,
      team_id: null,
      project_id: 'project-1',
    })
  })

  it('omits immutable scope on update and preserves HTTP headers for test', () => {
    const httpData: MCPFormData = {
      ...base,
      transport: 'streamable-http',
      command: '',
      args: '',
      url: 'https://mcp.example.test',
      headers: { Authorization: 'Bearer token' },
      scope: 'team',
      teamId: 'team-1',
      projectId: '',
    }

    expect(buildMcpServerInput(httpData, true)).not.toHaveProperty('team_id')
    expect(buildMcpServerInput(httpData, true)).not.toHaveProperty('project_id')
    expect(buildMcpTestInput(httpData)).toEqual({
      transport: 'streamable-http',
      command: undefined,
      args: undefined,
      url: 'https://mcp.example.test',
      headers: { Authorization: 'Bearer token' },
      env: { API_KEY: 'secret' },
    })
  })
})
