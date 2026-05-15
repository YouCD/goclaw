import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useAgentDetailState } from './use-agent-detail-state'
import type { AgentData } from '../types/agent'

const baseAgent = {
  id: 'agent-1',
  agent_key: 'helper',
  display_name: 'Helper',
  owner_id: 'owner-1',
  provider: 'anthropic',
  model: 'claude-3-5',
  context_window: 200000,
  max_tool_iterations: 25,
  workspace: '/tmp/helper',
  restrict_to_workspace: true,
  agent_type: 'predefined',
  is_default: false,
  status: 'active',
  emoji: 'H',
  agent_description: 'Useful helper',
  thinking_level: null,
  reasoning_config: null,
  self_evolve: false,
  skill_evolve: false,
  skill_nudge_interval: null,
  memory_config: null,
  context_pruning: null,
  compaction_config: {},
  tools_config: null,
  sandbox_config: null,
  subagents_config: null,
  other_config: { prompt_mode: 'task', pinned_skills: ['review'] },
} satisfies AgentData

describe('useAgentDetailState', () => {
  it('tracks dirty state for model, memory, tools, sandbox, and skills config', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()
    const { result } = renderHook(() => useAgentDetailState(baseAgent, onSave, onClose))

    expect(result.current.isDirty).toBe(false)

    act(() => {
      result.current.setProvider('openai')
      result.current.setModel('gpt-5.2')
      result.current.setMemoryConfig({ enabled: true, max_results: 8 })
      result.current.setToolsEnabled(true)
      result.current.setToolsConfig({ profile: 'restricted', allow: ['read_file'] })
      result.current.setSandboxEnabled(true)
      result.current.setSandboxConfig({ mode: 'all', workspace_access: 'ro' })
      result.current.setPinnedSkills(['review', 'debug'])
    })

    expect(result.current.isDirty).toBe(true)

    await act(async () => {
      await result.current.handleSave()
    })

    expect(onSave).toHaveBeenCalledWith('agent-1', expect.objectContaining({
      provider: 'openai',
      model: 'gpt-5.2',
      memory_config: { enabled: true, max_results: 8 },
      tools_config: { profile: 'restricted', allow: ['read_file'] },
      sandbox_config: { mode: 'all', workspace_access: 'ro' },
      other_config: { prompt_mode: 'task', pinned_skills: ['review', 'debug'] },
    }))
    expect(onClose).toHaveBeenCalled()
  })

  it('preserves reasoning and context payload shape on save', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useAgentDetailState(baseAgent, onSave, vi.fn()))

    act(() => {
      result.current.setPromptMode('minimal')
      result.current.setReasoningMode('custom')
      result.current.setThinkingLevel('high')
      result.current.setPruningEnabled(true)
      result.current.setPruningConfig({ keepLastAssistants: 3 })
      result.current.setCompactionConfig({ keepLastMessages: 12, memoryFlush: { enabled: true } })
    })

    await act(async () => {
      await result.current.handleSave()
    })

    expect(onSave).toHaveBeenCalledWith('agent-1', expect.objectContaining({
      thinking_level: 'high',
      reasoning_config: { override_mode: 'custom', effort: 'high' },
      context_pruning: { keepLastAssistants: 3 },
      compaction_config: { keepLastMessages: 12, memoryFlush: { enabled: true } },
      other_config: { prompt_mode: 'minimal', pinned_skills: ['review'] },
    }))
  })
})
