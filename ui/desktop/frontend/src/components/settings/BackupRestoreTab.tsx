import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { downloadBackup, getBackupPreflight, startBackup, startRestore, type BackupPreflight, type ProgressEvent } from '../../services/backup-service'
import { toast } from '../../stores/toast-store'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { ActionButton, SettingsCard } from './settings-form-controls'

interface LogEntry {
  event: string
  detail: string
}

export function BackupRestoreTab() {
  const { t } = useTranslation('desktop')
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [preflight, setPreflight] = useState<BackupPreflight | null>(null)
  const [busy, setBusy] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [downloadUrl, setDownloadUrl] = useState('')
  const [downloadName, setDownloadName] = useState('goclaw-backup.tar.gz')
  const [archive, setArchive] = useState<File | null>(null)
  const [validatedArchiveKey, setValidatedArchiveKey] = useState('')
  const [dryRunToken, setDryRunToken] = useState('')
  const [restoreConfirm, setRestoreConfirm] = useState(false)
  const archiveKey = archive ? `${archive.name}:${archive.size}:${archive.lastModified}` : ''

  useEffect(() => { void refreshPreflight() }, [])

  async function refreshPreflight() {
    try {
      setPreflight(await getBackupPreflight())
    } catch (err) {
      toast.error(t('settings.backup.preflightFailed'), err instanceof Error ? err.message : undefined)
    }
  }

  function onProgress(event: string, payload: ProgressEvent) {
    const detail = payload.detail || payload.phase || payload.status || event
    setLogs((current) => [...current.slice(-15), { event, detail }])
    if (payload.download_url) setDownloadUrl(payload.download_url)
    if (payload.file_name) setDownloadName(payload.file_name)
    if (payload.dry_run_token) setDryRunToken(payload.dry_run_token)
  }

  async function runBackup() {
    setBusy(true)
    setLogs([])
    setDownloadUrl('')
    try {
      await startBackup(onProgress)
      toast.success(t('settings.backup.backupComplete'))
      await refreshPreflight()
    } catch (err) {
      toast.error(t('settings.backup.backupFailed'), err instanceof Error ? err.message : undefined)
    } finally {
      setBusy(false)
    }
  }

  async function runRestore(dryRun: boolean) {
    if (!archive) return
    if (!dryRun && archiveKey !== validatedArchiveKey) {
      toast.warning(t('settings.backup.dryRunRequired'))
      return
    }
    setBusy(true)
    setLogs([])
    try {
      await startRestore(archive, dryRun, onProgress, dryRun ? undefined : dryRunToken)
      if (dryRun) setValidatedArchiveKey(archiveKey)
      toast.success(dryRun ? t('settings.backup.dryRunComplete') : t('settings.backup.restoreComplete'))
    } catch (err) {
      toast.error(t('settings.backup.restoreFailed'), err instanceof Error ? err.message : undefined)
    } finally {
      setBusy(false)
      setRestoreConfirm(false)
    }
  }

  async function downloadArtifact() {
    if (!downloadUrl) return
    try {
      const blob = await downloadBackup(downloadUrl)
      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = downloadName
      anchor.click()
      URL.revokeObjectURL(objectUrl)
    } catch (err) {
      toast.error(t('settings.backup.downloadFailed'), err instanceof Error ? err.message : undefined)
    }
  }

  return (
    <div className="grid gap-4 pb-8">
      <header>
        <h2 className="text-sm font-semibold text-text-primary">{t('settings.backup.title')}</h2>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-text-muted">{t('settings.backup.description')}</p>
      </header>

      <SettingsCard title={t('settings.backup.preflight')} description={t('settings.backup.preflightDesc')}>
        <div className="grid gap-2 text-xs text-text-secondary md:grid-cols-2">
          <Metric label={t('settings.backup.dbSize')} value={preflight?.db_size_human ?? '-'} />
          <Metric label={t('settings.backup.dataDirSize')} value={preflight?.data_dir_size_human ?? '-'} />
          <Metric label={t('settings.backup.workspaceSize')} value={preflight?.workspace_size_human ?? '-'} />
          <Metric label={t('settings.backup.freeDisk')} value={preflight?.free_disk_human ?? '-'} />
        </div>
        {preflight?.warnings?.length ? <WarningList warnings={preflight.warnings} /> : null}
        <ActionButton onClick={refreshPreflight} disabled={busy}>{t('settings.backup.refresh')}</ActionButton>
      </SettingsCard>

      <SettingsCard title={t('settings.backup.createTitle')} description={t('settings.backup.createDesc')}>
        <div className="flex flex-wrap items-center gap-2">
          <ActionButton variant="primary" disabled={busy || preflight?.disk_space_ok === false} onClick={runBackup}>
            {busy ? t('settings.backup.running') : t('settings.backup.startBackup')}
          </ActionButton>
          <ActionButton disabled={!downloadUrl || busy} onClick={downloadArtifact}>{t('settings.backup.download')}</ActionButton>
        </div>
      </SettingsCard>

      <SettingsCard title={t('settings.backup.restoreTitle')} description={t('settings.backup.restoreDesc')}>
        <input ref={fileRef} type="file" accept=".tar,.gz,.tgz,.zip,.backup" className="hidden" onChange={(e) => {
          setArchive(e.target.files?.[0] ?? null)
          setValidatedArchiveKey('')
          setDryRunToken('')
        }} />
        <div className="flex flex-wrap items-center gap-2">
          <ActionButton onClick={() => fileRef.current?.click()} disabled={busy}>{archive ? archive.name : t('settings.backup.chooseArchive')}</ActionButton>
          <ActionButton disabled={!archive || busy} onClick={() => runRestore(true)}>{t('settings.backup.dryRun')}</ActionButton>
          <ActionButton variant="danger" disabled={!archive || busy || archiveKey !== validatedArchiveKey || !dryRunToken} onClick={() => setRestoreConfirm(true)}>{t('settings.backup.restore')}</ActionButton>
        </div>
        <p className="text-[11px] leading-4 text-text-muted">{t('settings.backup.v3Unsupported')}</p>
      </SettingsCard>

      {logs.length > 0 && (
        <section className="rounded-lg border border-border bg-surface-secondary/70 p-4">
          <h3 className="text-sm font-semibold text-text-primary">{t('settings.backup.progress')}</h3>
          <div className="mt-3 grid gap-1 text-[11px] text-text-secondary">
            {logs.map((log, index) => <p key={`${log.event}-${index}`}><span className="text-text-muted">{log.event}</span> {log.detail}</p>)}
          </div>
        </section>
      )}

      <ConfirmDialog
        open={restoreConfirm}
        onOpenChange={setRestoreConfirm}
        title={t('settings.backup.restoreConfirmTitle')}
        description={t('settings.backup.restoreConfirmDesc')}
        confirmLabel={t('settings.backup.restore')}
        variant="destructive"
        onConfirm={() => runRestore(false)}
      />
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-border bg-surface-primary px-3 py-2"><span className="text-text-muted">{label}</span><span className="ml-2 font-medium text-text-primary">{value}</span></div>
}

function WarningList({ warnings }: { warnings: string[] }) {
  return <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100">{warnings.map((warning) => <p key={warning}>{warning}</p>)}</div>
}
