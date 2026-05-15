import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { slugify } from '../../lib/slug'
import type { ProjectInput } from '../../types/project'

interface ProjectFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (input: ProjectInput) => Promise<unknown>
}

export function ProjectFormDialog({ open, onOpenChange, onSubmit }: ProjectFormDialogProps) {
  const { t } = useTranslation(['desktop', 'common'])
  const [slug, setSlug] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setSlug('')
    setDisplayName('')
    setDescription('')
  }, [open])

  if (!open) return null

  const canSubmit = slug.length >= 3

  async function submit() {
    if (!canSubmit) return
    setSaving(true)
    try {
      await onSubmit({
        slug,
        metadata: {
          displayName: displayName.trim() || undefined,
          description: description.trim() || undefined,
        },
      })
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      <div className="relative w-full max-w-md overflow-hidden rounded-xl border border-border bg-surface-secondary">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-text-primary">{t('settings.projects.createTitle')}</h2>
        </div>
        <div className="space-y-4 p-5">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-text-secondary">{t('settings.projects.slug')}</span>
            <input
              value={slug}
              onChange={(event) => setSlug(slugify(event.target.value))}
              placeholder="client-portal"
              className="w-full rounded-lg border border-border bg-surface-tertiary px-3 py-2 text-base text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent md:text-sm"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-text-secondary">{t('settings.projects.displayName')}</span>
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="w-full rounded-lg border border-border bg-surface-tertiary px-3 py-2 text-base text-text-primary focus:outline-none focus:ring-1 focus:ring-accent md:text-sm"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-text-secondary">{t('settings.projects.descriptionField')}</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-border bg-surface-tertiary px-3 py-2 text-base text-text-primary focus:outline-none focus:ring-1 focus:ring-accent md:text-sm"
            />
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <button type="button" onClick={() => onOpenChange(false)} className="rounded-lg border border-border px-4 py-1.5 text-sm text-text-secondary hover:bg-surface-tertiary">
            {t('cancel', { ns: 'common' })}
          </button>
          <button type="button" onClick={submit} disabled={!canSubmit || saving} className="rounded-lg bg-accent px-4 py-1.5 text-sm text-white hover:bg-accent-hover disabled:opacity-50">
            {saving ? t('saving', { ns: 'common' }) : t('settings.projects.create')}
          </button>
        </div>
      </div>
    </div>
  )
}
