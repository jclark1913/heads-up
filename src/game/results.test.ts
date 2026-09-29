import { describe, expect, it } from 'vitest'
import { createRound, stepRound } from './engine'
import type { Command, Round } from './engine'
import { banks } from '../content/banks'
import { createResult, isRoundResult } from './results'

const bank = banks[0]
const at = (ms: number) => ({
  mono: ms,
  wall: Date.parse('2026-09-27T12:00:00.000Z') + ms,
})
const tick: Command = { type: 'tick', ready: true, neutral: true }
const step = (round: Round, command: Command, ms: number) =>
  stepRound(round, round.id, command, at(ms))
const make = (seconds = 60) =>
  createRound('round-1', bank.prompts, 'manual', at(0), seconds * 1000)

describe('result snapshots and timing', () => {
  it.each([30, 60, 90])(
    'checks the exact %s-second deadline before accepting a late answer',
    (seconds) => {
      let round = step(make(seconds), tick, 3000)
      for (let ms = 4000; ms < 3000 + seconds * 1000; ms += 1000)
        round = step(round, tick, ms)
      round = step(
        round,
        {
          type: 'answer',
          actionId: 'late',
          promptId: round.prompts[0].id,
          source: 'manual',
          answer: 'correct',
        },
        3000 + seconds * 1000,
      )
      const result = createResult(round, bank)
      expect(result).toMatchObject({
        durationSeconds: seconds,
        elapsedActiveMs: seconds * 1000,
        finishReason: 'timer-expired',
        startedAt: new Date(at(3000).wall).toISOString(),
        finishedAt: new Date(at(3000 + seconds * 1000).wall).toISOString(),
        answers: [{ outcome: 'unanswered' }],
      })
      expect(isRoundResult(result)).toBe(true)
    },
  )
  it('excludes preparation, pause, and resume countdown from active elapsed time', () => {
    let round = step(make(), tick, 3000)
    round = step(round, { type: 'pause', reason: 'break' }, 4000)
    round = step(round, { type: 'resume' }, 40_000)
    round = step(round, tick, 43_000)
    round = step(round, { type: 'end' }, 43_500)
    const result = createResult(round, bank)
    expect(result.elapsedActiveMs).toBe(1500)
    expect(result.startedAt).toBe(new Date(at(3000).wall).toISOString())
    expect(result.finishedAt).toBe(new Date(at(43_500).wall).toISOString())
    expect(result.finishReason).toBe('ended-by-user')
    expect(isRoundResult(result)).toBe(true)
  })
  it('records an end during preparation without inventing displayed cards or a start time', () => {
    const result = createResult(step(make(), { type: 'end' }, 1000), bank)
    expect(result).toMatchObject({
      startedAt: null,
      elapsedActiveMs: 0,
      finishReason: 'ended-by-user',
      answers: [],
    })
    expect(isRoundResult(result)).toBe(true)
    expect(() => createResult(make(), bank)).toThrow(/finished/)
  })
  it('snapshots deck metadata and answered text only, and ends once after exhaustion', () => {
    const source = structuredClone(bank)
    let round = createRound(
      'short',
      [source.prompts[0]],
      'manual',
      at(0),
      30_000,
    )
    round = step(round, tick, 3000)
    round = step(
      round,
      {
        type: 'answer',
        actionId: 'one',
        promptId: source.prompts[0].id,
        source: 'manual',
        answer: 'correct',
      },
      3500,
    )
    const result = createResult(round, source)
    source.title = 'Changed'
    round.answers[0].text = 'Changed'
    expect(result.deck.title).toBe(bank.title)
    expect(result.answers[0].text).toBe(bank.prompts[0].text)
    expect(result.finishReason).toBe('deck-exhausted')
    expect(result.elapsedActiveMs).toBe(500)
    expect(step(round, { type: 'end' }, 4000)).toBe(round)
    expect(isRoundResult(result)).toBe(true)
    expect(result).not.toHaveProperty('prompts')
    expect(result).not.toHaveProperty('deadlineMono')
    expect(result.deck).not.toHaveProperty('prompts')
  })
  it('rejects malformed, unsupported, and internally inconsistent stored results', () => {
    const result = createResult(
      step(step(make(), tick, 3000), { type: 'end' }, 3500),
      bank,
    )
    const invalid = [
      null,
      {},
      { ...result, schemaVersion: 2 },
      { ...result, roundId: '' },
      { ...result, durationSeconds: 45 },
      { ...result, elapsedActiveMs: -1 },
      { ...result, elapsedActiveMs: 60_001 },
      { ...result, elapsedActiveMs: NaN },
      { ...result, startedAt: null },
      { ...result, finishedAt: 'invalid' },
      { ...result, deck: { ...result.deck, version: 0 } },
      { ...result, deck: { ...result.deck, title: '' } },
      { ...result, deck: { ...result.deck, language: 'unknown' } },
      { ...result, finishReason: 'timer-expired' },
      { ...result, finishReason: 'deck-exhausted' },
      { ...result, answers: [null] },
      { ...result, answers: [...result.answers, ...result.answers] },
      { ...result, answers: [{ ...result.answers[0], text: 'x'.repeat(121) }] },
      { ...result, answers: [{ ...result.answers[0], outcome: 'wrong' }] },
    ]
    for (const value of invalid) expect(isRoundResult(value)).toBe(false)
  })
})
