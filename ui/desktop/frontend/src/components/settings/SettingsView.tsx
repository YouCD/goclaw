import { useTranslation } from 'react-i18next'
import { useUiStore } from '../../stores/ui-store'
import type { SettingsTab } from '../../stores/ui-store'
import { SettingsSidebarNav } from './SettingsSidebarNav'
import { AppearanceTab } from './AppearanceTab'
import { AboutTab } from './AboutTab'
import { findSettingsSection } from './settings-sections'
import { GeneralSettingsTab } from './GeneralSettingsTab'
import { CredentialsTab } from './CredentialsTab'
import { BackupRestoreTab } from './BackupRestoreTab'
import { ProviderList } from '../providers/ProviderList'
import { AgentList } from '../agents/AgentList'
import { McpServerList } from '../mcp/McpServerList'
import { SkillList } from '../skills/SkillList'
import { ToolList } from '../tools/ToolList'
import { CronList } from '../cron/CronList'
import { ApprovalsTab } from '../automation/ApprovalsTab'
import { PendingMessagesTab } from '../automation/PendingMessagesTab'
import { ProjectsTab } from '../projects/ProjectsTab'
import { TraceList } from '../traces/TraceList'
import { StorageTab } from '../storage/StorageTab'

export function SettingsView() {
  const settingsTab = useUiStore((s) => s.settingsTab)
  const setSettingsTab = useUiStore((s) => s.setSettingsTab)
  const closeSettings = useUiStore((s) => s.closeSettings)
  const section = findSettingsSection(settingsTab)
  const { t } = useTranslation('desktop')

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <h1 className="text-sm font-semibold text-text-primary">{t('settings.title')}</h1>
          <p className="mt-0.5 text-xs text-text-muted">{section ? t(section.labelKey) : settingsTab}</p>
        </div>
        <button
          onClick={closeSettings}
          className="w-6 h-6 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-surface-tertiary transition-colors"
          title="Close settings (Esc)"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        <SettingsSidebarNav activeTab={settingsTab} onTabChange={setSettingsTab} />
        {settingsTab === 'storage' ? (
          <div className="flex-1 flex flex-col min-w-0 min-h-0 px-5 py-5 canvas-dots">
            <TabContent tab={settingsTab} />
          </div>
        ) : (
          <div className="flex-1 min-w-0 overflow-y-auto overscroll-contain px-5 py-5 canvas-dots">
            <TabContent tab={settingsTab} />
          </div>
        )}
      </div>
    </div>
  )
}

function TabContent({ tab }: { tab: SettingsTab }) {
  switch (tab) {
    case 'general': return <GeneralSettingsTab />
    case 'appearance': return <AppearanceTab />
    case 'providers': return <ProviderList />
    case 'agents': return <AgentList />
    case 'channels': return <PlaceholderSection tab={tab} />
    case 'mcp': return <McpServerList />
    case 'skills': return <SkillList />
    case 'tools': return <ToolList />
    case 'credentials': return <CredentialsTab />
    case 'cron': return <CronList />
    case 'approvals': return <ApprovalsTab />
    case 'pending': return <PendingMessagesTab />
    case 'projects': return <ProjectsTab />
    case 'traces': return <TraceList />
    case 'storage': return <StorageTab />
    case 'backup': return <BackupRestoreTab />
    case 'about': return <AboutTab />
  }
}

function PlaceholderSection({ tab }: { tab: SettingsTab }) {
  const section = findSettingsSection(tab)
  const { t } = useTranslation('desktop')
  return (
    <div className="flex min-h-[320px] flex-col justify-center">
      <div className="max-w-md">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{t('settings.status.soon')}</p>
        <h2 className="mt-2 text-xl font-semibold text-text-primary">{section ? t(section.labelKey) : tab}</h2>
        <p className="mt-2 text-sm leading-6 text-text-secondary">
          {t('settings.deferredDescription')}
        </p>
      </div>
    </div>
  )
}
