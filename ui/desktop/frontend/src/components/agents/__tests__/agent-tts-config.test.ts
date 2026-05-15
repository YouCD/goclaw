import { describe, expect, it } from 'vitest'
import { hasAgentTtsConfigChanged, mergeAgentTtsConfig } from '../agent-tts-config'
import type { AgentData } from '../../../types/agent'

const agent = {
  id: 'agent-1',
  agent_key: 'helper',
  owner_id: 'owner-1',
  provider: 'anthropic',
  model: 'claude',
  context_window: 200000,
  max_tool_iterations: 25,
  workspace: '/tmp',
  restrict_to_workspace: true,
  agent_type: 'predefined',
  is_default: false,
  status: 'active',
  other_config: { prompt_mode: 'task', tts_voice_id: 'alloy', tts_params: { speed: 1.1 } },
} satisfies AgentData

describe('agent TTS config merge', () => {
  it('preserves unrelated other_config keys while saving voice overrides', () => {
    const merged = mergeAgentTtsConfig(
      { other_config: { prompt_mode: 'task', pinned_skills: ['review'] } },
      'verse',
      { speed: 1.2 },
    )

    expect(merged.other_config).toEqual({
      prompt_mode: 'task',
      pinned_skills: ['review'],
      tts_voice_id: 'verse',
      tts_params: { speed: 1.2 },
    })
  })

  it('removes empty TTS overrides without dropping other_config', () => {
    const merged = mergeAgentTtsConfig(
      { other_config: { prompt_mode: 'task', tts_voice_id: 'alloy', tts_params: { speed: 1.1 } } },
      null,
      {},
    )

    expect(merged.other_config).toEqual({ prompt_mode: 'task' })
  })

  it('detects dirty voice params against saved agent config', () => {
    expect(hasAgentTtsConfigChanged(agent, 'alloy', { speed: 1.1 })).toBe(false)
    expect(hasAgentTtsConfigChanged(agent, 'verse', { speed: 1.1 })).toBe(true)
    expect(hasAgentTtsConfigChanged(agent, 'alloy', { speed: 1.2 })).toBe(true)
  })
})
