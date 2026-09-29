import type { Bank } from '../content/banks'
import { deckLimits, promptProblem, titleProblem } from '../content/decks'
import { isDuration } from '../platform/preferences'
import type { DurationSeconds } from '../platform/preferences'
import type { PlayedPrompt, Round } from './engine'

export interface RoundResult {
  schemaVersion: 1
  roundId: string
  deck: Pick<Bank, 'id' | 'title' | 'version' | 'source' | 'language'>
  durationSeconds: DurationSeconds
  startedAt: string | null
  finishedAt: string
  elapsedActiveMs: number
  finishReason: NonNullable<Round['finishReason']>
  answers: PlayedPrompt[]
}
export function createResult(round: Round, bank: Bank): RoundResult {
  if (
    round.phase !== 'finished' ||
    !round.finishReason ||
    round.finishedAt === null ||
    !isDuration(round.durationMs / 1000)
  )
    throw new Error('Only finished rounds can be saved.')
  return {
    schemaVersion: 1,
    roundId: round.id,
    deck: {
      id: bank.id,
      title: bank.title,
      version: bank.version,
      source: bank.source,
      ...(bank.language ? { language: bank.language } : {}),
    },
    durationSeconds: (round.durationMs / 1000) as DurationSeconds,
    startedAt:
      round.startedAt === null ? null : new Date(round.startedAt).toISOString(),
    finishedAt: new Date(round.finishedAt).toISOString(),
    elapsedActiveMs: Math.max(
      0,
      Math.min(round.durationMs, round.durationMs - round.remainingMs),
    ),
    finishReason: round.finishReason,
    answers: round.answers.map(({ id, text, outcome }) => ({
      id,
      text,
      outcome,
    })),
  }
}
const validId = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 200
const validDate = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.length <= 40 &&
  Number.isFinite(Date.parse(value))

export function isRoundResult(value: unknown): value is RoundResult {
  if (!value || typeof value !== 'object') return false
  const result = value as Partial<RoundResult>
  const deck = result.deck
  if (
    result.schemaVersion !== 1 ||
    !validId(result.roundId) ||
    !deck ||
    typeof deck !== 'object' ||
    !validId(deck.id) ||
    typeof deck.title !== 'string' ||
    titleProblem(deck.title) ||
    !Number.isSafeInteger(deck.version) ||
    deck.version < 1 ||
    (deck.source !== 'builtin' && deck.source !== 'custom') ||
    (deck.language !== undefined &&
      deck.language !== 'en' &&
      deck.language !== 'ar') ||
    !isDuration(result.durationSeconds) ||
    (result.startedAt !== null && !validDate(result.startedAt)) ||
    !validDate(result.finishedAt) ||
    typeof result.elapsedActiveMs !== 'number' ||
    !Number.isFinite(result.elapsedActiveMs) ||
    result.elapsedActiveMs < 0 ||
    result.elapsedActiveMs > result.durationSeconds * 1000 ||
    !['timer-expired', 'deck-exhausted', 'ended-by-user'].includes(
      result.finishReason ?? '',
    ) ||
    !Array.isArray(result.answers) ||
    result.answers.length > deckLimits.cards
  )
    return false
  const ids = new Set<string>()
  for (const [index, answer] of result.answers.entries()) {
    if (
      !answer ||
      typeof answer !== 'object' ||
      !validId(answer.id) ||
      ids.has(answer.id) ||
      typeof answer.text !== 'string' ||
      promptProblem(answer.text) ||
      answer.text !== answer.text.trim() ||
      !['correct', 'passed', 'unanswered'].includes(answer.outcome) ||
      (answer.outcome === 'unanswered' && index !== result.answers.length - 1)
    )
      return false
    ids.add(answer.id)
  }
  if (
    result.startedAt === null &&
    (result.answers.length !== 0 ||
      result.elapsedActiveMs !== 0 ||
      result.finishReason !== 'ended-by-user')
  )
    return false
  if (
    result.finishReason === 'timer-expired' &&
    result.elapsedActiveMs !== result.durationSeconds * 1000
  )
    return false
  if (
    result.finishReason === 'deck-exhausted' &&
    (!result.answers.length ||
      result.answers.some((answer) => answer.outcome === 'unanswered'))
  )
    return false
  return true
}
