import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiKeyService, credentialService } from './credential-service'
import { getApiClient } from '../lib/api'

vi.mock('../lib/api', () => ({ getApiClient: vi.fn() }))

describe('credential services', () => {
  afterEach(() => vi.clearAllMocks())

  it('uses CLI credential CRUD endpoints without exposing secret values', async () => {
    const api = {
      get: vi.fn().mockResolvedValue({ items: [{ id: 'c1', binary_name: 'codex', enabled: true, env_keys: ['OPENAI_API_KEY'] }] }),
      post: vi.fn().mockResolvedValue({ id: 'c1' }),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    }
    vi.mocked(getApiClient).mockReturnValue(api as never)

    await expect(credentialService.list()).resolves.toEqual([{ id: 'c1', binary_name: 'codex', enabled: true, env_keys: ['OPENAI_API_KEY'] }])
    await credentialService.create({ binary_name: 'codex', env: { OPENAI_API_KEY: 'secret' }, enabled: true })
    await credentialService.update('c1', { enabled: false })
    await credentialService.delete('c1')

    expect(api.post).toHaveBeenCalledWith('/v1/cli-credentials', expect.objectContaining({ env: { OPENAI_API_KEY: 'secret' } }))
    expect(api.put).toHaveBeenCalledWith('/v1/cli-credentials/c1', { enabled: false })
    expect(api.delete).toHaveBeenCalledWith('/v1/cli-credentials/c1')
  })

  it('uses API Key list, create, and revoke endpoints', async () => {
    const api = {
      get: vi.fn().mockResolvedValue([{ id: 'k1', name: 'local', prefix: 'goclaw', scopes: ['operator.admin'], revoked: false }]),
      post: vi.fn().mockResolvedValue({ id: 'k1', key: 'goclaw_secret' }),
    }
    vi.mocked(getApiClient).mockReturnValue(api as never)

    await expect(apiKeyService.list()).resolves.toHaveLength(1)
    await apiKeyService.create({ name: 'local', scopes: ['operator.admin'] })
    await apiKeyService.revoke('k1')

    expect(api.post).toHaveBeenNthCalledWith(1, '/v1/api-keys', { name: 'local', scopes: ['operator.admin'] })
    expect(api.post).toHaveBeenNthCalledWith(2, '/v1/api-keys/k1/revoke')
  })
})
