import './i18n'
import { useEffect, useState } from 'react'
import { useUiStore } from './stores/ui-store'
import { AppShell } from './components/layout/AppShell'
import { ChatCanvas } from './components/chat/ChatCanvas'
import { OnboardingWizard } from './components/onboarding/OnboardingWizard'
import { AuthSetupPanel } from './components/onboarding/AuthSetupPanel'
import { wails } from './lib/wails'
import { getWsClient, initWsClient } from './lib/ws'
import { initApiClient } from './lib/api'
import {
  bootstrapRoot,
  getBootstrapStatus,
  login,
  refreshAuth,
  saveAuthTokens,
  type AuthResult,
  type BootstrapInitPayload,
  type LoginPayload,
} from './lib/auth'
import { useSessionStore } from './stores/session-store'
import { useChatMessageStore } from './stores/chat-message-store'
import { useChatActivityStore } from './stores/chat-activity-store'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { Toaster } from './components/common/Toaster'
import { SplashScreen } from './components/common/SplashScreen'

function AppReady() {
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)
  const openSettings = useUiStore((s) => s.openSettings)
  const closeSettings = useUiStore((s) => s.closeSettings)
  const activeView = useUiStore((s) => s.activeView)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key === 'b') { e.preventDefault(); toggleSidebar() }
      if (mod && e.key === 'n') {
        e.preventDefault()
        // "New Chat" — clear session + chat directly (avoids duplicate useSessions instance)
        useSessionStore.getState().setActiveSession(null)
        useChatMessageStore.getState().clear()
        useChatActivityStore.getState().clear()
      }
      if (mod && e.key === ',') { e.preventDefault(); openSettings() }
      if (e.key === 'Escape' && activeView === 'settings') { closeSettings() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggleSidebar, openSettings, closeSettings, activeView])

  return (
    <>
      <AppShell>
        <ChatCanvas />
      </AppShell>
      <Toaster />
    </>
  )
}

type AppStage = 'starting' | 'bootstrap' | 'login' | 'onboarding' | 'ready' | 'error'

function App() {
  const theme = useUiStore((s) => s.theme)
  const [ready, setReady] = useState(false)
  const [splashDone, setSplashDone] = useState(false)
  const [stage, setStage] = useState<AppStage>('starting')
  const [gatewayUrl, setGatewayUrl] = useState('')
  const [gatewayToken, setGatewayToken] = useState('')
  const [bootstrapToken, setBootstrapToken] = useState('')
  const [initError, setInitError] = useState('')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const startAuthenticatedClients = async (baseUrl: string, localGatewayToken: string, auth: AuthResult) => {
    await saveAuthTokens(auth)
    const api = initApiClient(baseUrl, localGatewayToken, auth.accessToken)
    api.setRefreshHandler(async () => {
      const stored = await wails.getAuthTokens()
      try {
        const refreshed = await refreshAuth(baseUrl, stored.refreshToken)
        await saveAuthTokens(refreshed)
        try { getWsClient().setAccessToken(refreshed.accessToken) } catch { /* ws may not be initialized */ }
        return refreshed
      } catch {
        const latest = await wails.getAuthTokens()
        if (latest.refreshToken && latest.refreshToken !== stored.refreshToken) {
          try { getWsClient().setAccessToken(latest.accessToken) } catch { /* ws may not be initialized */ }
          return latest
        }
        await wails.clearAuthTokens()
        try { getWsClient().close() } catch { /* ws may not be initialized */ }
        setStage('login')
        return null
      }
    })
    const wsUrl = baseUrl.replace(/^http/, 'ws') + '/ws'
    const ws = initWsClient(wsUrl, localGatewayToken, auth.accessToken)
    ws.setRefreshHandler(() => api.refreshAuth())
  }

  useEffect(() => {
    const splashMin = new Promise((r) => setTimeout(r, 2500))

    const init = async () => {
      let attempts = 0
      while (attempts < 30) {
        try {
          const isReady = await wails.isGatewayReady()
          if (isReady) break
        } catch { /* not ready yet */ }
        await new Promise((r) => setTimeout(r, 500))
        attempts++
      }

      let token = ''
      try { token = await wails.getGatewayToken() } catch (e) {
        console.warn('[app] failed to get token:', e)
      }

      const baseUrl = await wails.getGatewayURL()
      setGatewayUrl(baseUrl)
      setGatewayToken(token)
      setReady(true)

      try {
        const status = await getBootstrapStatus(baseUrl)
        if (!status.bootstrapped) {
          const setupToken = await wails.getBootstrapToken()
          setBootstrapToken(setupToken)
          setStage('bootstrap')
          return
        }

        const stored = await wails.getAuthTokens()
        if (stored.refreshToken) {
          try {
            const refreshed = await refreshAuth(baseUrl, stored.refreshToken)
            await startAuthenticatedClients(baseUrl, token, refreshed)
            setStage('onboarding')
            return
          } catch {
            await wails.clearAuthTokens()
          }
        }

        setStage('login')
      } catch (err) {
        setInitError(err instanceof Error ? err.message : String(err))
        setStage('error')
      }
    }

    // Wait for both gateway init AND minimum splash duration
    Promise.all([init(), splashMin]).then(() => setSplashDone(true))
  }, [])

  if (!splashDone) {
    return <SplashScreen ready={ready} />
  }

  if (stage === 'bootstrap') {
    return (
      <AuthSetupPanel
        mode="bootstrap"
        onBootstrap={async (payload: BootstrapInitPayload) => {
          const auth = await bootstrapRoot(gatewayUrl, bootstrapToken, payload)
          await startAuthenticatedClients(gatewayUrl, gatewayToken, auth)
          setStage('onboarding')
          return auth
        }}
        onLogin={(payload: LoginPayload) => login(gatewayUrl, payload)}
      />
    )
  }

  if (stage === 'login') {
    return (
      <AuthSetupPanel
        mode="login"
        onBootstrap={(payload: BootstrapInitPayload) => bootstrapRoot(gatewayUrl, bootstrapToken, payload)}
        onLogin={async (payload: LoginPayload) => {
          const auth = await login(gatewayUrl, payload)
          await startAuthenticatedClients(gatewayUrl, gatewayToken, auth)
          setStage('onboarding')
          return auth
        }}
      />
    )
  }

  if (stage === 'onboarding') {
    return <OnboardingWizard onComplete={() => setStage('ready')} />
  }

  if (stage === 'error') {
    return (
      <div className="h-dvh flex items-center justify-center bg-surface-primary px-4">
        <div className="max-w-md rounded-xl border border-border bg-surface-secondary p-6 text-center">
          <h1 className="text-lg font-semibold text-text-primary">Startup failed</h1>
          <p className="mt-2 text-sm text-text-muted">{initError}</p>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <AppReady />
    </ErrorBoundary>
  )
}

export default App
