import type { ReactNode } from 'react'

export interface AgentConfigSection {
  id: string
  label: string
  description: string
  dirty?: boolean
  content: ReactNode
}

interface AgentConfigShellProps {
  sections: AgentConfigSection[]
  activeSection: string
  onSectionChange: (section: string) => void
}

export function AgentConfigShell({ sections, activeSection, onSectionChange }: AgentConfigShellProps) {
  const active = sections.find((section) => section.id === activeSection) ?? sections[0]

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-surface-secondary/70 p-3 md:block">
        <nav className="space-y-1" aria-label="Agent configuration">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => onSectionChange(section.id)}
              className={[
                'group flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left transition-colors',
                active.id === section.id
                  ? 'bg-accent/10 text-accent'
                  : 'text-text-secondary hover:bg-surface-tertiary hover:text-text-primary',
              ].join(' ')}
            >
              <span className={[
                'mt-1 h-1.5 w-1.5 shrink-0 rounded-full',
                section.dirty ? 'bg-warning' : active.id === section.id ? 'bg-accent' : 'bg-transparent group-hover:bg-text-muted/40',
              ].join(' ')} />
              <span className="min-w-0">
                <span className="block text-xs font-medium">{section.label}</span>
                <span className="mt-0.5 block text-[10px] leading-snug text-text-muted">{section.description}</span>
              </span>
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-border bg-surface-secondary px-4 py-2 md:hidden">
          <select
            value={active.id}
            onChange={(event) => onSectionChange(event.target.value)}
            className="w-full rounded-lg border border-border bg-surface-tertiary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
            aria-label="Agent configuration section"
          >
            {sections.map((section) => (
              <option key={section.id} value={section.id}>{section.label}</option>
            ))}
          </select>
        </div>
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="mx-auto max-w-3xl px-4 py-6">
            <div className="mb-5 space-y-1">
              <h3 className="text-base font-semibold text-text-primary">{active.label}</h3>
              <p className="text-xs text-text-muted">{active.description}</p>
            </div>
            {active.content}
          </div>
        </main>
      </div>
    </div>
  )
}
