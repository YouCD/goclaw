import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { approvalService } from '../../services/approval-service'
import { toast } from '../../stores/toast-store'
import type { PendingApproval } from '../../types/approval'

function formatApprovalTime(value: number): string {
  if (!value) return ''
  return new Date(value).toLocaleString()
}

export function ApprovalsTab() {
  const { t } = useTranslation(['desktop', 'common'])
  const [pending, setPending] = useState<PendingApproval[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await approvalService.list()
      setPending(res.pending ?? [])
    } catch (err) {
      toast.error(t('settings.approvals.loadFailed'), (err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { void load() }, [load])

  async function resolve(id: string, action: 'once' | 'always' | 'deny') {
    setBusyId(id)
    try {
      if (action === 'deny') await approvalService.deny(id)
      else await approvalService.approve(id, action === 'always')
      setPending((items) => items.filter((item) => item.id !== id))
      toast.success(action === 'deny' ? t('settings.approvals.denied') : t('settings.approvals.approved'))
    } catch (err) {
      toast.error(t('settings.approvals.resolveFailed'), (err as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">{t('settings.approvals.title')}</h2>
          <p className="mt-0.5 text-xs text-text-muted">{t('settings.approvals.description')}</p>
        </div>
        <button type="button" onClick={load} className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-tertiary">
          {t('refresh', { ns: 'common' })}
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((idx) => <div key={idx} className="h-20 animate-pulse rounded-lg bg-surface-tertiary/50" />)}
        </div>
      ) : pending.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm font-medium text-text-primary">{t('settings.approvals.emptyTitle')}</p>
          <p className="mt-1 text-xs text-text-muted">{t('settings.approvals.emptyDescription')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pending.map((approval) => (
            <div key={approval.id} className="rounded-lg border border-border bg-surface-secondary p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-text-muted">{approval.agentId} · {formatApprovalTime(approval.createdAt)}</p>
                  <pre className="mt-2 max-h-32 overflow-auto rounded-md bg-surface-tertiary p-3 text-xs text-text-primary">{approval.command}</pre>
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  <button disabled={busyId === approval.id} onClick={() => resolve(approval.id, 'once')} className="rounded-lg bg-accent px-3 py-1.5 text-xs text-white hover:bg-accent-hover disabled:opacity-50">
                    {t('settings.approvals.allowOnce')}
                  </button>
                  <button disabled={busyId === approval.id} onClick={() => resolve(approval.id, 'always')} className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-tertiary disabled:opacity-50">
                    {t('settings.approvals.allowAlways')}
                  </button>
                  <button disabled={busyId === approval.id} onClick={() => resolve(approval.id, 'deny')} className="rounded-lg border border-border px-3 py-1.5 text-xs text-error hover:bg-error/10 disabled:opacity-50">
                    {t('settings.approvals.deny')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
