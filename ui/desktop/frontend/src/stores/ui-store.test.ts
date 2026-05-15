import { beforeEach, describe, expect, it } from 'vitest'
import { useUiStore } from './ui-store'

describe('ui store settings tab sanitization', () => {
  beforeEach(() => {
    useUiStore.setState({ activeView: 'chat', settingsTab: 'appearance' })
  })

  it('does not open hidden Channels through openSettings', () => {
    useUiStore.getState().openSettings('channels')

    expect(useUiStore.getState().activeView).toBe('settings')
    expect(useUiStore.getState().settingsTab).toBe('appearance')
  })

  it('does not preserve hidden Channels when openSettings is called without a section', () => {
    useUiStore.setState({ settingsTab: 'channels' })
    useUiStore.getState().openSettings()

    expect(useUiStore.getState().settingsTab).toBe('appearance')
  })
})
