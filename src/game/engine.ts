import type { Prompt } from '../content/banks'

export type Mode = 'motion' | 'manual'
export type Answer = 'correct' | 'passed'
export type Phase =
  'preparing' | 'playing' | 'feedback' | 'interrupted' | 'finished'
export interface Clock {
  mono: number
  wall: number
}
export interface PlayedPrompt extends Prompt {
  outcome: Answer | 'unanswered'
}
export interface Round {
  id: string
  mode: Mode
  phase: Phase
  prompts: Prompt[]
  index: number
  displayed: boolean
  answers: PlayedPrompt[]
  actionIds: string[]
  durationMs: number
  remainingMs: number
  prepareUntil: number
  deadlineMono: number | null
  deadlineWall: number | null
  feedbackUntil: number
  lastClock: Clock
  lastAnswer: Answer | null
  reason: string
  finishReason: 'timer-expired' | 'deck-exhausted' | 'ended-by-user' | null
}
export type Command =
  | { type: 'tick'; ready: boolean; neutral: boolean }
  | {
      type: 'answer'
      actionId: string
      promptId: string
      source: Mode
      answer: Answer
    }
  | { type: 'pause'; reason: string }
  | { type: 'resume' }
  | { type: 'mode'; mode: Mode }
  | { type: 'end' }

export function createRound(
  id: string,
  prompts: readonly Prompt[],
  mode: Mode,
  now: Clock,
  durationMs = 60_000,
): Round {
  if (
    !prompts.length ||
    prompts.some((p) => !p.text.trim()) ||
    new Set(prompts.map((p) => p.id)).size !== prompts.length
  ) {
    throw new Error('A round needs a nonempty bank with unique prompt IDs.')
  }
  return {
    id,
    mode,
    phase: 'preparing',
    prompts: prompts.map((p) => ({ ...p })),
    index: 0,
    displayed: false,
    answers: [],
    actionIds: [],
    durationMs,
    remainingMs: durationMs,
    prepareUntil: now.mono + 3000,
    deadlineMono: null,
    deadlineWall: null,
    feedbackUntil: 0,
    lastClock: now,
    lastAnswer: null,
    reason: '',
    finishReason: null,
  }
}

export function remaining(round: Round, now: Clock): number {
  if (round.deadlineMono === null || round.deadlineWall === null)
    return round.remainingMs
  return Math.max(
    0,
    Math.min(
      round.remainingMs,
      round.deadlineMono - now.mono,
      round.deadlineWall - now.wall,
    ),
  )
}

function finish(round: Round, why: Round['finishReason']): Round {
  const answers = [...round.answers]
  if (round.displayed)
    answers.push({ ...round.prompts[round.index], outcome: 'unanswered' })
  return {
    ...round,
    phase: 'finished',
    displayed: false,
    answers,
    deadlineMono: null,
    deadlineWall: null,
    finishReason: why,
    remainingMs: why === 'timer-expired' ? 0 : round.remainingMs,
  }
}
function interrupt(round: Round, reason: string): Round {
  return {
    ...round,
    phase: 'interrupted',
    index: round.phase === 'feedback' ? round.index + 1 : round.index,
    displayed: round.phase === 'feedback' ? false : round.displayed,
    deadlineMono: null,
    deadlineWall: null,
    reason,
  }
}

export function stepRound(
  previous: Round,
  roundId: string,
  command: Command,
  now: Clock,
): Round {
  if (roundId !== previous.id || previous.phase === 'finished') return previous
  let round: Round = { ...previous, lastClock: now }
  const active = previous.phase === 'playing' || previous.phase === 'feedback'
  if (active) {
    round.remainingMs = remaining(previous, now)
    if (round.remainingMs <= 0) return finish(round, 'timer-expired')
    const monoGap = now.mono - previous.lastClock.mono
    const wallGap = now.wall - previous.lastClock.wall
    // A missed visibility event must neither grant time nor let queued input score.
    if (
      command.type !== 'pause' &&
      (monoGap > 1500 ||
        wallGap > 1500 ||
        monoGap < 0 ||
        Math.abs(wallGap - monoGap) > 1000)
    ) {
      return interrupt(
        round,
        'The app was interrupted. Get ready, then resume.',
      )
    }
  }
  if (command.type === 'end') return finish(round, 'ended-by-user')
  if (command.type === 'pause') {
    return round.phase === 'interrupted'
      ? round
      : interrupt(round, command.reason)
  }
  if (command.type === 'mode') {
    return round.phase === 'interrupted'
      ? { ...round, mode: command.mode }
      : round
  }
  if (command.type === 'resume') {
    return round.phase === 'interrupted'
      ? {
          ...round,
          phase: 'preparing',
          prepareUntil: now.mono + 3000,
          reason: '',
          lastAnswer: null,
        }
      : round
  }
  if (command.type === 'answer') {
    if (
      round.phase !== 'playing' ||
      command.source !== round.mode ||
      command.promptId !== round.prompts[round.index]?.id ||
      round.actionIds.includes(command.actionId)
    )
      return round
    round = {
      ...round,
      answers: [
        ...round.answers,
        { ...round.prompts[round.index], outcome: command.answer },
      ],
      actionIds: [...round.actionIds, command.actionId],
      displayed: false,
      lastAnswer: command.answer,
    }
    if (round.index + 1 === round.prompts.length)
      return finish(round, 'deck-exhausted')
    return { ...round, phase: 'feedback', feedbackUntil: now.mono + 300 }
  }
  if (
    round.phase === 'preparing' &&
    now.mono >= round.prepareUntil &&
    command.ready
  ) {
    return {
      ...round,
      phase: 'playing',
      displayed: true,
      deadlineMono: now.mono + round.remainingMs,
      deadlineWall: now.wall + round.remainingMs,
    }
  }
  if (
    round.phase === 'feedback' &&
    now.mono >= round.feedbackUntil &&
    (round.mode === 'manual' || command.neutral)
  ) {
    return {
      ...round,
      phase: 'playing',
      index: round.index + 1,
      displayed: true,
      lastAnswer: null,
    }
  }
  return round
}
