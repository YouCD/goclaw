import '../../i18n'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useUiStore } from '../../stores/ui-store'
import { SettingsView } from './SettingsView'

vi.mock('./GeneralSettingsTab', () => ({ GeneralSettingsTab: () => <div>General settings content</div> }))
vi.mock('./CredentialsTab', () => ({ CredentialsTab: () => <div>Credentials content</div> }))
vi.mock('./BackupRestoreTab', () => ({ BackupRestoreTab: () => <div>Backup content</div> }))
vi.mock('./AppearanceTab', () => ({ AppearanceTab: () => <div>Appearance content</div> }))
vi.mock('./AboutTab', () => ({ AboutTab: () => <div>About content</div> }))
vi.mock('../providers/ProviderList', () => ({ ProviderList: () => <div>Providers content</div> }))
vi.mock('../agents/AgentList', () => ({ AgentList: () => <div>Agents content</div> }))
vi.mock('../mcp/McpServerList', () => ({ McpServerList: () => <div>MCP content</div> }))
vi.mock('../skills/SkillList', () => ({ SkillList: () => <div>Skills content</div> }))
vi.mock('../tools/ToolList', () => ({ ToolList: () => <div>Tools content</div> }))
vi.mock('../cron/CronList', () => ({ CronList: () => <div>Cron content</div> }))
vi.mock('../automation/ApprovalsTab', () => ({ ApprovalsTab: () => <div>Approvals content</div> }))
vi.mock('../automation/PendingMessagesTab', () => ({ PendingMessagesTab: () => <div>Pending content</div> }))
vi.mock('../projects/ProjectsTab', () => ({ ProjectsTab: () => <div>Projects content</div> }))
vi.mock('../traces/TraceList', () => ({ TraceList: () => <div>Traces content</div> }))
vi.mock('../storage/StorageTab', () => ({ StorageTab: () => <div>Storage content</div> }))

describe('SettingsView', () => {
  beforeEach(() => {
    useUiStore.setState({ activeView: 'settings', settingsTab: 'general' })
  })

  it('renders grouped sidebar navigation without visible Channels', () => {
    render(<SettingsView />)

    for (const label of ['Core', 'AI', 'Tools', 'Automation', 'Workspace', 'Diagnostics']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
    expect(screen.queryByRole('button', { name: /channels/i })).not.toBeInTheDocument()
  })

  it('keeps openSettings compatibility for existing sections', () => {
    useUiStore.getState().openSettings('providers')
    render(<SettingsView />)

    expect(screen.getByText('Providers content')).toBeInTheDocument()
  })

  it('renders Phase 06 settings sections as real content', () => {
    render(<SettingsView />)
    expect(screen.getByText('General settings content')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /credentials/i }))
    expect(screen.getByText('Credentials content')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /backup/i }))
    expect(screen.getByText('Backup content')).toBeInTheDocument()
  })

  it('renders Phase 07 workspace and automation sections as real content', () => {
    render(<SettingsView />)

    fireEvent.click(screen.getByRole('button', { name: /projects/i }))
    expect(screen.getByText('Projects content')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /approvals/i }))
    expect(screen.getByText('Approvals content')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /pending/i }))
    expect(screen.getByText('Pending content')).toBeInTheDocument()
  })

  it('keeps hidden Channels out of management UI for existing callers', () => {
    useUiStore.getState().openSettings('channels')
    render(<SettingsView />)

    expect(screen.getByText('Appearance content')).toBeInTheDocument()
    expect(screen.queryByText('Channels content')).not.toBeInTheDocument()
    expect(screen.queryByText('Channels')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /channels/i })).not.toBeInTheDocument()
  })

  it('navigates to grouped sections from the sidebar', async () => {
    render(<SettingsView />)

    fireEvent.click(screen.getByRole('button', { name: /providers/i }))
    expect(screen.getByText('Providers content')).toBeInTheDocument()
  })
})
