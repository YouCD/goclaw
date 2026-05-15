import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { projectService } from '../../services/project-service'
import { teamService } from '../../services/team-service'
import type { AgentData } from '../../types/agent'
import type { Project } from '../../types/project'
import type { TeamData } from '../../types/team'
import type { McpScope } from '../../types/mcp'
import { projectTitle } from '../projects/project-default'

interface McpScopeGrantsPickerProps {
  scope: McpScope
  teamId?: string
  projectId?: string
  disabledScope: boolean
  agents: AgentData[]
  onScopeChange: (next: { scope: McpScope; teamId?: string; projectId?: string }) => void
}

const SCOPES: McpScope[] = ['global', 'team', 'project']

export function McpScopeGrantsPicker({
  scope,
  teamId,
  projectId,
  disabledScope,
  agents,
  onScopeChange,
}: McpScopeGrantsPickerProps) {
  const { t } = useTranslation('mcp')
  const [teams, setTeams] = useState<TeamData[]>([])
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      teamService.list().then((res) => res.teams ?? []).catch(() => []),
      projectService.list({ status: 'active' }).then((res) => res.projects ?? []).catch(() => []),
    ]).then(([nextTeams, nextProjects]) => {
      if (cancelled) return
      setTeams(nextTeams)
      setProjects(nextProjects)
    })
    return () => { cancelled = true }
  }, [])

  function setScope(next: McpScope) {
    onScopeChange({
      scope: next,
      teamId: next === 'team' ? teamId : undefined,
      projectId: next === 'project' ? projectId : undefined,
    })
  }

  return (
    <section className="space-y-3 rounded-lg border border-border p-3">
      <div>
        <h3 className="text-xs font-semibold text-text-primary">{t('form.scopeTitle')}</h3>
        <p className="mt-0.5 text-[11px] text-text-muted">{disabledScope ? t('form.scopeLocked') : t(`scope.hints.${scope}`)}</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {SCOPES.map((item) => (
          <button
            key={item}
            type="button"
            disabled={disabledScope}
            onClick={() => setScope(item)}
            className={`rounded-lg border px-3 py-2 text-xs transition-colors disabled:opacity-60 ${scope === item ? 'border-accent bg-accent/10 text-accent' : 'border-border text-text-secondary hover:bg-surface-tertiary'}`}
          >
            {t(`scope.values.${item}`)}
          </button>
        ))}
      </div>
      {scope === 'team' && (
        <select value={teamId ?? ''} disabled={disabledScope} onChange={(event) => onScopeChange({ scope, teamId: event.target.value || undefined })} className="w-full rounded-lg border border-border bg-surface-tertiary px-3 py-2 text-sm text-text-primary">
          <option value="">{t('scope.teamPlaceholder')}</option>
          {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
        </select>
      )}
      {scope === 'project' && (
        <select value={projectId ?? ''} disabled={disabledScope} onChange={(event) => onScopeChange({ scope, projectId: event.target.value || undefined })} className="w-full rounded-lg border border-border bg-surface-tertiary px-3 py-2 text-sm text-text-primary">
          <option value="">{t('scope.projectPlaceholder')}</option>
          {projects.map((project) => <option key={project.id} value={project.id}>{projectTitle(project)}</option>)}
        </select>
      )}
      {!disabledScope && (
        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-xs font-medium text-text-secondary">{t('form.grantsAfterCreate')}</p>
          <p className="text-[11px] text-text-muted">
            {agents.length > 0 ? t('form.grantsAfterCreateHint') : t('form.noAgents')}
          </p>
        </div>
      )}
    </section>
  )
}
