import { describe, expect, it } from 'vitest'
import {
  createCustomBank,
  draftFromBank,
  reviseCustomBank,
  deckLimits,
  isCustomBank,
  promptProblem,
  reviewCards,
} from './decks'
import { parseText } from './textImport'

describe('pasted deck text', () => {
  it('keeps phrases and punctuation with Lines, including BOM and common line endings', () => {
    expect(
      parseText('\uFEFF cat, dog\r\nNew York\rقِطَّة\n', 'lines'),
    ).toMatchObject({
      cards: [
        { text: 'cat, dog', source: 1 },
        { text: 'New York', source: 2 },
        { text: 'قِطَّة', source: 3 },
      ],
      emptyCount: 1,
    })
  })
  it('splits ordinary and Arabic commas, preserving internal spaces and diacritics', () => {
    expect(parseText(',cat, dog، New York\nقِطَّة،،', 'commas')).toMatchObject({
      cards: [
        { text: 'cat' },
        { text: 'dog' },
        { text: 'New York' },
        { text: 'قِطَّة' },
      ],
      emptyCount: 3,
    })
  })
  it('uses NFC only for duplicate comparison and keeps the first spelling', () => {
    const parsed = parseText('e\u0301, é,قطة,قِطَّة, Cat,cat', 'commas')
    expect(parsed.cards.map((card) => card.text)).toEqual([
      'e\u0301',
      'قطة',
      'قِطَّة',
      'Cat',
      'cat',
    ])
    expect(parsed.duplicateCount).toBe(1)
  })
  it('does not interpret quoted comma text as CSV', () => {
    expect(
      parseText('"New York, NY",cat', 'commas').cards.map((card) => card.text),
    ).toEqual(['"New York', 'NY"', 'cat'])
  })
  it('separates tabs and whitespace only when explicitly selected', () => {
    expect(
      parseText('New York\tقِطَّة\ncat', 'tabs').cards.map((card) => card.text),
    ).toEqual(['New York', 'قِطَّة', 'cat'])
    expect(
      parseText('New York\tقِطَّة\ncat', 'whitespace').cards.map(
        (card) => card.text,
      ),
    ).toEqual(['New', 'York', 'قِطَّة', 'cat'])
  })
  it('rejects byte and card limits without silently truncating', () => {
    expect(() =>
      parseText('ق'.repeat(deckLimits.bytes / 2 + 1), 'lines'),
    ).toThrow(/1 MiB/)
    expect(() =>
      parseText(
        Array.from({ length: 2001 }, (_, i) => String(i)).join('\n'),
        'lines',
      ),
    ).toThrow(/2,000/)
    expect(parseText('cat\n'.repeat(2001), 'lines').cards).toHaveLength(1)
  })
})
describe('validated custom decks', () => {
  it('counts Unicode code points and leaves invalid cards available for correction', () => {
    expect(promptProblem('😀'.repeat(120))).toBeNull()
    expect(promptProblem('😀'.repeat(121))).toMatch(/120/)
    const parsed = parseText('x'.repeat(121), 'lines')
    expect(parsed.cards).toHaveLength(1)
    expect(() => createCustomBank('Long', parsed.cards)).toThrow(/highlighted/)
  })
  it('validates edited text and removes newly introduced duplicates at save', () => {
    const cards = parseText('cat,dog', 'commas').cards
    cards[1].text = ' cat '
    expect(reviewCards(cards).duplicateIds.size).toBe(1)
    const bank = createCustomBank(' My deck ', cards)
    expect(bank.title).toBe('My deck')
    expect(bank.prompts.map((p) => p.text)).toEqual(['cat'])
    expect(isCustomBank(bank)).toBe(true)
    expect(bank.language).toBeUndefined()
    expect(createCustomBank('My deck', cards).id).not.toBe(bank.id)
  })
  it('requires a valid name and at least one nonblank card', () => {
    const cards = parseText('cat', 'lines').cards
    expect(() => createCustomBank(' ', cards)).toThrow(/name/)
    expect(() => createCustomBank('x'.repeat(81), cards)).toThrow(/80/)
    expect(() => createCustomBank('Deck', [])).toThrow(/at least/)
    cards[0].text = ' '
    expect(() => createCustomBank('Deck', cards)).toThrow(/highlighted/)
  })
  it('rejects malformed, future-schema, and duplicate-ID stored decks', () => {
    const bank = createCustomBank('Deck', parseText('cat,dog', 'commas').cards)
    for (const value of [
      null,
      {},
      { ...bank, schemaVersion: 2 },
      { ...bank, prompts: [null] },
      { ...bank, source: 'builtin' },
      { ...bank, createdAt: 'invalid' },
      {
        ...bank,
        prompts: [
          bank.prompts[0],
          { ...bank.prompts[1], id: bank.prompts[0].id },
        ],
      },
    ])
      expect(isCustomBank(value)).toBe(false)
  })
})

describe('saved deck revisions', () => {
  it('keeps identity, creation time, and existing card IDs without mutating the original', () => {
    const bank = createCustomBank(
      'Original',
      parseText('cat\nقِطَّة\ndog', 'lines').cards,
    )
    const before = structuredClone(bank)
    const cards = draftFromBank(bank)
    cards[0].text = 'New York'
    cards.pop()
    cards.push({ id: 'new-draft', text: 'Playing football', source: 4 })
    cards.push({ id: 'duplicate', text: ' New York ', source: 5 })
    const revised = reviseCustomBank(bank, ' Revised ', cards)
    expect(revised).toMatchObject({
      id: bank.id,
      createdAt: bank.createdAt,
      title: 'Revised',
      version: 2,
      prompts: [
        { id: bank.prompts[0].id, text: 'New York' },
        { id: bank.prompts[1].id, text: 'قِطَّة' },
        { text: 'Playing football' },
      ],
    })
    expect(revised.prompts[2].id).not.toBe('new-draft')
    expect(isCustomBank(revised)).toBe(true)
    expect(bank).toEqual(before)
  })
  it('replaces cards under the same bank identity but assigns fresh card IDs', () => {
    const bank = createCustomBank('Original', parseText('cat', 'lines').cards)
    const revised = reviseCustomBank(
      bank,
      bank.title,
      parseText('cat\nقِطَّة', 'lines').cards,
    )
    expect(revised.id).toBe(bank.id)
    expect(revised.version).toBe(2)
    expect(revised.prompts[0].id).not.toBe(bank.prompts[0].id)
    expect(() => reviseCustomBank(bank, '', draftFromBank(bank))).toThrow(
      /name/,
    )
    expect(() => reviseCustomBank(bank, 'Valid', [])).toThrow(/at least/)
    expect(() =>
      reviseCustomBank(
        { ...bank, version: Number.MAX_SAFE_INTEGER },
        'Valid',
        draftFromBank(bank),
      ),
    ).toThrow(/cannot be edited/)
  })
})
