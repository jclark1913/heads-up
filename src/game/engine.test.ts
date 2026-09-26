import { describe, expect, it } from 'vitest'
import { createRound, stepRound } from './engine'
import type { Clock, Mode, Round } from './engine'
const cards = [
  { id: 'a', text: 'New York' },
  { id: 'b', text: 'قطة' },
  { id: 'c', text: 'Penguin' },
]
const at = (mono: number, wall = 10_000 + mono): Clock => ({ mono, wall })
const tick = (round: Round, mono: number, neutral = true) =>
  stepRound(round, round.id, { type: 'tick', ready: true, neutral }, at(mono))
function playing(mode: Mode = 'manual', duration = 1000) {
  return tick(createRound('r', cards, mode, at(0), duration), 3000)
}
function answer(
  round: Round,
  mono: number,
  actionId = '1',
  source = round.mode,
) {
  return stepRound(
    round,
    'r',
    {
      type: 'answer',
      answer: 'correct',
      source,
      actionId,
      promptId: round.prompts[round.index].id,
    },
    at(mono),
  )
}
describe('round engine', () => {
  it('starts the deadline with the first card, after preparation and readiness', () => {
    const round = createRound('r', cards, 'motion', at(0))
    const waiting = stepRound(
      round,
      'r',
      { type: 'tick', ready: false, neutral: false },
      at(9000),
    )
    expect(waiting.phase).toBe('preparing')
    expect(waiting.remainingMs).toBe(60_000)
    const start = tick(waiting, 10_000)
    expect(start.deadlineMono).toBe(70_000)
    expect(start.displayed).toBe(true)
  })
  it('snapshots prompts and rejects an empty bank', () => {
    const input = cards.map((card) => ({ ...card }))
    const round = createRound('r', input, 'manual', at(0))
    input[0].text = 'Changed'
    expect(round.prompts[0].text).toBe('New York')
    expect(() => createRound('r', [], 'manual', at(0))).toThrow()
  })
  it('scores once and rejects stale action, prompt, source, and round IDs', () => {
    let round = answer(playing(), 3100)
    expect(round.answers).toHaveLength(1)
    round = answer(round, 3120, '2')
    expect(round.answers).toHaveLength(1)
    round = tick(round, 3400)
    expect(round.index).toBe(1)
    expect(answer(round, 3410, '1').answers).toHaveLength(1)
    expect(answer(round, 3410, '2', 'motion').answers).toHaveLength(1)
    expect(stepRound(round, 'old', { type: 'end' }, at(3420))).toBe(round)
    expect(
      stepRound(
        round,
        'r',
        {
          type: 'answer',
          answer: 'passed',
          actionId: '3',
          source: 'manual',
          promptId: 'a',
        },
        at(3420),
      ).answers,
    ).toHaveLength(1)
  })
  it('accepts immediately before expiry and rejects at the deadline', () => {
    const accepted = answer(playing(), 3999)
    expect(accepted.answers[0].outcome).toBe('correct')
    const ended = answer(accepted, 4000, '2')
    expect(ended.phase).toBe('finished')
    expect(ended.answers).toHaveLength(1)
    const expired = answer(playing(), 4000)
    expect(expired.answers).toEqual([{ ...cards[0], outcome: 'unanswered' }])
  })
  it('does not reveal a new card until feedback time and neutral have both passed', () => {
    const feedback = answer(playing('motion'), 3100)
    expect(tick(feedback, 3399).phase).toBe('feedback')
    const held = tick(feedback, 3500, false)
    expect(held.phase).toBe('feedback')
    expect(held.remainingMs).toBe(500)
    expect(tick(held, 3600, true).index).toBe(1)
  })
  it('pauses a shown card, preserves its time, and resumes through preparation', () => {
    const paused = stepRound(
      playing(),
      'r',
      { type: 'pause', reason: 'hidden' },
      at(3500),
    )
    expect(paused.remainingMs).toBe(500)
    const prep = stepRound(paused, 'r', { type: 'resume' }, at(30_000))
    expect(prep.phase).toBe('preparing')
    const resumed = tick(prep, 33_000)
    expect(resumed.index).toBe(0)
    expect(resumed.deadlineMono).toBe(33_500)
    expect(
      stepRound(paused, 'r', { type: 'end' }, at(30_000)).answers[0].outcome,
    ).toBe('unanswered')
  })
  it('resumes with the next unused card after interruption during feedback', () => {
    const paused = stepRound(
      answer(playing(), 3100),
      'r',
      { type: 'pause', reason: 'hidden' },
      at(3200),
    )
    const resumed = tick(
      stepRound(paused, 'r', { type: 'resume' }, at(9000)),
      12_000,
    )
    expect(resumed.index).toBe(1)
    expect(resumed.answers).toHaveLength(1)
  })
  it('counts missed suspension wall time and interrupts without scoring queued input', () => {
    const round = playing('motion', 60_000)
    const resumed = stepRound(
      round,
      'r',
      {
        type: 'answer',
        answer: 'correct',
        source: 'motion',
        actionId: '1',
        promptId: 'a',
      },
      at(3001, 20_000),
    )
    expect(resumed.phase).toBe('interrupted')
    expect(resumed.remainingMs).toBe(53_000)
    expect(resumed.answers).toHaveLength(0)
    expect(tick(round, 70_000).finishReason).toBe('timer-expired')
  })
  it('switches input only while interrupted and rejects the old source after resume', () => {
    const start = playing('motion')
    expect(
      stepRound(start, 'r', { type: 'mode', mode: 'manual' }, at(3050)).mode,
    ).toBe('motion')
    const paused = stepRound(
      start,
      'r',
      { type: 'pause', reason: 'controls' },
      at(3100),
    )
    const switched = stepRound(
      paused,
      'r',
      { type: 'mode', mode: 'manual' },
      at(3150),
    )
    const resumed = tick(
      stepRound(switched, 'r', { type: 'resume' }, at(3200)),
      6200,
    )
    expect(answer(resumed, 6210, 'a', 'motion').answers).toHaveLength(0)
    expect(answer(resumed, 6210, 'a', 'manual').answers).toHaveLength(1)
  })
  it('finishes an exhausted bank once without inventing unseen cards', () => {
    const start = tick(
      createRound('r', cards.slice(0, 1), 'manual', at(0)),
      3000,
    )
    const end = answer(start, 3050)
    expect(end.finishReason).toBe('deck-exhausted')
    expect(end.answers).toHaveLength(1)
    expect(tick(end, 4000)).toBe(end)
  })
})
