import { useState, useRef, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { PersonalitySection } from './PersonalitySection'
import { ModelBudgetSection } from './ModelBudgetSection'
import { EvolutionSectionExpanded } from './evolution-section-expanded'
import { PromptModeSection } from './prompt-mode-section'
import { ThinkingSection } from './thinking-section'
import { OrchestrationSection } from './orchestration-section'
import { ContextPruningSection } from './context-pruning-section'
import { CompactionSection } from './compaction-section'
import { MemorySection } from './MemorySection'
import { SubagentsSection } from './subagents-section'
import { ToolPolicySection } from './tool-policy-section'
import { SandboxSection } from './sandbox-section'
import { PinnedSkillsSection } from './pinned-skills-section'
import { EvolutionTab } from './evolution-tab'
import { AgentSkillsSection } from './AgentSkillsSection'
import { AgentMcpSection } from './AgentMcpSection'
import { AgentFilesTab } from './AgentFilesTab'
import { VoicePicker } from './voice-picker'
import { TtsEmptyState } from './tts-empty-state'
import { TtsOverrideFineTune } from './tts-override-fine-tune'
import type { ParamValue } from '../dynamic-param-form'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { AgentConfigShell, type AgentConfigSection } from './agent-config-shell'
import { hasAgentTtsConfigChanged, mergeAgentTtsConfig } from './agent-tts-config'
import { useAgentDetailState } from '../../hooks/use-agent-detail-state'
import { useDesktopTtsConfig } from '../../hooks/use-tts-config'
import { useTtsCapabilities } from '../../hooks/use-tts-capabilities'
import type { AgentData } from '../../types/agent'
import type { TtsProviderId } from '@/data/tts-providers'

interface AgentDetailPanelProps {
  agent: AgentData
  onSave: (id: string, updates: Partial<AgentData>) => Promise<void>
  onResummon: (id: string) => Promise<void>
  onClose: () => void
}

export function AgentDetailPanel({ agent, onSave, onResummon, onClose }: AgentDetailPanelProps) {
  const { t } = useTranslation(['agents', 'common', 'tts'])
  const [activeSection, setActiveSection] = useState('identity-model')
  const [confirmResummon, setConfirmResummon] = useState(false)
  const [ttsVoiceId, setTtsVoiceId] = useState<string | null>(
    (agent.other_config?.tts_voice_id as string) ?? null,
  )
  const ttsVoiceIdRef = useRef(ttsVoiceId)
  ttsVoiceIdRef.current = ttsVoiceId

  // Per-agent TTS fine-tune params (generic keys: speed, emotion, style).
  const [ttsParams, setTtsParams] = useState<Record<string, ParamValue>>(
    (agent.other_config?.tts_params as Record<string, ParamValue>) ?? {},
  )
  const ttsParamsRef = useRef(ttsParams)
  ttsParamsRef.current = ttsParams

  // Wrap onSave to merge tts_voice_id + tts_params into other_config at save time.
  const onSaveWithVoice = useCallback(async (id: string, updates: Partial<AgentData>) => {
    await onSave(id, mergeAgentTtsConfig(updates, ttsVoiceIdRef.current, ttsParamsRef.current))
  }, [onSave])

  const s = useAgentDetailState(agent, onSaveWithVoice, onClose)
  const isPredefined = agent.agent_type === 'predefined'
  const { globalProvider } = useDesktopTtsConfig()
  const { data: allCaps } = useTtsCapabilities()
  const ttsDirty = hasAgentTtsConfigChanged(agent, ttsVoiceId, ttsParams)
  const isDirty = s.isDirty || ttsDirty

  const handleConfirmResummon = async () => {
    setConfirmResummon(false)
    await onResummon(agent.id)
  }

  const sections = useMemo<AgentConfigSection[]>(() => {
    const configSections: AgentConfigSection[] = [
      {
        id: 'identity-model',
        label: t('agents:detail.configShell.identityModel'),
        description: t('agents:detail.configShell.identityModelDesc'),
        content: (
          <div className="space-y-6">
            <PersonalitySection
              emoji={s.emoji} displayName={s.displayName} description={s.description}
              agentKey={agent.agent_key} agentType={agent.agent_type}
              isDefault={s.isDefault} status={s.status}
              onEmojiChange={s.setEmoji} onDisplayNameChange={s.setDisplayName}
              onDescriptionChange={s.setDescription} onIsDefaultChange={s.setIsDefault}
              onStatusChange={s.setStatus}
            />
            <hr className="border-border" />
            <ModelBudgetSection
              provider={s.provider} model={s.model}
              contextWindow={s.contextWindow} maxToolIterations={s.maxToolIterations}
              savedProvider={agent.provider} savedModel={agent.model}
              onProviderChange={s.setProvider} onModelChange={s.setModel}
              onContextWindowChange={s.setContextWindow} onMaxToolIterationsChange={s.setMaxToolIterations}
              onSaveBlockedChange={s.setSaveBlocked}
            />
          </div>
        ),
      },
      {
        id: 'reasoning-prompt',
        label: t('agents:detail.configShell.reasoningPrompt'),
        description: t('agents:detail.configShell.reasoningPromptDesc'),
        content: (
          <div className="space-y-6">
            <PromptModeSection mode={s.promptMode} onModeChange={s.setPromptMode} />
            <hr className="border-border" />
            <ThinkingSection
              reasoningMode={s.reasoningMode} thinkingLevel={s.thinkingLevel}
              onReasoningModeChange={s.setReasoningMode} onThinkingLevelChange={s.setThinkingLevel}
            />
          </div>
        ),
      },
      {
        id: 'memory-context',
        label: t('agents:detail.configShell.memoryContext'),
        description: t('agents:detail.configShell.memoryContextDesc'),
        content: (
          <div className="space-y-6">
            <MemorySection config={s.memoryConfig} onChange={s.setMemoryConfig} />
            <hr className="border-border" />
            <ContextPruningSection
              enabled={s.pruningEnabled} value={s.pruningConfig}
              onToggle={s.setPruningEnabled} onChange={s.setPruningConfig}
            />
            <hr className="border-border" />
            <CompactionSection value={s.compactionConfig} onChange={s.setCompactionConfig} />
          </div>
        ),
      },
      {
        id: 'tools-sandbox',
        label: t('agents:detail.configShell.toolsSandbox'),
        description: t('agents:detail.configShell.toolsSandboxDesc'),
        content: (
          <div className="space-y-6">
            {isPredefined && (
              <>
                <OrchestrationSection agentId={agent.id} />
                <hr className="border-border" />
              </>
            )}
            <SubagentsSection enabled={s.subEnabled} value={s.subConfig} onToggle={s.setSubEnabled} onChange={s.setSubConfig} />
            <hr className="border-border" />
            <ToolPolicySection enabled={s.toolsEnabled} value={s.toolsConfig} onToggle={s.setToolsEnabled} onChange={s.setToolsConfig} />
            <hr className="border-border" />
            <SandboxSection enabled={s.sandboxEnabled} value={s.sandboxConfig} onToggle={s.setSandboxEnabled} onChange={s.setSandboxConfig} />
          </div>
        ),
      },
      {
        id: 'skills-mcp',
        label: t('agents:detail.configShell.skillsMcp'),
        description: t('agents:detail.configShell.skillsMcpDesc'),
        content: (
          <div className="space-y-6">
            <PinnedSkillsSection agentId={agent.id} pinned={s.pinnedSkills} onPinnedChange={s.setPinnedSkills} />
            <hr className="border-border" />
            <AgentSkillsSection agentId={agent.id} />
            <hr className="border-border" />
            <AgentMcpSection agentId={agent.id} />
          </div>
        ),
      },
      {
        id: 'voice',
        label: t('agents:detail.configShell.voice'),
        description: t('agents:detail.configShell.voiceDesc'),
        content: (
          <div className="space-y-3">
            {globalProvider ? (
              <>
                <VoicePicker
                  value={ttsVoiceId}
                  onChange={setTtsVoiceId}
                  provider={globalProvider as TtsProviderId}
                />
                <TtsOverrideFineTune
                  globalProvider={globalProvider}
                  allCaps={allCaps}
                  ttsParams={ttsParams}
                  onChange={setTtsParams}
                />
              </>
            ) : (
              <TtsEmptyState />
            )}
          </div>
        ),
      },
    ]

    if (isPredefined) {
      configSections.push({
        id: 'evolution',
        label: t('agents:detail.configShell.evolution'),
        description: t('agents:detail.configShell.evolutionDesc'),
        content: (
          <div className="space-y-6">
            <EvolutionSectionExpanded
              agentId={agent.id}
              selfEvolve={s.selfEvolve} onSelfEvolveChange={s.setSelfEvolve}
              skillLearning={s.skillLearning} onSkillLearningChange={s.setSkillLearning}
              skillNudgeInterval={s.skillNudgeInterval} onSkillNudgeIntervalChange={s.setSkillNudgeInterval}
            />
            <hr className="border-border" />
            <EvolutionTab agentId={agent.id} agentOtherConfig={agent.other_config} />
          </div>
        ),
      })
    }

    configSections.push({
      id: 'files',
      label: t('agents:detail.configShell.files'),
      description: t('agents:detail.configShell.filesDesc'),
      content: <AgentFilesTab agentId={agent.id} agentKey={agent.agent_key} agentType={agent.agent_type} />,
    })

    return configSections
  }, [agent, allCaps, globalProvider, isPredefined, s, t, ttsParams, ttsVoiceId])

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-surface-primary">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-surface-secondary shrink-0">
        <button onClick={onClose} className="p-1 rounded hover:bg-surface-tertiary transition-colors" title="Back">
          <svg className="w-5 h-5 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-xl shrink-0">
          {s.emoji || '🤖'}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-text-primary truncate">
            {s.displayName || agent.agent_key}
          </h2>
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${s.status === 'active' ? 'bg-success' : s.status === 'summon_failed' ? 'bg-error' : 'bg-text-muted/50'}`} />
            <span className="text-[11px] text-text-muted font-mono">{agent.agent_key}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-tertiary text-text-muted">{agent.agent_type}</span>
            {isDirty && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/10 text-warning">
                {t('agents:detail.configShell.unsaved')}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setConfirmResummon(true)}
          className="px-3 py-1.5 text-xs border border-border rounded-lg text-text-secondary hover:bg-surface-tertiary transition-colors flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M3 21v-5h5" />
          </svg>
          {t('agents:files.resummon')}
        </button>
      </div>

      <AgentConfigShell sections={sections} activeSection={activeSection} onSectionChange={setActiveSection} />

      {(activeSection !== 'files' || isDirty) && (
        <div className="shrink-0 border-t border-border bg-surface-secondary/80 backdrop-blur-sm px-4 py-3">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div className="flex-1">
              {s.saveError ? (
                <p className="text-xs text-error">{s.saveError}</p>
              ) : isDirty ? (
                <p className="text-xs text-warning">{t('agents:detail.configShell.unsavedHint')}</p>
              ) : (
                <p className="text-xs text-text-muted">{t('agents:detail.configShell.noChanges')}</p>
              )}
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <button onClick={onClose} className="px-4 py-2 text-xs border border-border rounded-lg text-text-secondary hover:bg-surface-tertiary transition-colors">
                {t('common:cancel')}
              </button>
              <button
                onClick={s.handleSave}
                disabled={s.saving || s.saveBlocked || !isDirty}
                className="px-5 py-2 text-xs bg-accent text-white rounded-lg font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {s.saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {s.saving ? t('common:saving') : s.saveBlocked ? t('agents:create.check') : t('common:saveChanges')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resummon confirm */}
      <ConfirmDialog
        open={confirmResummon}
        onOpenChange={setConfirmResummon}
        title={t('agents:files.resummonTitle')}
        description={t('agents:files.resummonDesc')}
        confirmLabel={t('agents:files.resummonConfirm')}
        variant="default"
        onConfirm={handleConfirmResummon}
      />
    </div>
  )
}
