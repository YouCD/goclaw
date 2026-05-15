import { act, render, screen } from '@testing-library/react'
import type React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const wailsMock = vi.hoisted(() => ({
  isGatewayReady: vi.fn(),
  getGatewayToken: vi.fn(),
  getGatewayURL: vi.fn(),
  getBootstrapToken: vi.fn(),
  getAuthTokens: vi.fn(),
  clearAuthTokens: vi.fn(),
  saveAuthTokens: vi.fn(),
}))

const authMock = vi.hoisted(() => ({
  getBootstrapStatus: vi.fn(),
  refreshAuth: vi.fn(),
  saveAuthTokens: vi.fn(),
  bootstrapRoot: vi.fn(),
  login: vi.fn(),
}))

const apiMock = vi.hoisted(() => ({
  setRefreshHandler: vi.fn(),
  token: 'receiver-bound',
  refreshAuth: vi.fn(function (this: { token: string }) {
    if (this.token !== 'receiver-bound') {
      throw new Error('lost receiver')
    }
    return Promise.resolve({ accessToken: 'next.access', refreshToken: 'next.refresh' })
  }),
}))

const wsClientMock = vi.hoisted(() => ({
  setRefreshHandler: vi.fn(),
  close: vi.fn(),
  setAccessToken: vi.fn(),
}))

const wsMock = vi.hoisted(() => ({
  initWsClient: vi.fn(() => wsClientMock),
  getWsClient: vi.fn(() => wsClientMock),
}))

vi.mock('./lib/wails', () => ({ wails: wailsMock }))
vi.mock('./lib/auth', () => authMock)
vi.mock('./lib/api', () => ({ initApiClient: vi.fn(() => apiMock) }))
vi.mock('./lib/ws', () => wsMock)
vi.mock('./components/common/SplashScreen', () => ({
  SplashScreen: ({ ready }: { ready: boolean }) => <div data-testid="splash">{String(ready)}</div>,
}))
vi.mock('./components/onboarding/AuthSetupPanel', () => ({
  AuthSetupPanel: ({ mode }: { mode: string }) => <div data-testid="auth-panel">{mode}</div>,
}))
vi.mock('./components/onboarding/OnboardingWizard', () => ({
  OnboardingWizard: () => <div data-testid="onboarding">onboarding</div>,
}))
vi.mock('./components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div data-testid="app-shell">{children}</div>,
}))
vi.mock('./components/chat/ChatCanvas', () => ({
  ChatCanvas: () => <div data-testid="chat-canvas" />,
}))

async function finishSplash() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(2600)
  })
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('desktop app bootstrap gate', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    wailsMock.isGatewayReady.mockResolvedValue(true)
    wailsMock.getGatewayToken.mockResolvedValue('gateway-token')
    wailsMock.getGatewayURL.mockResolvedValue('http://127.0.0.1:18791')
    wailsMock.getBootstrapToken.mockResolvedValue('bootstrap-token')
    wailsMock.getAuthTokens.mockResolvedValue({ accessToken: '', refreshToken: '' })
    wailsMock.clearAuthTokens.mockResolvedValue(undefined)
    authMock.saveAuthTokens.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('does not let stale onboarded storage bypass bootstrap status', async () => {
    localStorage.setItem('goclaw-ui', JSON.stringify({
      state: { onboarded: true, theme: 'light', locale: 'vi' },
      version: 1,
    }))
    authMock.getBootstrapStatus.mockResolvedValue({ bootstrapped: false })

    render(<App />)
    await finishSplash()

    expect(screen.getByTestId('auth-panel')).toHaveTextContent('bootstrap')
    expect(screen.queryByTestId('app-shell')).not.toBeInTheDocument()
    expect(screen.queryByTestId('onboarding')).not.toBeInTheDocument()
  })

  it('uses stored refresh token on relaunch and enters product onboarding', async () => {
    authMock.getBootstrapStatus.mockResolvedValue({ bootstrapped: true })
    wailsMock.getAuthTokens.mockResolvedValue({ accessToken: '', refreshToken: 'stored.refresh' })
    authMock.refreshAuth.mockResolvedValue({ accessToken: 'new.access', refreshToken: 'new.refresh' })

    render(<App />)
    await finishSplash()

    expect(screen.getByTestId('onboarding')).toBeInTheDocument()
    expect(authMock.refreshAuth).toHaveBeenCalledWith('http://127.0.0.1:18791', 'stored.refresh')
    expect(wsMock.initWsClient).toHaveBeenCalledWith(
      'ws://127.0.0.1:18791/ws',
      'gateway-token',
      'new.access',
    )
    expect(wsClientMock.setRefreshHandler).toHaveBeenCalledTimes(1)
    const refreshHandler = wsClientMock.setRefreshHandler.mock.calls[0][0] as () => Promise<unknown>
    await expect(refreshHandler()).resolves.toMatchObject({ accessToken: 'next.access' })
  })

  it('falls back to login when stored refresh token fails', async () => {
    authMock.getBootstrapStatus.mockResolvedValue({ bootstrapped: true })
    wailsMock.getAuthTokens.mockResolvedValue({ accessToken: '', refreshToken: 'stored.refresh' })
    authMock.refreshAuth.mockRejectedValue(new Error('revoked'))

    render(<App />)
    await finishSplash()

    expect(screen.getByTestId('auth-panel')).toHaveTextContent('login')
    expect(wailsMock.clearAuthTokens).toHaveBeenCalled()
  })
})
