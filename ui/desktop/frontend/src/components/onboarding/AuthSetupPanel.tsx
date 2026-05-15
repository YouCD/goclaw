import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AuthResult, BootstrapInitPayload, LoginPayload } from '../../lib/auth'

interface AuthSetupPanelProps {
  mode: 'bootstrap' | 'login'
  onBootstrap: (payload: BootstrapInitPayload) => Promise<AuthResult>
  onLogin: (payload: LoginPayload) => Promise<AuthResult>
}

export function AuthSetupPanel({ mode, onBootstrap, onLogin }: AuthSetupPanelProps) {
  const { t } = useTranslation('desktop')
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isBootstrap = mode === 'bootstrap'
  const canSubmit = email.trim() !== '' && password !== '' && (!isBootstrap || displayName.trim() !== '')

  const handleSubmit = async () => {
    if (!canSubmit) return
    setLoading(true)
    setError('')
    try {
      if (isBootstrap) {
        await onBootstrap({ email: email.trim(), displayName: displayName.trim(), password })
      } else {
        await onLogin({ email: email.trim(), password })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-dvh flex items-center justify-center bg-surface-primary px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <img src="/goclaw-icon.svg" alt="GoClaw" className="mx-auto mb-4 h-16 w-16" />
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">
            {isBootstrap ? t('auth.bootstrapTitle') : t('auth.loginTitle')}
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            {isBootstrap ? t('auth.bootstrapDesc') : t('auth.loginDesc')}
          </p>
        </div>

        <form
          className="bg-surface-secondary border border-border rounded-xl p-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            void handleSubmit()
          }}
        >
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-secondary">{t('auth.email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError('') }}
              autoComplete="email"
              className="w-full bg-surface-tertiary border border-border rounded-lg px-3 py-2.5 text-base md:text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {isBootstrap && (
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-secondary">{t('auth.displayName')}</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => { setDisplayName(e.target.value); setError('') }}
                autoComplete="name"
                className="w-full bg-surface-tertiary border border-border rounded-lg px-3 py-2.5 text-base md:text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-secondary">{t('auth.password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError('') }}
              autoComplete={isBootstrap ? 'new-password' : 'current-password'}
              className="w-full bg-surface-tertiary border border-border rounded-lg px-3 py-2.5 text-base md:text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
            />
            {isBootstrap && <p className="text-xs text-text-muted">{t('auth.passwordHint')}</p>}
          </div>

          {error && <p className="text-sm text-error">{error}</p>}

          <button
            type="submit"
            disabled={!canSubmit || loading}
            className="w-full px-6 py-2.5 bg-accent text-white rounded-lg font-medium hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {isBootstrap ? t('auth.createRoot') : t('auth.signIn')}
          </button>
        </form>
      </div>
    </div>
  )
}
