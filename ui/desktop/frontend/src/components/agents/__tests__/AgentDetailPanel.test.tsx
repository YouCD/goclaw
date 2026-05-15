import '../../../i18n'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../../i18n'
import { AgentDetailPanel } from '../AgentDetailPanel'
import type { AgentData } from '../../../types/agent'

vi.mock('../PersonalitySection', () => ({ PersonalitySection: () => <div>identity-section</div> }))
vi.mock('../ModelBudgetSection', () => ({ ModelBudgetSection: () => <div>model-section</div> }))
vi.mock('../prompt-mode-section', () => ({ PromptModeSection: () => <div>prompt-section</div> }))
vi.mock('../thinking-section', () => ({ ThinkingSection: () => <div>thinking-section</div> }))
vi.mock('../MemorySection', () => ({ MemorySection: () => <div>memory-section</div> }))
vi.mock('../context-pruning-section', () => ({ ContextPruningSection: () => <div>context-pruning-section</div> }))
vi.mock('../compaction-section', () => ({ CompactionSection: () => <div>compaction-section</div> }))
vi.mock('../orchestration-section', () => ({ OrchestrationSection: () => <div>orchestration-section</div> }))
vi.mock('../subagents-section', () => ({ SubagentsSection: () => <div>subagents-section</div> }))
vi.mock('../tool-policy-section', () => ({ ToolPolicySection: () => <div>tool-policy-section</div> }))
vi.mock('../sandbox-section', () => ({ SandboxSection: () => <div>sandbox-section</div> }))
vi.mock('../pinned-skills-section', () => ({ PinnedSkillsSection: () => <div>pinned-skills-section</div> }))
vi.mock('../AgentSkillsSection', () => ({ AgentSkillsSection: () => <div>skills-section</div> }))
vi.mock('../AgentMcpSection', () => ({ AgentMcpSection: () => <div>mcp-section</div> }))
vi.mock('../voice-picker', () => ({ VoicePicker: () => <div>voice-picker</div> }))
vi.mock('../tts-empty-state', () => ({ TtsEmptyState: () => <div>tts-empty</div> }))
vi.mock('../tts-override-fine-tune', () => ({ TtsOverrideFineTune: () => <div>tts-fine-tune</div> }))
vi.mock('../evolution-section-expanded', () => ({ EvolutionSectionExpanded: () => <div>evolution-settings</div> }))
vi.mock('../evolution-tab', () => ({ EvolutionTab: () => <div>evolution-metrics</div> }))
vi.mock('../AgentFilesTab', () => ({ AgentFilesTab: () => <div>files-section</div> }))
vi.mock('../../../hooks/use-tts-config', () => ({ useDesktopTtsConfig: () => ({ globalProvider: 'openai' }) }))
vi.mock('../../../hooks/use-tts-capabilities', () => ({ useTtsCapabilities: () => ({ data: null }) }))

const baseAgent = {
  id: 'agent-1',
  agent_key: 'helper',
  display_name: 'Helper',
  owner_id: 'owner-1',
  provider: 'anthropic',
  model: 'claude',
  context_window: 200000,
  max_tool_iterations: 25,
  workspace: '/tmp/helper',
  restrict_to_workspace: true,
  agent_type: 'predefined',
  is_default: false,
  status: 'active',
  other_config: {},
} satisfies AgentData

describe('AgentDetailPanel config shell', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('keeps Skills/MCP, Files, and predefined Evolution reachable', () => {
    render(
      <AgentDetailPanel
        agent={baseAgent}
        onSave={vi.fn().mockResolvedValue(undefined)}
        onResummon={vi.fn().mockResolvedValue(undefined)}
        onClose={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /skills & mcp/i }))
    expect(screen.getByText('skills-section')).toBeInTheDocument()
    expect(screen.getByText('mcp-section')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /^files/i }))
    expect(screen.getByText('files-section')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /^evolution/i }))
    expect(screen.getByText('evolution-settings')).toBeInTheDocument()
    expect(screen.getByText('evolution-metrics')).toBeInTheDocument()
  })

  it('hides predefined-only Evolution for open agents', () => {
    render(
      <AgentDetailPanel
        agent={{ ...baseAgent, agent_type: 'open' }}
        onSave={vi.fn().mockResolvedValue(undefined)}
        onResummon={vi.fn().mockResolvedValue(undefined)}
        onClose={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: /^evolution/i })).not.toBeInTheDocument()
  })
})
