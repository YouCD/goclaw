import { describe, expect, it } from 'vitest'
import { configToDraft, draftToPatch, validateDraft } from './settings-config-draft'

describe('settings config draft mapping', () => {
  it('maps nested config fields to editable draft and patch payload', () => {
    const draft = configToDraft({
      gateway: { host: '127.0.0.1', port: 18791, allowed_origins: ['app://desktop'], rate_limit_rpm: 10 },
      sessions: { scope: 'global', dm_scope: 'main' },
      agents: { defaults: { provider: 'openai', model: 'gpt-5', max_tokens: 8192, temperature: 0.2 } },
      tools: {
        profile: 'full',
        scrub_credentials: false,
        execApproval: { security: 'allowlist', ask: 'always' },
        web_fetch: { policy: 'allowlist', allowed_domains: ['github.com'] },
      },
    })

    expect(draft.host).toBe('127.0.0.1')
    expect(draft.dmScope).toBe('main')
    expect(draft.allowedOrigins).toBe('app://desktop')
    expect(draft.execSecurity).toBe('allowlist')

    expect(draftToPatch(draft)).toMatchObject({
      gateway: { allowed_origins: ['app://desktop'], rate_limit_rpm: 10 },
      sessions: { dm_scope: 'main' },
      agents: { defaults: { provider: 'openai', model: 'gpt-5' } },
      tools: { execApproval: { ask: 'always' }, web_fetch: { allowed_domains: ['github.com'] } },
    })
  })

  it('validates values before saving', () => {
    const draft = configToDraft({})
    expect(validateDraft({ ...draft, port: 70000 })).toBe('port')
    expect(validateDraft({ ...draft, temperature: 3 })).toBe('temperature')
    expect(validateDraft(draft)).toBeNull()
  })
})
