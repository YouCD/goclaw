import type { Project, ProjectMetadata } from '../../types/project'

export function projectTitle(project: Project): string {
  return project.metadata?.displayName || project.slug
}

export function defaultProjectId(projects: Project[]): string | null {
  const active = projects.filter((project) => project.status === 'active')
  const explicit = active
    .filter((project) => project.metadata?.desktopDefault === true)
    .sort((left, right) => String(right.metadata?.desktopDefaultAt ?? '').localeCompare(String(left.metadata?.desktopDefaultAt ?? '')))
  return explicit[0]?.id ?? active[0]?.id ?? null
}

export function projectMetadata(project: Project, patch: ProjectMetadata): ProjectMetadata {
  return { ...(project.metadata ?? {}), ...patch }
}
