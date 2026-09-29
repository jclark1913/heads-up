import { deckLimits } from './decks'
import type { DraftCard } from './decks'

export interface ImportPreview {
  cards: DraftCard[]
  emptyCount: number
  duplicateCount: number
  normalizedCount: number
  title?: string
}

export function checkInputSize(input: string) {
  if (new TextEncoder().encode(input).length > deckLimits.bytes)
    throw new Error(
      'This list is larger than 1 MiB. Choose a smaller file or list.',
    )
}

export function collectCards(
  entries: readonly unknown[],
  { firstSource = 1, flattenNewlines = false } = {},
): ImportPreview {
  const cards: DraftCard[] = []
  const seen = new Set<string>()
  let emptyCount = 0
  let duplicateCount = 0
  let normalizedCount = 0
  entries.forEach((entry, index) => {
    const source = index + firstSource
    if (typeof entry !== 'string') {
      cards.push({
        id: 'entry-' + source,
        source,
        text: '',
        importProblem:
          'This entry is not text. Enter a word or remove this card.',
      })
    } else {
      const normalized = flattenNewlines && /[\r\n]/.test(entry)
      const text = (
        normalized ? entry.replace(/\r\n|[\r\n]/g, ' ') : entry
      ).trim()
      if (normalized) normalizedCount++
      if (!text) {
        emptyCount++
        return
      }
      const key = text.normalize('NFC')
      if (seen.has(key)) {
        duplicateCount++
        return
      }
      seen.add(key)
      cards.push({ id: 'entry-' + source, text, source, normalized })
    }
    if (cards.length > deckLimits.cards)
      throw new Error(
        'This list has more than 2,000 different cards. Split it into smaller decks.',
      )
  })
  return { cards, emptyCount, duplicateCount, normalizedCount }
}
