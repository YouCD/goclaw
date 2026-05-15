// HTTP API client for GoClaw REST endpoints

import type { AuthTokens } from './wails'

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

class ApiClient {
  private baseUrl: string
  private gatewayToken: string
  private accessToken: string
  private refreshHandler?: () => Promise<AuthTokens | null>
  private refreshPromise: Promise<AuthTokens | null> | null = null

  constructor(baseUrl: string, gatewayToken: string, accessToken = '') {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.gatewayToken = gatewayToken
    this.accessToken = accessToken
  }

  setAuthTokens(tokens: Partial<AuthTokens>): void {
    this.accessToken = tokens.accessToken ?? ''
  }

  setRefreshHandler(handler: () => Promise<AuthTokens | null>): void {
    this.refreshHandler = handler
  }

  private bearerToken(): string {
    return this.accessToken || this.gatewayToken
  }

  private headers(extra?: Record<string, string>, json = true): Record<string, string> {
    // Send locale for i18n error messages from backend
    const lang = typeof localStorage !== 'undefined' ? localStorage.getItem('goclaw:language') : null
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.bearerToken()}`,
      'X-Requested-With': 'XMLHttpRequest',
      ...(json ? { 'Content-Type': 'application/json' } : {}),
      ...(lang ? { 'Accept-Language': lang } : {}),
      ...extra,
    }
    if (!this.accessToken) headers['X-GoClaw-User-Id'] = 'system'
    return headers
  }

  private async refreshOnce(retried: boolean): Promise<boolean> {
    if (retried) return false
    const refreshed = await this.refreshAuth()
    return !!refreshed?.accessToken
  }

  async refreshAuth(): Promise<AuthTokens | null> {
    if (!this.accessToken || !this.refreshHandler) return null

    if (!this.refreshPromise) {
      this.refreshPromise = this.refreshHandler().finally(() => {
        this.refreshPromise = null
      })
    }

    const refreshed = await this.refreshPromise
    if (!refreshed?.accessToken) return null
    this.setAuthTokens(refreshed)
    return refreshed
  }

  private async fetchWithAuth(
    url: string,
    init: RequestInit,
    json = true,
    retried = false,
  ): Promise<Response> {
    const res = await fetch(url, {
      ...init,
      headers: this.headers(init.headers as Record<string, string> | undefined, json),
    })

    if (res.status === 401 && await this.refreshOnce(retried)) {
      return this.fetchWithAuth(url, init, json, true)
    }
    return res
  }

  private async request<T>(method: string, path: string, body?: unknown, retried = false): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const res = await this.fetchWithAuth(url, {
      method,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }, true, retried)

    if (!res.ok) {
      let code: string | undefined
      let message = res.statusText
      try {
        const json = await res.json()
        // Backend sends either { error: "string" } or { error: { code, message } }
        if (typeof json.error === 'string') {
          message = json.error
        } else if (json.error && typeof json.error === 'object') {
          code = json.error.code
          message = json.error.message ?? message
        }
      } catch {
        // non-JSON error body
      }
      throw new ApiError(message, res.status, code)
    }

    if (res.status === 204) return undefined as T
    return res.json() as Promise<T>
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path)
  }

  async getWithParams<T>(path: string, params?: Record<string, string>): Promise<T> {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return this.request<T>('GET', `${path}${qs}`)
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body)
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body)
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body)
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path)
  }

  getBaseUrl(): string {
    return this.baseUrl
  }

  /** Fetch a file with Bearer auth. Use for URLs without ?ft= token (e.g. media_refs). */
  async fetchFile(url: string): Promise<Response> {
    const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`
    return this.fetchWithAuth(fullUrl, {}, false)
  }

  /** Sign a file path, returning a URL with ?ft= token for unauthenticated access. */
  async signFileUrl(filePath: string): Promise<string> {
    const res = await this.post<{ url: string }>('/v1/files/sign', { path: filePath })
    return `${this.baseUrl}${res.url}`
  }

  /** Fetch a file as Blob with Bearer auth. Used for image previews and downloads. */
  async fetchBlob(path: string, params?: Record<string, string>): Promise<Blob> {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    const url = `${this.baseUrl}${path}${qs}`
    const res = await this.fetchWithAuth(url, {}, false)
    if (!res.ok) throw new ApiError(res.statusText, res.status)
    return res.blob()
  }

  /** Fetch an SSE stream with Bearer auth. Used for storage size streaming. */
  async streamFetch(path: string, signal?: AbortSignal): Promise<Response> {
    const url = `${this.baseUrl}${path}`
    return this.fetchWithAuth(url, { signal }, false)
  }

  /** POST an SSE stream with a JSON body. Used for backup operations. */
  async streamPost(path: string, body?: unknown, signal?: AbortSignal): Promise<Response> {
    const url = `${this.baseUrl}${path}`
    return this.fetchWithAuth(url, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    }, true)
  }

  /** Upload a file and read an SSE stream response. Used for restore dry-run/restore. */
  async uploadStream(path: string, field: string, file: File, params?: Record<string, string>, signal?: AbortSignal): Promise<Response> {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    const url = `${this.baseUrl}${path}${qs}`
    const form = new FormData()
    form.append(field, file)
    return this.fetchWithAuth(url, {
      method: 'POST',
      body: form,
      signal,
    }, false)
  }

  /** Raw PUT request without JSON body (for query-param-only endpoints like /v1/storage/move). */
  async putRaw(path: string): Promise<void> {
    const url = `${this.baseUrl}${path}`
    const res = await this.fetchWithAuth(url, {
      method: 'PUT',
    })
    if (!res.ok) {
      let message = res.statusText
      try {
        const json = (await res.json()) as { error?: string | { message?: string } }
        message = typeof json.error === 'string' ? json.error : json.error?.message ?? message
      } catch { /* non-JSON */ }
      throw new ApiError(message, res.status)
    }
  }

  async uploadFile<T = { url: string }>(path: string, file: File): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const form = new FormData()
    form.append('file', file)

    const res = await this.fetchWithAuth(url, {
      method: 'POST',
      body: form,
    }, false)

    if (!res.ok) {
      let message = res.statusText
      try {
        const json = (await res.json()) as { error?: string | { message?: string } }
        message = typeof json.error === 'string' ? json.error : json.error?.message ?? message
      } catch { /* non-JSON */ }
      throw new ApiError(message, res.status)
    }
    return res.json() as Promise<T>
  }
}

// Singleton
let apiClient: ApiClient | null = null

export function getApiClient(): ApiClient {
  if (!apiClient) throw new Error('ApiClient not initialized — call initApiClient() first')
  return apiClient
}

/** Safe check — returns true if the API client has been initialized. */
export function isApiClientReady(): boolean {
  return apiClient !== null
}

export function initApiClient(baseUrl: string, gatewayToken: string, accessToken = ''): ApiClient {
  apiClient = new ApiClient(baseUrl, gatewayToken, accessToken)
  return apiClient
}

export { ApiClient, ApiError }
