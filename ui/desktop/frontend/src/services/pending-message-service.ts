import { getApiClient } from '../lib/api'
import type { PendingMessage, PendingMessageGroup } from '../types/pending-message'

export const pendingMessageService = {
  listGroups(): Promise<{ groups: PendingMessageGroup[] | null }> {
    return getApiClient().get<{ groups: PendingMessageGroup[] | null }>('/v1/pending-messages')
  },

  listMessages(channel: string, key: string): Promise<{ messages: PendingMessage[] | null }> {
    return getApiClient().getWithParams<{ messages: PendingMessage[] | null }>('/v1/pending-messages/messages', { channel, key })
  },

  compact(channel: string, key: string): Promise<{ status: string; method?: string; remaining?: number }> {
    return getApiClient().post<{ status: string; method?: string; remaining?: number }>('/v1/pending-messages/compact', {
      channel_name: channel,
      history_key: key,
    })
  },

  clear(channel: string, key: string): Promise<void> {
    return getApiClient().delete<void>(`/v1/pending-messages?channel=${encodeURIComponent(channel)}&key=${encodeURIComponent(key)}`)
  },
}
