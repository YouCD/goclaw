import { getApiClient } from '../lib/api'

export interface SecureCliCredential {
  id: string
  binary_name: string
  binary_path?: string
  description?: string
  deny_args?: string[]
  deny_verbose?: string[]
  timeout_seconds?: number
  tips?: string
  is_global?: boolean
  enabled: boolean
  env_keys?: string[]
}

export interface CredentialInput {
  binary_name: string
  binary_path?: string
  description?: string
  env: Record<string, string>
  deny_args?: string[]
  deny_verbose?: string[]
  timeout_seconds?: number
  tips?: string
  is_global?: boolean
  enabled?: boolean
}

export interface GatewayApiKey {
  id: string
  name: string
  prefix: string
  scopes: string[]
  owner_id?: string
  expires_at?: string | null
  last_used_at?: string | null
  revoked: boolean
  created_at: string
}

export interface GatewayApiKeyCreateInput {
  name: string
  scopes: string[]
  expires_in?: number
}

export interface GatewayApiKeyCreateResponse extends GatewayApiKey {
  key: string
}

export const credentialService = {
  async list(): Promise<SecureCliCredential[]> {
    const res = await getApiClient().get<{ items: SecureCliCredential[] }>('/v1/cli-credentials')
    return res.items ?? []
  },

  create(input: CredentialInput): Promise<SecureCliCredential> {
    return getApiClient().post<SecureCliCredential>('/v1/cli-credentials', input)
  },

  update(id: string, input: Partial<CredentialInput>): Promise<void> {
    return getApiClient().put<void>(`/v1/cli-credentials/${id}`, input)
  },

  delete(id: string): Promise<void> {
    return getApiClient().delete<void>(`/v1/cli-credentials/${id}`)
  },
}

export const apiKeyService = {
  list(): Promise<GatewayApiKey[]> {
    return getApiClient().get<GatewayApiKey[]>('/v1/api-keys')
  },

  create(input: GatewayApiKeyCreateInput): Promise<GatewayApiKeyCreateResponse> {
    return getApiClient().post<GatewayApiKeyCreateResponse>('/v1/api-keys', input)
  },

  revoke(id: string): Promise<void> {
    return getApiClient().post<void>(`/v1/api-keys/${id}/revoke`)
  },
}
