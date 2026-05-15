import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { apiKeyService, credentialService, type GatewayApiKey, type SecureCliCredential } from '../../services/credential-service'
import { toast } from '../../stores/toast-store'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { ActionButton, Field, SettingsCard, TextInput } from './settings-form-controls'

export function CredentialsTab() {
  const { t } = useTranslation('desktop')
  const [apiKeys, setApiKeys] = useState<GatewayApiKey[]>([])
  const [cliCredentials, setCliCredentials] = useState<SecureCliCredential[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'api' | 'cli'; id: string; label: string } | null>(null)
  const [oneTimeKey, setOneTimeKey] = useState('')
  const [apiForm, setApiForm] = useState({ name: '', scopes: 'operator.admin' })
  const [cliForm, setCliForm] = useState({ binaryName: '', binaryPath: '', description: '', envKey: '', envValue: '' })

  useEffect(() => { void loadCredentials() }, [])

  async function loadCredentials() {
    setLoading(true)
    try {
      const [keys, cli] = await Promise.all([apiKeyService.list(), credentialService.list()])
      setApiKeys(keys)
      setCliCredentials(cli)
    } catch (err) {
      toast.error(t('settings.credentials.loadFailed'), err instanceof Error ? err.message : undefined)
    } finally {
      setLoading(false)
    }
  }

  async function createApiKey() {
    const scopes = csv(apiForm.scopes)
    if (!apiForm.name.trim() || scopes.length === 0) return
    setSaving(true)
    try {
      const created = await apiKeyService.create({ name: apiForm.name.trim(), scopes })
      setOneTimeKey(created.key)
      setApiForm({ name: '', scopes: 'operator.admin' })
      await loadCredentials()
    } catch (err) {
      toast.error(t('toast.createFailed'), err instanceof Error ? err.message : undefined)
    } finally {
      setSaving(false)
    }
  }

  async function createCliCredential() {
    if (!cliForm.binaryName.trim() || !cliForm.envKey.trim() || !cliForm.envValue) return
    setSaving(true)
    try {
      await credentialService.create({
        binary_name: cliForm.binaryName.trim(),
        binary_path: cliForm.binaryPath.trim() || undefined,
        description: cliForm.description.trim(),
        env: { [cliForm.envKey.trim()]: cliForm.envValue },
        enabled: true,
        is_global: true,
      })
      setCliForm({ binaryName: '', binaryPath: '', description: '', envKey: '', envValue: '' })
      await loadCredentials()
      toast.success(t('settings.credentials.created'))
    } catch (err) {
      toast.error(t('toast.createFailed'), err instanceof Error ? err.message : undefined)
    } finally {
      setSaving(false)
    }
  }

  async function toggleCli(credential: SecureCliCredential) {
    try {
      await credentialService.update(credential.id, { enabled: !credential.enabled })
      await loadCredentials()
    } catch (err) {
      toast.error(t('toast.saveFailed'), err instanceof Error ? err.message : undefined)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      if (deleteTarget.type === 'api') await apiKeyService.revoke(deleteTarget.id)
      else await credentialService.delete(deleteTarget.id)
      await loadCredentials()
      toast.success(t('settings.credentials.deleted'))
    } catch (err) {
      toast.error(t('toast.deleteFailed'), err instanceof Error ? err.message : undefined)
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <div className="grid gap-4 pb-8">
      <header>
        <h2 className="text-sm font-semibold text-text-primary">{t('settings.credentials.title')}</h2>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-text-muted">{t('settings.credentials.description')}</p>
      </header>
      {loading ? <p className="py-4 text-xs text-text-muted">{t('settings.general.loading')}</p> : (
        <>
          <SettingsCard title={t('settings.credentials.apiKeys')} description={t('settings.credentials.apiDesc')}>
            {oneTimeKey && (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
                <p className="text-xs font-medium text-amber-200">{t('settings.credentials.copyNow')}</p>
                <code className="mt-2 block break-all rounded bg-surface-primary p-2 text-[11px] text-text-primary">{oneTimeKey}</code>
                <ActionButton className="mt-2" onClick={() => navigator.clipboard?.writeText(oneTimeKey)}>{t('settings.credentials.copy')}</ActionButton>
              </div>
            )}
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <Field label={t('settings.credentials.keyName')}><TextInput value={apiForm.name} onChange={(e) => setApiForm({ ...apiForm, name: e.target.value })} /></Field>
              <Field label={t('settings.credentials.scopes')} hint={t('settings.general.csvHint')}><TextInput value={apiForm.scopes} onChange={(e) => setApiForm({ ...apiForm, scopes: e.target.value })} /></Field>
              <ActionButton variant="primary" className="self-end" disabled={saving || !apiForm.name.trim()} onClick={createApiKey}>{t('settings.credentials.create')}</ActionButton>
            </div>
            <CredentialList empty={t('settings.credentials.noApiKeys')}>
              {apiKeys.map((key) => (
                <Row key={key.id} title={key.name} meta={`${key.prefix} · ${key.scopes.join(', ')}`} disabled={key.revoked} deleteLabel={t('settings.credentials.revoke')} onDelete={() => setDeleteTarget({ type: 'api', id: key.id, label: key.name })} />
              ))}
            </CredentialList>
          </SettingsCard>

          <SettingsCard title={t('settings.credentials.cliCredentials')} description={t('settings.credentials.cliDesc')}>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label={t('settings.credentials.binaryName')}><TextInput value={cliForm.binaryName} onChange={(e) => setCliForm({ ...cliForm, binaryName: e.target.value })} /></Field>
              <Field label={t('settings.credentials.binaryPath')}><TextInput value={cliForm.binaryPath} onChange={(e) => setCliForm({ ...cliForm, binaryPath: e.target.value })} /></Field>
              <Field label={t('settings.credentials.envKey')}><TextInput value={cliForm.envKey} onChange={(e) => setCliForm({ ...cliForm, envKey: e.target.value })} /></Field>
              <Field label={t('settings.credentials.envValue')}><TextInput type="password" value={cliForm.envValue} onChange={(e) => setCliForm({ ...cliForm, envValue: e.target.value })} /></Field>
              <Field label={t('settings.credentials.descriptionField')}><TextInput value={cliForm.description} onChange={(e) => setCliForm({ ...cliForm, description: e.target.value })} /></Field>
              <ActionButton variant="primary" className="self-end" disabled={saving || !cliForm.binaryName.trim() || !cliForm.envKey.trim() || !cliForm.envValue} onClick={createCliCredential}>{t('settings.credentials.create')}</ActionButton>
            </div>
            <CredentialList empty={t('settings.credentials.noCliCredentials')}>
              {cliCredentials.map((item) => (
                <Row
                  key={item.id}
                  title={item.binary_name}
                  meta={`${item.env_keys?.join(', ') || t('settings.credentials.noEnvKeys')} · ${item.enabled ? t('settings.credentials.enabled') : t('settings.credentials.disabled')}`}
                  disabled={!item.enabled}
                  toggleLabel={item.enabled ? t('settings.credentials.disable') : t('settings.credentials.enable')}
                  deleteLabel={t('settings.credentials.delete')}
                  onToggle={() => toggleCli(item)}
                  onDelete={() => setDeleteTarget({ type: 'cli', id: item.id, label: item.binary_name })}
                />
              ))}
            </CredentialList>
          </SettingsCard>
        </>
      )}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        title={t('settings.credentials.deleteTitle')}
        description={t('settings.credentials.deleteDescription', { name: deleteTarget?.label ?? '' })}
        confirmLabel={t('settings.credentials.deleteConfirm')}
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  )
}

function CredentialList({ empty, children }: { empty: string; children: ReactNode }) {
  return <div className="grid gap-2">{Array.isArray(children) && children.length === 0 ? <p className="text-xs text-text-muted">{empty}</p> : children}</div>
}

function Row({ title, meta, disabled, toggleLabel, deleteLabel = 'Delete', onToggle, onDelete }: { title: string; meta: string; disabled?: boolean; toggleLabel?: string; deleteLabel?: string; onToggle?: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-primary px-3 py-2">
      <div className={disabled ? 'opacity-60' : ''}>
        <p className="text-xs font-medium text-text-primary">{title}</p>
        <p className="mt-0.5 text-[11px] text-text-muted">{meta}</p>
      </div>
      <div className="flex items-center gap-2">
        {onToggle && <ActionButton onClick={onToggle}>{toggleLabel}</ActionButton>}
        <ActionButton variant="danger" onClick={onDelete}>{deleteLabel}</ActionButton>
      </div>
    </div>
  )
}

function csv(value: string): string[] {
  return value.split(',').map((item) => item.trim()).filter(Boolean)
}
