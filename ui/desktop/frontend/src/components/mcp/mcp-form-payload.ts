import type { MCPFormData } from '../../schemas/mcp.schema'
import type { MCPServerInput } from '../../types/mcp'

function nonEmptyRecord(value: Record<string, string>): Record<string, string> | undefined {
  return Object.keys(value).length > 0 ? value : undefined
}

function splitArgs(value: string): string[] | undefined {
  const trimmed = value.trim()
  return trimmed ? trimmed.split(/\s+/) : undefined
}

export function buildMcpServerInput(data: MCPFormData, isEdit: boolean): MCPServerInput {
  const input: MCPServerInput = {
    name: data.name,
    display_name: data.displayName || undefined,
    transport: data.transport,
    timeout_sec: data.timeoutSec,
    settings: { require_user_credentials: data.requireUserCredentials },
    enabled: data.enabled,
  }

  if (data.transport === 'stdio') {
    input.command = data.command
    input.args = splitArgs(data.args)
  } else {
    input.url = data.url
    input.headers = nonEmptyRecord(data.headers)
  }

  input.env = nonEmptyRecord(data.env)
  if (data.toolPrefix.trim()) input.tool_prefix = data.toolPrefix.trim()

  if (!isEdit) {
    input.team_id = data.scope === 'team' ? data.teamId || null : null
    input.project_id = data.scope === 'project' ? data.projectId || null : null
  }

  return input
}

export function buildMcpTestInput(data: MCPFormData) {
  return {
    transport: data.transport,
    command: data.transport === 'stdio' ? data.command : undefined,
    args: data.transport === 'stdio' ? splitArgs(data.args) : undefined,
    url: data.transport === 'stdio' ? undefined : data.url,
    headers: data.transport === 'stdio' ? undefined : nonEmptyRecord(data.headers),
    env: nonEmptyRecord(data.env),
  }
}
