import { getApiClient } from '../lib/api'

export interface BackupPreflight {
  pg_dump_available: boolean
  disk_space_ok: boolean
  db_size_human: string
  data_dir_size_human: string
  workspace_size_human: string
  free_disk_human: string
  warnings: string[]
}

export interface ProgressEvent {
  phase?: string
  status?: string
  detail?: string
  download_url?: string
  file_name?: string
  total_bytes?: number
  schema_version?: number
  warnings?: string[]
  dry_run?: boolean
  dry_run_token?: string
}

export async function getBackupPreflight(): Promise<BackupPreflight> {
  return getApiClient().get<BackupPreflight>('/v1/system/backup/preflight')
}

export async function startBackup(
  onEvent: (event: string, payload: ProgressEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await getApiClient().streamPost('/v1/system/backup', {}, signal)
  await readSse(res, onEvent)
}

export async function startRestore(
  archive: File,
  dryRun: boolean,
  onEvent: (event: string, payload: ProgressEvent) => void,
  dryRunToken?: string,
  signal?: AbortSignal,
): Promise<void> {
  const params: Record<string, string> = { dry_run: String(dryRun) }
  if (!dryRun && dryRunToken) params.dry_run_token = dryRunToken
  const res = await getApiClient().uploadStream('/v1/system/restore', 'archive', archive, params, signal)
  await readSse(res, onEvent)
}

export async function downloadBackup(path: string): Promise<Blob> {
  return getApiClient().fetchBlob(path)
}

async function readSse(res: Response, onEvent: (event: string, payload: ProgressEvent) => void): Promise<void> {
  if (!res.ok || !res.body) throw new Error(res.statusText || 'stream failed')
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let complete = false
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const chunks = buffer.split('\n\n')
    buffer = chunks.pop() ?? ''
    for (const chunk of chunks) {
      if (emitSseChunk(chunk, onEvent) === 'complete') complete = true
    }
  }
  if (buffer.trim() && emitSseChunk(buffer, onEvent) === 'complete') complete = true
  if (!complete) throw new Error('stream ended before completion')
}

function emitSseChunk(chunk: string, onEvent: (event: string, payload: ProgressEvent) => void): string | undefined {
  let event = 'message'
  const dataLines: string[] = []
  for (const line of chunk.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim()
    if (line.startsWith('data:')) dataLines.push(line.slice(5).trim())
  }
  if (dataLines.length === 0) return undefined
  const payload = JSON.parse(dataLines.join('\n')) as ProgressEvent
  onEvent(event, payload)
  if (event === 'error') throw new Error(payload.detail || payload.status || 'stream failed')
  return event
}
