import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { getConfigSnapshot, patchConfig } from '../../services/config-service'
import { toast } from '../../stores/toast-store'
import { ActionButton, Field, SelectInput, SettingsCard, TextInput } from './settings-form-controls'
import { configToDraft, draftToPatch, validateDraft, type ConfigDraft } from './settings-config-draft'

type DraftKey = keyof ConfigDraft

export function GeneralSettingsTab() {
  const { t } = useTranslation('desktop')
  const [draft, setDraft] = useState<ConfigDraft | null>(null)
  const [baseHash, setBaseHash] = useState('')
  const [path, setPath] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const validationKey = useMemo(() => draft ? validateDraft(draft) : null, [draft])

  useEffect(() => { void loadConfig() }, [])

  async function loadConfig() {
    setLoading(true)
    try {
      const snapshot = await getConfigSnapshot()
      setDraft(configToDraft(snapshot.config))
      setBaseHash(snapshot.hash)
      setPath(snapshot.path)
    } catch (err) {
      toast.error(t('toast.saveFailed'), err instanceof Error ? err.message : undefined)
    } finally {
      setLoading(false)
    }
  }

  async function saveConfig() {
    if (!draft || validationKey) return
    setSaving(true)
    try {
      const snapshot = await patchConfig(draftToPatch(draft), baseHash)
      setDraft(configToDraft(snapshot.config))
      setBaseHash(snapshot.hash)
      setPath(snapshot.path)
      toast.success(t('settings.general.saved'))
    } catch (err) {
      toast.error(t('toast.saveFailed'), err instanceof Error ? err.message : undefined)
    } finally {
      setSaving(false)
    }
  }

  function setValue<K extends DraftKey>(key: K, value: ConfigDraft[K]) {
    setDraft((current) => current ? { ...current, [key]: value } : current)
  }

  if (loading || !draft) return <p className="py-4 text-xs text-text-muted">{t('settings.general.loading')}</p>

  return (
    <div className="grid gap-4 pb-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">{t('settings.general.title')}</h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-text-muted">
            {t('settings.general.description')}
          </p>
          {path && <p className="mt-1 text-[11px] text-text-muted">{path}</p>}
        </div>
        <ActionButton variant="primary" onClick={saveConfig} disabled={saving || !!validationKey}>
          {saving ? t('settings.general.saving') : t('settings.general.save')}
        </ActionButton>
      </header>
      {validationKey && <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{t('settings.general.invalid', { field: validationKey })}</p>}

      <SettingsCard title={t('settings.general.runtime')} description={t('settings.general.runtimeDesc')}>
        <TwoCol>
          <NumberField label={t('settings.general.port')} value={draft.port} onChange={(v) => setValue('port', v)} />
          <Field label={t('settings.general.host')}><TextInput value={draft.host} onChange={(e) => setValue('host', e.target.value)} /></Field>
        </TwoCol>
        <Field label={t('settings.general.allowedOrigins')} hint={t('settings.general.csvHint')}>
          <TextInput value={draft.allowedOrigins} onChange={(e) => setValue('allowedOrigins', e.target.value)} />
        </Field>
      </SettingsCard>

      <SettingsCard title={t('settings.general.behavior')} description={t('settings.general.behaviorDesc')}>
        <TwoCol>
          <NumberField label={t('settings.general.maxMessageChars')} value={draft.maxMessageChars} onChange={(v) => setValue('maxMessageChars', v)} />
          <NumberField label={t('settings.general.rateLimitRpm')} value={draft.rateLimitRpm} onChange={(v) => setValue('rateLimitRpm', v)} />
          <Field label={t('settings.general.injectionAction')}>
            <SelectInput value={draft.injectionAction} onChange={(e) => setValue('injectionAction', e.target.value)}>
              {['warn', 'log', 'block', 'off'].map((value) => <option key={value} value={value}>{value}</option>)}
            </SelectInput>
          </Field>
          <NumberField label={t('settings.general.inboundDebounceMs')} value={draft.inboundDebounceMs} onChange={(v) => setValue('inboundDebounceMs', v)} />
          <Field label={t('settings.general.sessionScope')}>
            <SelectInput value={draft.sessionScope} onChange={(e) => setValue('sessionScope', e.target.value)}>
              {['per-sender', 'global'].map((value) => <option key={value} value={value}>{value}</option>)}
            </SelectInput>
          </Field>
          <Field label={t('settings.general.dmScope')}>
            <SelectInput value={draft.dmScope} onChange={(e) => setValue('dmScope', e.target.value)}>
              {['main', 'per-peer', 'per-channel-peer', 'per-account-channel-peer'].map((value) => <option key={value} value={value}>{value}</option>)}
            </SelectInput>
          </Field>
        </TwoCol>
      </SettingsCard>

      <SettingsCard title={t('settings.general.aiDefaults')} description={t('settings.general.aiDefaultsDesc')}>
        <TwoCol>
          <Field label={t('settings.general.provider')}><TextInput value={draft.provider} onChange={(e) => setValue('provider', e.target.value)} /></Field>
          <Field label={t('settings.general.model')}><TextInput value={draft.model} onChange={(e) => setValue('model', e.target.value)} /></Field>
          <NumberField label={t('settings.general.maxTokens')} value={draft.maxTokens} onChange={(v) => setValue('maxTokens', v)} />
          <NumberField label={t('settings.general.temperature')} value={draft.temperature} step={0.1} onChange={(v) => setValue('temperature', v)} />
          <NumberField label={t('settings.general.maxToolIterations')} value={draft.maxToolIterations} onChange={(v) => setValue('maxToolIterations', v)} />
          <NumberField label={t('settings.general.contextWindow')} value={draft.contextWindow} onChange={(v) => setValue('contextWindow', v)} />
        </TwoCol>
        <Field label={t('settings.general.workspace')}><TextInput value={draft.workspace} onChange={(e) => setValue('workspace', e.target.value)} /></Field>
      </SettingsCard>

      <SettingsCard title={t('settings.general.toolsIntegrations')} description={t('settings.general.toolsDesc')}>
        <TwoCol>
          <Field label={t('settings.general.toolsProfile')}><SelectInput value={draft.toolsProfile} onChange={(e) => setValue('toolsProfile', e.target.value)}>{['minimal', 'coding', 'messaging', 'full'].map((value) => <option key={value} value={value}>{value}</option>)}</SelectInput></Field>
          <NumberField label={t('settings.general.toolsRateLimit')} value={draft.toolsRateLimitPerHour} onChange={(v) => setValue('toolsRateLimitPerHour', v)} />
          <Field label={t('settings.general.execSecurity')}><SelectInput value={draft.execSecurity} onChange={(e) => setValue('execSecurity', e.target.value)}>{['deny', 'allowlist', 'full'].map((value) => <option key={value} value={value}>{value}</option>)}</SelectInput></Field>
          <Field label={t('settings.general.execAsk')}><SelectInput value={draft.execAsk} onChange={(e) => setValue('execAsk', e.target.value)}>{['off', 'on-miss', 'always'].map((value) => <option key={value} value={value}>{value}</option>)}</SelectInput></Field>
          <Field label={t('settings.general.webFetchPolicy')}><SelectInput value={draft.webFetchPolicy} onChange={(e) => setValue('webFetchPolicy', e.target.value)}>{['allow_all', 'allowlist'].map((value) => <option key={value} value={value}>{value}</option>)}</SelectInput></Field>
          <Field label={t('settings.general.scrubCredentials')}><input type="checkbox" checked={draft.scrubCredentials} onChange={(e) => setValue('scrubCredentials', e.target.checked)} /></Field>
        </TwoCol>
        <TwoCol>
          <Field label={t('settings.general.allowedDomains')} hint={t('settings.general.csvHint')}><TextInput value={draft.allowedDomains} onChange={(e) => setValue('allowedDomains', e.target.value)} /></Field>
          <Field label={t('settings.general.blockedDomains')} hint={t('settings.general.csvHint')}><TextInput value={draft.blockedDomains} onChange={(e) => setValue('blockedDomains', e.target.value)} /></Field>
          <Field label={t('settings.general.cronTimezone')}><TextInput value={draft.cronTimezone} onChange={(e) => setValue('cronTimezone', e.target.value)} /></Field>
          <Field label={t('settings.general.telemetryEnabled')}><input type="checkbox" checked={draft.telemetryEnabled} onChange={(e) => setValue('telemetryEnabled', e.target.checked)} /></Field>
        </TwoCol>
      </SettingsCard>
    </div>
  )
}

function TwoCol({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 md:grid-cols-2">{children}</div>
}

function NumberField({ label, value, step, onChange }: { label: string; value: number; step?: number; onChange: (value: number) => void }) {
  return <Field label={label}><TextInput type="number" value={value} step={step} onChange={(e) => onChange(Number(e.target.value))} /></Field>
}
