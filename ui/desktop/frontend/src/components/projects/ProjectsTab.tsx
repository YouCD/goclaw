import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { projectService } from '../../services/project-service'
import { toast } from '../../stores/toast-store'
import type { Project } from '../../types/project'
import { ProjectFormDialog } from './project-form-dialog'
import { defaultProjectId, projectMetadata, projectTitle } from './project-default'

export function ProjectsTab() {
  const { t } = useTranslation(['desktop', 'common'])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await projectService.list({ status: 'active' })
      setProjects(res.projects ?? [])
    } catch (err) {
      toast.error(t('settings.projects.loadFailed'), (err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { void load() }, [load])

  const currentDefaultId = useMemo(() => defaultProjectId(projects), [projects])

  async function createProject(input: Parameters<typeof projectService.create>[0]) {
    await projectService.create(input)
    toast.success(t('settings.projects.created'))
    await load()
  }

  async function setDefault(project: Project) {
    setBusyId(project.id)
    try {
      await projectService.updateMetadata(project.id, projectMetadata(project, {
        desktopDefault: true,
        desktopDefaultAt: new Date().toISOString(),
      }))
      toast.success(t('settings.projects.defaultSaved'))
      await load()
    } catch (err) {
      toast.error(t('settings.projects.defaultFailed'), (err as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  async function archive(project: Project) {
    setBusyId(project.id)
    try {
      await projectService.archive(project.id)
      toast.success(t('settings.projects.archived'))
      await load()
    } catch (err) {
      toast.error(t('settings.projects.archiveFailed'), (err as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">{t('settings.projects.title')}</h2>
          <p className="mt-0.5 text-xs text-text-muted">{t('settings.projects.description')}</p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs text-white transition-colors hover:bg-accent-hover"
        >
          <span className="text-sm leading-none">+</span>
          {t('settings.projects.create')}
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((idx) => <div key={idx} className="h-16 animate-pulse rounded-lg bg-surface-tertiary/50" />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm font-medium text-text-primary">{t('settings.projects.emptyTitle')}</p>
          <p className="mt-1 text-xs text-text-muted">{t('settings.projects.emptyDescription')}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          {projects.map((project) => {
            const isDefault = project.id === currentDefaultId
            return (
              <div key={project.id} className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-medium text-text-primary">{projectTitle(project)}</h3>
                    {isDefault && <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">{t('default', { ns: 'common' })}</span>}
                  </div>
                  <p className="mt-1 text-xs text-text-muted">{project.slug}</p>
                  {project.metadata?.description && <p className="mt-1 line-clamp-2 text-xs text-text-secondary">{project.metadata.description}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDefault(project)}
                    disabled={isDefault || busyId === project.id}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary transition-colors hover:bg-surface-tertiary disabled:opacity-50"
                  >
                    {t('settings.projects.setDefault')}
                  </button>
                  <button
                    type="button"
                    onClick={() => archive(project)}
                    disabled={busyId === project.id}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs text-error transition-colors hover:bg-error/10 disabled:opacity-50"
                  >
                    {t('delete', { ns: 'common' })}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ProjectFormDialog open={createOpen} onOpenChange={setCreateOpen} onSubmit={createProject} />
    </div>
  )
}
