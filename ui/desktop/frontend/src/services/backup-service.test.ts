import { afterEach, describe, expect, it, vi } from 'vitest'
import { downloadBackup, getBackupPreflight, startBackup, startRestore } from './backup-service'
import { getApiClient } from '../lib/api'

vi.mock('../lib/api', () => ({ getApiClient: vi.fn() }))

function sseResponse(chunks: string[]): Response {
  const encoder = new TextEncoder()
  return {
    ok: true,
    body: new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
        controller.close()
      },
    }),
  } as Response
}

describe('backup service', () => {
  afterEach(() => vi.clearAllMocks())

  it('loads preflight, streams backup progress, and downloads artifacts', async () => {
    const api = {
      get: vi.fn().mockResolvedValue({ disk_space_ok: true }),
      streamPost: vi.fn().mockResolvedValue(sseResponse([
        'event: progress\ndata: {"phase":"archive"}\n\n',
        'event: complete\ndata: {"file_name":"backup.tgz"}\n\n',
      ])),
      fetchBlob: vi.fn().mockResolvedValue(new Blob(['backup'])),
    }
    vi.mocked(getApiClient).mockReturnValue(api as never)
    const events: string[] = []

    await expect(getBackupPreflight()).resolves.toEqual({ disk_space_ok: true })
    await startBackup((event, payload) => events.push(`${event}:${payload.phase}`))
    await downloadBackup('/v1/system/backup/download/token')

    expect(events).toEqual(['progress:archive', 'complete:undefined'])
    expect(api.streamPost).toHaveBeenCalledWith('/v1/system/backup', {}, undefined)
    expect(api.fetchBlob).toHaveBeenCalledWith('/v1/system/backup/download/token')
  })

  it('surfaces restore stream errors', async () => {
    const api = {
      uploadStream: vi.fn().mockResolvedValue({ ok: false, statusText: 'restore failed', body: null }),
    }
    vi.mocked(getApiClient).mockReturnValue(api as never)

    await expect(startRestore(new File(['x'], 'backup.tgz'), true, vi.fn())).rejects.toThrow('restore failed')
    expect(api.uploadStream).toHaveBeenCalledWith('/v1/system/restore', 'archive', expect.any(File), { dry_run: 'true' }, undefined)
  })

  it('passes dry-run proof token for destructive restore', async () => {
    const api = {
      uploadStream: vi.fn().mockResolvedValue(sseResponse(['event: complete\ndata: {"dry_run":false}\n\n'])),
    }
    vi.mocked(getApiClient).mockReturnValue(api as never)

    await startRestore(new File(['x'], 'backup.tgz'), false, vi.fn(), 'proof-token')

    expect(api.uploadStream).toHaveBeenCalledWith('/v1/system/restore', 'archive', expect.any(File), {
      dry_run: 'false',
      dry_run_token: 'proof-token',
    }, undefined)
  })

  it('treats SSE error events as failed operations', async () => {
    const api = {
      streamPost: vi.fn().mockResolvedValue(sseResponse(['event: error\ndata: {"detail":"archive failed"}\n\n'])),
    }
    vi.mocked(getApiClient).mockReturnValue(api as never)

    await expect(startBackup(vi.fn())).rejects.toThrow('archive failed')
  })
})
