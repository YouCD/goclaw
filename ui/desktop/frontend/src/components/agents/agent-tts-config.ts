import type { AgentData } from '../../types/agent'
import type { ParamValue } from '../dynamic-param-form'

export function mergeAgentTtsConfig(
  updates: Partial<AgentData>,
  voiceId: string | null,
  params: Record<string, ParamValue>,
): Partial<AgentData> {
  const merged = { ...updates }
  const existing = (merged.other_config ?? {}) as Record<string, unknown>
  let cfg = { ...existing }

  if (voiceId) {
    cfg = { ...cfg, tts_voice_id: voiceId }
  } else {
    const { tts_voice_id: _voiceId, ...rest } = cfg
    void _voiceId
    cfg = rest
  }

  if (params && Object.keys(params).length > 0) {
    cfg = { ...cfg, tts_params: params }
  } else {
    const { tts_params: _params, ...rest } = cfg
    void _params
    cfg = rest
  }

  merged.other_config = Object.keys(cfg).length > 0 ? cfg : null
  return merged
}

export function hasAgentTtsConfigChanged(
  agent: AgentData,
  voiceId: string | null,
  params: Record<string, ParamValue>,
): boolean {
  const savedVoiceId = (agent.other_config?.tts_voice_id as string) ?? null
  const savedParams = (agent.other_config?.tts_params as Record<string, ParamValue>) ?? {}
  return savedVoiceId !== voiceId || JSON.stringify(savedParams) !== JSON.stringify(params)
}
