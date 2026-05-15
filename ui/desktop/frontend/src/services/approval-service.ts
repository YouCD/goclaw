import { getWsClient } from '../lib/ws'
import type { PendingApproval } from '../types/approval'

export const approvalService = {
  list(): Promise<{ pending: PendingApproval[] | null }> {
    return getWsClient().call('exec.approval.list') as Promise<{ pending: PendingApproval[] | null }>
  },

  approve(id: string, always: boolean): Promise<{ resolved: boolean; decision: string }> {
    return getWsClient().call('exec.approval.approve', { id, always }) as Promise<{ resolved: boolean; decision: string }>
  },

  deny(id: string): Promise<{ resolved: boolean; decision: string }> {
    return getWsClient().call('exec.approval.deny', { id }) as Promise<{ resolved: boolean; decision: string }>
  },
}
