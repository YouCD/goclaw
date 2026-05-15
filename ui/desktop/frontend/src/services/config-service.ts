import { getWsClient } from '../lib/ws'

export interface ConfigSnapshot {
  config: Record<string, unknown>
  hash: string
  path: string
}

export async function getConfigSnapshot(): Promise<ConfigSnapshot> {
  return getWsClient().call('config.get') as Promise<ConfigSnapshot>
}

export async function patchConfig(updates: Record<string, unknown>, baseHash: string): Promise<ConfigSnapshot> {
  return getWsClient().call('config.patch', {
    raw: JSON.stringify(updates),
    baseHash,
  }) as Promise<ConfigSnapshot>
}
