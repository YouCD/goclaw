import type { SettingsTab } from '../../stores/ui-store'

export type SettingsGroupId = 'core' | 'ai' | 'tools' | 'automation' | 'workspace' | 'diagnostics'
export type SettingsIconKey =
  | 'sliders'
  | 'sun'
  | 'cpu'
  | 'bot'
  | 'plug'
  | 'spark'
  | 'tool'
  | 'key'
  | 'clock'
  | 'check'
  | 'inbox'
  | 'folder'
  | 'database'
  | 'archive'
  | 'activity'
  | 'info'
  | 'link'

export interface SettingsGroup {
  id: SettingsGroupId
  labelKey: string
}

export interface SettingsSection {
  id: SettingsTab
  group: SettingsGroupId
  labelKey: string
  icon: SettingsIconKey
  status?: 'deferred' | 'hidden'
}

export const SETTINGS_GROUPS: SettingsGroup[] = [
  { id: 'core', labelKey: 'settings.groups.core' },
  { id: 'ai', labelKey: 'settings.groups.ai' },
  { id: 'tools', labelKey: 'settings.groups.tools' },
  { id: 'automation', labelKey: 'settings.groups.automation' },
  { id: 'workspace', labelKey: 'settings.groups.workspace' },
  { id: 'diagnostics', labelKey: 'settings.groups.diagnostics' },
]

export const SETTINGS_SECTIONS: SettingsSection[] = [
  { id: 'general', group: 'core', labelKey: 'settings.sections.general', icon: 'sliders' },
  { id: 'appearance', group: 'core', labelKey: 'settings.sections.appearance', icon: 'sun' },
  { id: 'providers', group: 'ai', labelKey: 'settings.sections.providers', icon: 'cpu' },
  { id: 'agents', group: 'ai', labelKey: 'settings.sections.agents', icon: 'bot' },
  { id: 'mcp', group: 'tools', labelKey: 'settings.sections.mcp', icon: 'plug' },
  { id: 'skills', group: 'tools', labelKey: 'settings.sections.skills', icon: 'spark' },
  { id: 'tools', group: 'tools', labelKey: 'settings.sections.tools', icon: 'tool' },
  { id: 'credentials', group: 'tools', labelKey: 'settings.sections.credentials', icon: 'key' },
  { id: 'cron', group: 'automation', labelKey: 'settings.sections.cron', icon: 'clock' },
  { id: 'approvals', group: 'automation', labelKey: 'settings.sections.approvals', icon: 'check' },
  { id: 'pending', group: 'automation', labelKey: 'settings.sections.pending', icon: 'inbox' },
  { id: 'projects', group: 'workspace', labelKey: 'settings.sections.projects', icon: 'folder' },
  { id: 'storage', group: 'workspace', labelKey: 'settings.sections.storage', icon: 'database' },
  { id: 'backup', group: 'workspace', labelKey: 'settings.sections.backup', icon: 'archive' },
  { id: 'traces', group: 'diagnostics', labelKey: 'settings.sections.traces', icon: 'activity' },
  { id: 'about', group: 'diagnostics', labelKey: 'settings.sections.about', icon: 'info' },
  { id: 'channels', group: 'automation', labelKey: 'settings.sections.channels', icon: 'link', status: 'hidden' },
]

export function visibleSettingsSections(): SettingsSection[] {
  return SETTINGS_SECTIONS.filter((section) => section.status !== 'hidden')
}

export function findSettingsSection(id: SettingsTab): SettingsSection | undefined {
  return SETTINGS_SECTIONS.find((section) => section.id === id)
}
