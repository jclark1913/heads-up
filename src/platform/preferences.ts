import type { Mode } from '../game/engine'

export const preferencesKey = 'heads-up.preferences.v1'
export const legacyControlsKey = 'heads-up.controls.v1'
export const durations = [30, 60, 90] as const
export type DurationSeconds = (typeof durations)[number]
export interface Preferences {
  schemaVersion: 1
  durationSeconds: DurationSeconds
  soundEnabled: boolean
  controlMode: Mode
}
export const defaultPreferences: Readonly<Preferences> = {
  schemaVersion: 1,
  durationSeconds: 60,
  soundEnabled: true,
  controlMode: 'motion',
}
export function isDuration(value: unknown): value is DurationSeconds {
  return durations.some((duration) => duration === value)
}
export function isPreferences(value: unknown): value is Preferences {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<Preferences>
  return (
    record.schemaVersion === 1 &&
    isDuration(record.durationSeconds) &&
    typeof record.soundEnabled === 'boolean' &&
    (record.controlMode === 'motion' || record.controlMode === 'manual')
  )
}
export function savePreferences(preferences: Preferences): string {
  try {
    localStorage.setItem(preferencesKey, JSON.stringify(preferences))
    return ''
  } catch {
    return 'Settings will last for this visit only.'
  }
}
export function loadPreferences(): {
  preferences: Preferences
  notice: string
} {
  const defaults = { ...defaultPreferences }
  try {
    const stored = localStorage.getItem(preferencesKey)
    if (stored !== null) {
      try {
        const parsed: unknown = JSON.parse(stored)
        if (isPreferences(parsed))
          return {
            preferences: {
              schemaVersion: 1,
              durationSeconds: parsed.durationSeconds,
              soundEnabled: parsed.soundEnabled,
              controlMode: parsed.controlMode,
            },
            notice: '',
          }
      } catch {
        /* Invalid saved settings use safe defaults. */
      }
      return {
        preferences: defaults,
        notice: 'Saved settings could not be read. Using the defaults.',
      }
    }
    const legacy = localStorage.getItem(legacyControlsKey)
    if (legacy === 'manual' || legacy === 'motion') {
      const preferences: Preferences = { ...defaults, controlMode: legacy }
      // Retain the old key even if migration fails; a valid new record always wins.
      return { preferences, notice: savePreferences(preferences) }
    }
    return { preferences: defaults, notice: '' }
  } catch {
    return {
      preferences: defaults,
      notice: 'Settings will last for this visit only.',
    }
  }
}
