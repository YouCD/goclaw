import { afterEach, describe, expect, it, vi } from 'vitest'
import { WsClient } from './ws'

class FakeWebSocket {
  static instances: FakeWebSocket[] = []
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onerror: (() => void) | null = null
  sent: string[] = []

  constructor(public url: string) {
    FakeWebSocket.instances.push(this)
  }

  send(data: string) {
    this.sent.push(data)
  }

  close() {}
}

describe('WsClient auth handshake', () => {
  afterEach(() => {
    FakeWebSocket.instances = []
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('uses accessToken instead of gateway token for user-facing sessions', () => {
    vi.stubGlobal('WebSocket', FakeWebSocket)
    vi.stubGlobal('crypto', { randomUUID: () => 'req-1' })

    const client = new WsClient('ws://127.0.0.1:18791/ws', 'gateway-token', 'access.jwt')
    client.connect()
    FakeWebSocket.instances[0].onopen?.()

    const frame = JSON.parse(FakeWebSocket.instances[0].sent[0])
    expect(frame.params).toMatchObject({
      token: '',
      accessToken: 'access.jwt',
      sender_id: 'desktop',
      protocol_version: 3,
    })
    expect(frame.params.user_id).toBeUndefined()
  })

  it('refreshes once and reconnects when JWT connect handshake fails', async () => {
    vi.stubGlobal('WebSocket', FakeWebSocket)
    vi.stubGlobal('crypto', { randomUUID: vi.fn()
      .mockReturnValueOnce('connect-1')
      .mockReturnValueOnce('connect-2') })

    const refreshHandler = vi.fn().mockResolvedValue({ accessToken: 'new.access' })
    const client = new WsClient('ws://127.0.0.1:18791/ws', 'gateway-token', 'old.access')
    client.setRefreshHandler(refreshHandler)

    client.connect()
    FakeWebSocket.instances[0].onopen?.()
    FakeWebSocket.instances[0].onmessage?.({
      data: JSON.stringify({
        type: 'res',
        id: 'connect-1',
        ok: false,
        error: { code: 'unauthorized', message: 'unauthorized' },
      }),
    })
    await Promise.resolve()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(refreshHandler).toHaveBeenCalledTimes(1)
    expect(FakeWebSocket.instances).toHaveLength(2)

    FakeWebSocket.instances[1].onopen?.()
    const frame = JSON.parse(FakeWebSocket.instances[1].sent[0])
    expect(frame.params.accessToken).toBe('new.access')
    expect(frame.params.token).toBe('')
  })

  it('rejects queued calls when JWT refresh fails during connect', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('WebSocket', FakeWebSocket)
    vi.stubGlobal('crypto', { randomUUID: () => 'connect-1' })

    const client = new WsClient('ws://127.0.0.1:18791/ws', 'gateway-token', 'old.access')
    client.setRefreshHandler(vi.fn().mockResolvedValue(null))

    client.connect()
    const queued = client.call('chat.send', {}, 5000)
    FakeWebSocket.instances[0].onopen?.()
    FakeWebSocket.instances[0].onmessage?.({
      data: JSON.stringify({
        type: 'res',
        id: 'connect-1',
        ok: false,
        error: { code: 'unauthorized', message: 'unauthorized' },
      }),
    })

    await expect(queued).rejects.toThrow('unauthorized')
  })
})
