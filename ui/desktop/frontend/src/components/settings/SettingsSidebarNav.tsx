import { useTranslation } from 'react-i18next'
import type { SettingsTab } from '../../stores/ui-store'
import { SETTINGS_GROUPS, visibleSettingsSections, type SettingsIconKey } from './settings-sections'

interface SettingsSidebarNavProps {
  activeTab: SettingsTab
  onTabChange: (tab: SettingsTab) => void
}

export function SettingsSidebarNav({ activeTab, onTabChange }: SettingsSidebarNavProps) {
  const { t } = useTranslation('desktop')
  const sections = visibleSettingsSections()

  return (
    <nav className="w-56 shrink-0 border-r border-border bg-surface-secondary/60 px-3 py-4 overflow-y-auto">
      <div className="space-y-5">
        {SETTINGS_GROUPS.map((group) => {
          const groupSections = sections.filter((section) => section.group === group.id)
          if (groupSections.length === 0) return null
          return (
            <section key={group.id} className="space-y-1">
              <h2 className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                {t(group.labelKey)}
              </h2>
              {groupSections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => onTabChange(section.id)}
                  className={[
                    'w-full min-h-8 rounded-md px-2 py-1.5 text-left text-xs transition-colors',
                    'flex items-center gap-2',
                    activeTab === section.id
                      ? 'bg-accent/12 text-accent'
                      : 'text-text-secondary hover:bg-surface-tertiary hover:text-text-primary',
                  ].join(' ')}
                >
                  <SettingsIcon icon={section.icon} />
                  <span className="min-w-0 flex-1 truncate font-medium">{t(section.labelKey)}</span>
                  {section.status === 'deferred' && (
                    <span className="rounded bg-surface-tertiary px-1.5 py-0.5 text-[9px] font-medium text-text-muted">
                      {t('settings.status.soon')}
                    </span>
                  )}
                </button>
              ))}
            </section>
          )
        })}
      </div>
    </nav>
  )
}

function SettingsIcon({ icon }: { icon: SettingsIconKey }) {
  const common = { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (icon) {
    case 'sun': return <svg {...common}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
    case 'cpu': return <svg {...common}><rect x="7" y="7" width="10" height="10" rx="2" /><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3" /></svg>
    case 'bot': return <svg {...common}><rect x="5" y="8" width="14" height="10" rx="2" /><path d="M12 4v4M9 13h.01M15 13h.01" /></svg>
    case 'plug': return <svg {...common}><path d="M12 22v-5M9 8V2M15 8V2M6 8h12v4a6 6 0 0 1-12 0z" /></svg>
    case 'spark': return <svg {...common}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM5 17l.7 2.3L8 20l-2.3.7L5 23l-.7-2.3L2 20l2.3-.7z" /></svg>
    case 'tool': return <svg {...common}><path d="M14.7 6.3a4 4 0 0 0-5 5L3 18v3h3l6.7-6.7a4 4 0 0 0 5-5l-2.4 2.4-3-3z" /></svg>
    case 'key': return <svg {...common}><circle cx="7.5" cy="14.5" r="3.5" /><path d="M10 12l8-8M15 7l2 2M13 9l2 2" /></svg>
    case 'clock': return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
    case 'check': return <svg {...common}><path d="M20 6L9 17l-5-5" /></svg>
    case 'inbox': return <svg {...common}><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z" /></svg>
    case 'folder': return <svg {...common}><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
    case 'database': return <svg {...common}><ellipse cx="12" cy="5" rx="7" ry="3" /><path d="M5 5v14c0 1.7 3.1 3 7 3s7-1.3 7-3V5M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3" /></svg>
    case 'archive': return <svg {...common}><rect x="3" y="4" width="18" height="4" rx="1" /><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4" /></svg>
    case 'activity': return <svg {...common}><path d="M22 12h-4l-3 8-6-16-3 8H2" /></svg>
    case 'info': return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8h.01" /></svg>
    case 'link': return <svg {...common}><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></svg>
    default: return <svg {...common}><path d="M4 6h16M4 12h16M4 18h16" /></svg>
  }
}
