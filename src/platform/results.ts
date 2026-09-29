import { isRoundResult } from '../game/results'
import type { RoundResult } from '../game/results'

export const latestResultKey = 'heads-up.latest-result.v1'
const maxStoredCharacters = 2_000_000
export function loadLatestResult(): {
  result: RoundResult | null
  notice: string
} {
  try {
    const stored = localStorage.getItem(latestResultKey)
    if (stored === null) return { result: null, notice: '' }
    if (stored.length <= maxStoredCharacters) {
      const value: unknown = JSON.parse(stored)
      if (isRoundResult(value)) return { result: value, notice: '' }
    }
    return { result: null, notice: 'The saved result could not be read.' }
  } catch {
    return {
      result: null,
      notice: 'The saved result could not be loaded on this device.',
    }
  }
}
export function saveLatestResult(result: RoundResult): string {
  try {
    // Replace one record only. Never persist the live engine, source deck, or sensor trace.
    localStorage.setItem(latestResultKey, JSON.stringify(result))
    return ''
  } catch {
    return 'This result is available for this visit only. It could not be saved on this device.'
  }
}
