import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiClient } from './api'

function mockResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Unauthorized',
    json: () => Promise.resolve(body),
    blob: () => Promise.resolve(new Blob()),
  } as Response
}

describe('ApiClient desktop auth', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('sends the CSRF marker header on JSON mutations', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    const api = new ApiClient('http://127.0.0.1:18791', 'gateway-token')
    await api.post('/v1/providers', { name: 'openrouter' })

    expect(fetchMock).toHaveBeenCalledWith('http://127.0.0.1:18791/v1/providers', {
      method: 'POST',
      headers: expect.objectContaining({
        Authorization: 'Bearer gateway-token',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-GoClaw-User-Id': 'system',
      }),
      body: JSON.stringify({ name: 'openrouter' }),
    })
  })

  it('refreshes access tokens single-flight across concurrent 401s', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(mockResponse({}, 401))
      .mockResolvedValueOnce(mockResponse({}, 401))
      .mockResolvedValue(mockResponse({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    const refreshHandler = vi.fn(async () => ({
      accessToken: 'new.access',
      refreshToken: 'new.refresh',
    }))

    const api = new ApiClient('http://127.0.0.1:18791', 'gateway-token', 'old.access')
    api.setRefreshHandler(refreshHandler)

    await Promise.all([
      api.get('/v1/providers'),
      api.get('/v1/agents'),
    ])

    expect(refreshHandler).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenNthCalledWith(3, 'http://127.0.0.1:18791/v1/providers', expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer new.access' }),
    }))
    expect(fetchMock).toHaveBeenNthCalledWith(4, 'http://127.0.0.1:18791/v1/agents', expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer new.access' }),
    }))
  })
})
