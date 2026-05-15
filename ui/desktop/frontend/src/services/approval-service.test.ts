import { afterEach, describe, expect, it, vi } from 'vitest'
import { getWsClient } from '../lib/ws'
import { approvalService } from './approval-service'

vi.mock('../lib/ws', () => ({ getWsClient: vi.fn() }))

describe('approval service', () => {
  afterEach(() => vi.clearAllMocks())

  it('uses exec approval WS methods', async () => {
    const call = vi.fn().mockResolvedValue({ pending: [] })
    vi.mocked(getWsClient).mockReturnValue({ call } as never)

    await approvalService.list()
    await approvalService.approve('approval-1', true)
    await approvalService.deny('approval-1')

    expect(call).toHaveBeenNthCalledWith(1, 'exec.approval.list')
    expect(call).toHaveBeenNthCalledWith(2, 'exec.approval.approve', { id: 'approval-1', always: true })
    expect(call).toHaveBeenNthCalledWith(3, 'exec.approval.deny', { id: 'approval-1' })
  })
})
