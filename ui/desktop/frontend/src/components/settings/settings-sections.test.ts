import { describe, expect, it } from 'vitest'
import { findSettingsSection, SETTINGS_GROUPS, SETTINGS_SECTIONS, visibleSettingsSections } from './settings-sections'

describe('settings section registry', () => {
  it('keeps grouped visible sections and hides channels from navigation', () => {
    expect(SETTINGS_GROUPS.map((group) => group.id)).toEqual([
      'core',
      'ai',
      'tools',
      'automation',
      'workspace',
      'diagnostics',
    ])

    expect(visibleSettingsSections().map((section) => section.id)).not.toContain('channels')
    expect(findSettingsSection('channels')?.status).toBe('hidden')
  })

  it('has no remaining deferred destinations in the settings shell', () => {
    const deferred = SETTINGS_SECTIONS
      .filter((section) => section.status === 'deferred')
      .map((section) => section.id)

    expect(deferred).toEqual([])
  })
})
