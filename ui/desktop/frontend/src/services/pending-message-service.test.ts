import { afterEach, describe, expect, it, vi } from 'vitest'
import { getApiClient } from '../lib/api'
import { pendingMessageService } from './pending-message-service'

vi.mock('../lib/api', () => ({ getApiClient: vi.fn() }))

describe('pending message service', () => {
  afterEach(() => vi.clearAllMocks())

  it('uses pending message HTTP endpoints', async () => {
    const api = {
      get: vi.fn().mockResolvedValue({ groups: [] }),
      getWithParams: vi.fn().mockResolvedValue({ messages: [] }),
      post: vi.fn().mockResolvedValue({ status: 'accepted' }),
      delete: vi.fn().mockResolvedValue(undefined),
    }
    vi.mocked(getApiClient).mockReturnValue(api as never)

    await pendingMessageService.listGroups()
    await pendingMessageService.listMessages('telegram', 'chat-1')
    await pendingMessageService.compact('telegram', 'chat-1')
    await pendingMessageService.clear('telegram', 'chat-1')

    expect(api.get).toHaveBeenCalledWith('/v1/pending-messages')
    expect(api.getWithParams).toHaveBeenCalledWith('/v1/pending-messages/messages', { channel: 'telegram', key: 'chat-1' })
    expect(api.post).toHaveBeenCalledWith('/v1/pending-messages/compact', { channel_name: 'telegram', history_key: 'chat-1' })
    expect(api.delete).toHaveBeenCalledWith('/v1/pending-messages?channel=telegram&key=chat-1')
  })
})
