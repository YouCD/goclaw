import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { pendingMessageService } from '../../services/pending-message-service'
import { toast } from '../../stores/toast-store'
import type { PendingMessage, PendingMessageGroup } from '../../types/pending-message'

function groupKey(group: PendingMessageGroup): string {
  return `${group.channel_name}:${group.history_key}`
}

export function PendingMessagesTab() {
  const { t } = useTranslation(['desktop', 'common'])
  const [groups, setGroups] = useState<PendingMessageGroup[]>([])
  const [selected, setSelected] = useState<PendingMessageGroup | null>(null)
  const [messages, setMessages] = useState<PendingMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)

  const loadGroups = useCallback(async () => {
    setLoading(true)
    try {
      const res = await pendingMessageService.listGroups()
      const next = res.groups ?? []
      setGroups(next)
      setSelected((current) => current && next.some((group) => groupKey(group) === groupKey(current)) ? current : next[0] ?? null)
    } catch (err) {
      toast.error(t('settings.pendingMessages.loadFailed'), (err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [t])

  const loadMessages = useCallback(async (group: PendingMessageGroup | null) => {
    if (!group) {
      setMessages([])
      return
    }
    setMessagesLoading(true)
    try {
      const res = await pendingMessageService.listMessages(group.channel_name, group.history_key)
      setMessages(res.messages ?? [])
    } finally {
      setMessagesLoading(false)
    }
  }, [])

  useEffect(() => { void loadGroups() }, [loadGroups])
  useEffect(() => { void loadMessages(selected) }, [loadMessages, selected])

  async function compact() {
    if (!selected) return
    await pendingMessageService.compact(selected.channel_name, selected.history_key)
    toast.success(t('settings.pendingMessages.compactStarted'))
    await loadGroups()
  }

  async function clear() {
    if (!selected) return
    await pendingMessageService.clear(selected.channel_name, selected.history_key)
    toast.success(t('settings.pendingMessages.cleared'))
    setSelected(null)
    setMessages([])
    await loadGroups()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">{t('settings.pendingMessages.title')}</h2>
          <p className="mt-0.5 text-xs text-text-muted">{t('settings.pendingMessages.description')}</p>
        </div>
        <button type="button" onClick={loadGroups} className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-tertiary">
          {t('refresh', { ns: 'common' })}
        </button>
      </div>

      {loading ? (
        <div className="h-40 animate-pulse rounded-lg bg-surface-tertiary/50" />
      ) : groups.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm font-medium text-text-primary">{t('settings.pendingMessages.emptyTitle')}</p>
          <p className="mt-1 text-xs text-text-muted">{t('settings.pendingMessages.emptyDescription')}</p>
        </div>
      ) : (
        <div className="grid min-h-[360px] grid-cols-[260px_1fr] overflow-hidden rounded-lg border border-border">
          <div className="border-r border-border bg-surface-secondary">
            {groups.map((group) => {
              const active = selected && groupKey(group) === groupKey(selected)
              return (
                <button key={groupKey(group)} onClick={() => setSelected(group)} className={`block w-full border-b border-border px-3 py-3 text-left ${active ? 'bg-accent/10' : 'hover:bg-surface-tertiary/50'}`}>
                  <p className="truncate text-xs font-medium text-text-primary">{group.group_title || group.history_key}</p>
                  <p className="mt-1 text-[11px] text-text-muted">{group.channel_name} · {group.message_count} {t('messages', { ns: 'common' })}</p>
                </button>
              )
            })}
          </div>
          <div className="min-w-0 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="truncate text-sm font-medium text-text-primary">{selected?.group_title || selected?.history_key}</h3>
              <div className="flex gap-2">
                <button type="button" onClick={compact} className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-tertiary">{t('settings.pendingMessages.compact')}</button>
                <button type="button" onClick={clear} className="rounded-lg border border-border px-3 py-1.5 text-xs text-error hover:bg-error/10">{t('settings.pendingMessages.clear')}</button>
              </div>
            </div>
            {messagesLoading ? (
              <div className="h-32 animate-pulse rounded-lg bg-surface-tertiary/50" />
            ) : (
              <div className="max-h-[440px] space-y-2 overflow-auto pr-1">
                {messages.map((message) => (
                  <div key={message.id} className="rounded-lg bg-surface-tertiary p-3">
                    <p className="text-[11px] text-text-muted">{message.sender || message.sender_id} · {new Date(message.created_at).toLocaleString()}</p>
                    <p className="mt-1 whitespace-pre-wrap text-xs text-text-primary">{message.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
