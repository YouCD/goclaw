import { wails, type AuthTokens } from './wails'

export interface BootstrapStatus {
  bootstrapped: boolean
}

export interface BootstrapInitPayload {
  email: string
  password: string
  displayName: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface AuthResult extends AuthTokens {
  userId?: string
  role?: string
}

type RawAuthResult = {
  access_token?: string
  refresh_token?: string
  user_id?: string
  role?: string
}

function toAuthResult(raw: RawAuthResult): AuthResult {
  return {
    accessToken: raw.access_token ?? '',
    refreshToken: raw.refresh_token ?? '',
    userId: raw.user_id,
    role: raw.role,
  }
}

async function postJSON<T>(
  baseUrl: string,
  path: string,
  body: unknown,
  headers?: Record<string, string>,
): Promise<T> {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...headers,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    let message = res.statusText
    try {
      const json = (await res.json()) as { error?: string | { message?: string } }
      message = typeof json.error === 'string' ? json.error : json.error?.message ?? message
    } catch { /* non-JSON error body */ }
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

export async function getBootstrapStatus(baseUrl: string): Promise<BootstrapStatus> {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/v1/bootstrap/status`)
  if (!res.ok) throw new Error(res.statusText)
  return res.json() as Promise<BootstrapStatus>
}

export async function bootstrapRoot(
  baseUrl: string,
  bootstrapToken: string,
  payload: BootstrapInitPayload,
): Promise<AuthResult> {
  const raw = await postJSON<RawAuthResult>(
    baseUrl,
    '/v1/bootstrap/init',
    {
      email: payload.email,
      password: payload.password,
      display_name: payload.displayName,
    },
    { 'X-Bootstrap-Token': bootstrapToken },
  )
  return toAuthResult(raw)
}

export async function login(baseUrl: string, payload: LoginPayload): Promise<AuthResult> {
  const raw = await postJSON<RawAuthResult>(baseUrl, '/v1/auth/login', payload)
  return toAuthResult(raw)
}

export async function refreshAuth(baseUrl: string, refreshToken: string): Promise<AuthResult> {
  if (!refreshToken) throw new Error('missing refresh token')
  const raw = await postJSON<RawAuthResult>(baseUrl, '/v1/auth/refresh', { refresh_token: refreshToken })
  return toAuthResult(raw)
}

export async function saveAuthTokens(tokens: AuthTokens): Promise<void> {
  await wails.saveAuthTokens(tokens.accessToken, tokens.refreshToken)
}
