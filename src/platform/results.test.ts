import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createResult } from '../game/results'
import { createRound, stepRound } from '../game/engine'
import { banks } from '../content/banks'
import { latestResultKey, loadLatestResult, saveLatestResult } from './results'
const bank = banks[1]
function result(id: string) {
  const round = createRound(id, bank.prompts, 'manual', { mono: 0, wall: 1000 })
  return createResult(
    stepRound(round, id, { type: 'end' }, { mono: 100, wall: 1100 }),
    bank,
  )
}
beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())
it('retains just the latest finished snapshot', () => {
  expect(loadLatestResult()).toEqual({ result: null, notice: '' })
  expect(saveLatestResult(result('first'))).toBe('')
  expect(saveLatestResult(result('second'))).toBe('')
  expect(loadLatestResult()).toEqual({ result: result('second'), notice: '' })
  expect(localStorage.length).toBe(1)
})
it('rejects corrupt or oversized data without clearing stored data or other app records', () => {
  localStorage.setItem('another-project', 'keep')
  for (const text of [
    '{',
    'null',
    JSON.stringify({ ...result('old'), schemaVersion: 2 }),
    'x'.repeat(2_000_001),
  ]) {
    localStorage.setItem(latestResultKey, text)
    expect(loadLatestResult()).toMatchObject({
      result: null,
      notice: expect.any(String),
    })
    expect(loadLatestResult().notice).not.toBe('')
    expect(localStorage.getItem(latestResultKey)).toBe(text)
    expect(localStorage.getItem('another-project')).toBe('keep')
  }
})
it('a failed write preserves the last committed result', () => {
  saveLatestResult(result('saved'))
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Quota', 'QuotaExceededError')
  })
  expect(saveLatestResult(result('new'))).toContain('visit only')
  expect(loadLatestResult().result?.roundId).toBe('saved')
})
it('handles blocked reads without throwing', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('Blocked')
  })
  expect(loadLatestResult()).toMatchObject({
    result: null,
    notice: expect.stringContaining('could not be loaded'),
  })
})
