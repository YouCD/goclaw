import { afterEach, describe, expect, it, vi } from 'vitest'
import { bootstrapRoot, getBootstrapStatus, refreshAuth } from './auth'

function mockJSON(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Failed',
    json: () => Promise.resolve(body),
  } as Response)
}

describe('desktop auth helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('reads bootstrap status from the gateway', async () => {
    const fetchMock = mockJSON({ bootstrapped: false })
    vi.stubGlobal('fetch', fetchMock)

    await expect(getBootstrapStatus('http://127.0.0.1:18791/')).resolves.toEqual({ bootstrapped: false })
    expect(fetchMock).toHaveBeenCalledWith('http://127.0.0.1:18791/v1/bootstrap/status')
  })

  it('posts bootstrap init with the in-process token and maps auth tokens', async () => {
    const fetchMock = mockJSON({
      access_token: 'access.jwt',
      refresh_token: 'refresh.token',
      user_id: 'u1',
      role: 'root',
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await bootstrapRoot('http://127.0.0.1:18791', 'boot-token', {
      email: 'root@example.com',
      displayName: 'Root User',
      password: 'LongPassword1!',
    })

    expect(result).toEqual({
      accessToken: 'access.jwt',
      refreshToken: 'refresh.token',
      userId: 'u1',
      role: 'root',
    })
    expect(fetchMock).toHaveBeenCalledWith('http://127.0.0.1:18791/v1/bootstrap/init', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Bootstrap-Token': 'boot-token',
      },
      body: JSON.stringify({
        email: 'root@example.com',
        password: 'LongPassword1!',
        display_name: 'Root User',
      }),
    })
  })

  it('refreshes with the refresh_token payload expected by the backend', async () => {
    const fetchMock = mockJSON({
      access_token: 'new.access',
      refresh_token: 'new.refresh',
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(refreshAuth('http://127.0.0.1:18791', 'old.refresh')).resolves.toMatchObject({
      accessToken: 'new.access',
      refreshToken: 'new.refresh',
    })
    expect(fetchMock).toHaveBeenCalledWith('http://127.0.0.1:18791/v1/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({ refresh_token: 'old.refresh' }),
    })
  })
})
