import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import {
  defaultPreferences,
  legacyControlsKey,
  loadPreferences,
  preferencesKey,
  savePreferences,
} from './preferences'

beforeEach(() => localStorage.clear())
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
it('uses 60 seconds, motion and sound for a fresh user without writing defaults', () => {
  expect(loadPreferences()).toEqual({
    preferences: defaultPreferences,
    notice: '',
  })
  expect(localStorage.getItem(preferencesKey)).toBeNull()
})
it('migrates the explicit manual choice and lets the new record win later', () => {
  localStorage.setItem(legacyControlsKey, 'manual')
  expect(loadPreferences().preferences.controlMode).toBe('manual')
  expect(JSON.parse(localStorage.getItem(preferencesKey)!)).toMatchObject({
    schemaVersion: 1,
    controlMode: 'manual',
  })
  savePreferences({
    schemaVersion: 1,
    durationSeconds: 90,
    soundEnabled: false,
    controlMode: 'motion',
  })
  expect(loadPreferences().preferences).toEqual({
    schemaVersion: 1,
    durationSeconds: 90,
    soundEnabled: false,
    controlMode: 'motion',
  })
})
it('retains the legacy choice when migration cannot be saved and retries on a later load', () => {
  localStorage.setItem(legacyControlsKey, 'manual')
  const write = vi
    .spyOn(Storage.prototype, 'setItem')
    .mockImplementation(() => {
      throw new Error('Quota')
    })
  expect(loadPreferences()).toMatchObject({
    preferences: { controlMode: 'manual' },
    notice: expect.stringContaining('visit only'),
  })
  expect(localStorage.getItem(legacyControlsKey)).toBe('manual')
  expect(localStorage.getItem(preferencesKey)).toBeNull()
  write.mockRestore()
  expect(loadPreferences().preferences.controlMode).toBe('manual')
  expect(localStorage.getItem(preferencesKey)).not.toBeNull()
})
it('uses safe defaults for invalid or unsupported new records without erasing them', () => {
  for (const record of [
    '{',
    'null',
    '[]',
    JSON.stringify({ ...defaultPreferences, schemaVersion: 2 }),
    JSON.stringify({ ...defaultPreferences, durationSeconds: 0 }),
    JSON.stringify({ ...defaultPreferences, soundEnabled: 'false' }),
    JSON.stringify({ ...defaultPreferences, controlMode: 'buttons' }),
  ]) {
    localStorage.setItem(legacyControlsKey, 'manual')
    localStorage.setItem(preferencesKey, record)
    expect(loadPreferences()).toMatchObject({
      preferences: defaultPreferences,
      notice: expect.stringContaining('defaults'),
    })
    expect(localStorage.getItem(preferencesKey)).toBe(record)
  }
})
it('returns a notice when localStorage itself is inaccessible', () => {
  vi.stubGlobal('localStorage', {
    getItem() {
      throw new DOMException('Blocked', 'SecurityError')
    },
    setItem() {
      throw new Error('Blocked')
    },
  })
  expect(loadPreferences()).toMatchObject({
    preferences: defaultPreferences,
    notice: expect.stringContaining('visit only'),
  })
  expect(savePreferences({ ...defaultPreferences })).toContain('visit only')
})
