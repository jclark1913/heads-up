import type { Bank } from './banks'

export const deckLimits = {
  bytes: 1024 * 1024,
  cards: 2000,
  prompt: 120,
  title: 80,
} as const
export interface CustomBank extends Bank {
  source: 'custom'
  createdAt: string
  updatedAt: string
  sharedFrom?: string
}
export interface DraftCard {
  id: string
  text: string
  source: number
  importProblem?: string
  normalized?: boolean
}
export function promptProblem(text: string): string | null {
  if (!text.trim()) return 'Enter a word or remove this card.'
  if (/[\r\n]/.test(text)) return 'Keep each card on one line.'
  if ([...text.trim()].length > deckLimits.prompt)
    return 'Use 120 characters or fewer.'
  return null
}
export function titleProblem(title: string): string | null {
  if (!title.trim()) return 'Give your deck a name.'
  if ([...title.trim()].length > deckLimits.title)
    return 'Use 80 characters or fewer for the name.'
  if (/[\r\n]/.test(title)) return 'Keep the name on one line.'
  return null
}
export function reviewCards(cards: readonly DraftCard[]) {
  const seen = new Set<string>()
  const duplicateIds = new Set<string>()
  const problems = new Map<string, string>()
  const words: string[] = []
  const validWords = new Set<string>()
  for (const card of cards) {
    const text = card.text.trim()
    const problem = card.importProblem ?? promptProblem(text)
    if (problem) problems.set(card.id, problem)
    const key = text.normalize('NFC')
    if (!problem) validWords.add(key)
    if (seen.has(key)) duplicateIds.add(card.id)
    else if (text) {
      seen.add(key)
      words.push(text)
    }
  }
  return { words, duplicateIds, problems, validCount: validWords.size }
}
export function createCustomBank(
  title: string,
  cards: readonly DraftCard[],
): CustomBank {
  const problem = titleProblem(title)
  const review = reviewCards(cards)
  if (problem) throw new Error(problem)
  if (review.problems.size)
    throw new Error('Correct or remove the highlighted cards.')
  if (!review.words.length) throw new Error('Add at least one card.')
  if (review.words.length > deckLimits.cards)
    throw new Error('Use 2,000 cards or fewer.')
  const now = new Date().toISOString()
  return {
    schemaVersion: 1,
    version: 1,
    source: 'custom',
    id: 'custom-' + crypto.randomUUID(),
    title: title.trim(),
    description: 'Your words. Your game.',
    createdAt: now,
    updatedAt: now,
    prompts: review.words.map((text) => ({ id: crypto.randomUUID(), text })),
  }
}
export function draftFromBank(bank: CustomBank): DraftCard[] {
  return bank.prompts.map((prompt, index) => ({ ...prompt, source: index + 1 }))
}
export function reviseCustomBank(
  bank: CustomBank,
  title: string,
  cards: readonly DraftCard[],
): CustomBank {
  if (!isCustomBank(bank) || !Number.isSafeInteger(bank.version + 1))
    throw new Error('This saved deck cannot be edited by this version.')
  const validated = createCustomBank(title, cards)
  const originalIds = new Set(bank.prompts.map((prompt) => prompt.id))
  const firstCards = new Map<string, DraftCard>()
  for (const card of cards) {
    const key = card.text.trim().normalize('NFC')
    if (!firstCards.has(key)) firstCards.set(key, card)
  }
  return {
    ...bank,
    title: validated.title,
    version: bank.version + 1,
    updatedAt: validated.updatedAt,
    prompts: validated.prompts.map((prompt) => {
      const original = firstCards.get(prompt.text.normalize('NFC'))!
      return {
        ...prompt,
        id: originalIds.has(original.id) ? original.id : prompt.id,
      }
    }),
  }
}
export function isCustomBank(value: unknown): value is CustomBank {
  if (!value || typeof value !== 'object') return false
  const bank = value as Partial<CustomBank>
  if (
    bank.schemaVersion !== 1 ||
    bank.source !== 'custom' ||
    !Number.isSafeInteger(bank.version) ||
    bank.version! < 1 ||
    typeof bank.id !== 'string' ||
    !bank.id.startsWith('custom-') ||
    typeof bank.title !== 'string' ||
    titleProblem(bank.title) ||
    typeof bank.description !== 'string' ||
    (bank.sharedFrom !== undefined &&
      (typeof bank.sharedFrom !== 'string' ||
        !/^[a-f0-9]{64}$/.test(bank.sharedFrom))) ||
    (bank.language !== undefined &&
      bank.language !== 'en' &&
      bank.language !== 'ar') ||
    typeof bank.createdAt !== 'string' ||
    !Number.isFinite(Date.parse(bank.createdAt)) ||
    typeof bank.updatedAt !== 'string' ||
    !Number.isFinite(Date.parse(bank.updatedAt)) ||
    !Array.isArray(bank.prompts) ||
    !bank.prompts.length ||
    bank.prompts.length > deckLimits.cards
  )
    return false
  const ids = new Set<string>()
  const words = new Set<string>()
  for (const prompt of bank.prompts) {
    if (
      !prompt ||
      typeof prompt.id !== 'string' ||
      !prompt.id ||
      typeof prompt.text !== 'string' ||
      promptProblem(prompt.text) ||
      prompt.text !== prompt.text.trim() ||
      ids.has(prompt.id) ||
      words.has(prompt.text.normalize('NFC'))
    )
      return false
    ids.add(prompt.id)
    words.add(prompt.text.normalize('NFC'))
  }
  return true
}
