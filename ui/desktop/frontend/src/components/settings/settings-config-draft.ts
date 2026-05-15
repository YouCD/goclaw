export interface ConfigDraft {
  host: string
  port: number
  allowedOrigins: string
  maxMessageChars: number
  rateLimitRpm: number
  injectionAction: string
  inboundDebounceMs: number
  sessionScope: string
  dmScope: string
  provider: string
  model: string
  maxTokens: number
  temperature: number
  maxToolIterations: number
  contextWindow: number
  workspace: string
  toolsProfile: string
  toolsRateLimitPerHour: number
  scrubCredentials: boolean
  execSecurity: string
  execAsk: string
  webFetchPolicy: string
  allowedDomains: string
  blockedDomains: string
  cronTimezone: string
  telemetryEnabled: boolean
}

export function configToDraft(config: Record<string, unknown>): ConfigDraft {
  const gateway = obj(config.gateway)
  const agents = obj(config.agents)
  const defaults = obj(agents.defaults)
  const tools = obj(config.tools)
  const exec = obj(tools.execApproval)
  const webFetch = obj(tools.web_fetch)
  const sessions = obj(config.sessions)
  const cron = obj(config.cron)
  const telemetry = obj(config.telemetry)

  return {
    host: str(gateway.host, '127.0.0.1'),
    port: num(gateway.port, 18791),
    allowedOrigins: list(gateway.allowed_origins),
    maxMessageChars: num(gateway.max_message_chars, 32000),
    rateLimitRpm: num(gateway.rate_limit_rpm, 20),
    injectionAction: str(gateway.injection_action, 'warn'),
    inboundDebounceMs: num(gateway.inbound_debounce_ms, 1000),
    sessionScope: str(sessions.scope, 'per-sender'),
    dmScope: str(sessions.dm_scope, 'per-channel-peer'),
    provider: str(defaults.provider),
    model: str(defaults.model),
    maxTokens: num(defaults.max_tokens, 4096),
    temperature: num(defaults.temperature, 0.7),
    maxToolIterations: num(defaults.max_tool_iterations, 12),
    contextWindow: num(defaults.context_window, 200000),
    workspace: str(defaults.workspace),
    toolsProfile: str(tools.profile, 'coding'),
    toolsRateLimitPerHour: num(tools.rate_limit_per_hour, 0),
    scrubCredentials: bool(tools.scrub_credentials, true),
    execSecurity: str(exec.security, 'full'),
    execAsk: str(exec.ask, 'off'),
    webFetchPolicy: str(webFetch.policy, 'allow_all'),
    allowedDomains: list(webFetch.allowed_domains),
    blockedDomains: list(webFetch.blocked_domains),
    cronTimezone: str(cron.default_timezone, 'Asia/Ho_Chi_Minh'),
    telemetryEnabled: bool(telemetry.enabled, false),
  }
}

export function draftToPatch(draft: ConfigDraft): Record<string, unknown> {
  return {
    gateway: {
      host: draft.host.trim(),
      port: draft.port,
      allowed_origins: splitList(draft.allowedOrigins),
      max_message_chars: draft.maxMessageChars,
      rate_limit_rpm: draft.rateLimitRpm,
      injection_action: draft.injectionAction,
      inbound_debounce_ms: draft.inboundDebounceMs,
    },
    sessions: {
      scope: draft.sessionScope,
      dm_scope: draft.dmScope,
    },
    agents: {
      defaults: {
        provider: draft.provider.trim(),
        model: draft.model.trim(),
        max_tokens: draft.maxTokens,
        temperature: draft.temperature,
        max_tool_iterations: draft.maxToolIterations,
        context_window: draft.contextWindow,
        workspace: draft.workspace.trim(),
      },
    },
    tools: {
      profile: draft.toolsProfile,
      rate_limit_per_hour: draft.toolsRateLimitPerHour,
      scrub_credentials: draft.scrubCredentials,
      execApproval: {
        security: draft.execSecurity,
        ask: draft.execAsk,
      },
      web_fetch: {
        policy: draft.webFetchPolicy,
        allowed_domains: splitList(draft.allowedDomains),
        blocked_domains: splitList(draft.blockedDomains),
      },
    },
    cron: { default_timezone: draft.cronTimezone.trim() },
    telemetry: { enabled: draft.telemetryEnabled },
  }
}

export function validateDraft(draft: ConfigDraft): string | null {
  if (!draft.host.trim()) return 'host'
  if (draft.port < 1 || draft.port > 65535) return 'port'
  if (draft.maxMessageChars < 1000) return 'max_message_chars'
  if (draft.rateLimitRpm < 0) return 'rate_limit_rpm'
  if (draft.inboundDebounceMs < -1) return 'inbound_debounce_ms'
  if (draft.temperature < 0 || draft.temperature > 2) return 'temperature'
  if (draft.maxTokens < 1) return 'max_tokens'
  if (draft.maxToolIterations < 0) return 'max_tool_iterations'
  if (draft.contextWindow < 1000) return 'context_window'
  if (draft.toolsRateLimitPerHour < 0) return 'rate_limit_per_hour'
  return null
}

function obj(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function list(value: unknown): string {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string').join(', ') : ''
}

function splitList(value: string): string[] {
  return value.split(',').map((item) => item.trim()).filter(Boolean)
}
