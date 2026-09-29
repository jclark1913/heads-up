import { describe, expect, it, vi } from 'vitest'
import { createCustomBank, deckLimits, reviewCards } from './decks'
import {
  decodeWordFile,
  formatForFile,
  parseCsv,
  parseJson,
  readCsv,
  readWordFile,
} from './fileImport'

const csvOptions = { delimiter: ',' as const, header: false, column: 0 }
const bytes = (text: string) => new TextEncoder().encode(text).buffer

describe('UTF-8 word files', () => {
  it('decodes BOM and Arabic spelling without changing line endings or joining characters', () => {
    expect(decodeWordFile(bytes('\uFEFFقِطَّة\r\nن\u200Dص'))).toBe(
      'قِطَّة\r\nن\u200Dص',
    )
    expect(formatForFile('vocabulary.CSV')).toBe('csv')
    expect(formatForFile('words.JSON')).toBe('json')
    expect(formatForFile('words.txt')).toBe('text')
    expect(() => formatForFile('words.csv.exe')).toThrow(/\.txt/)
  })
  it.each([
    [0xff, 0xfe, 0x41, 0],
    [0xc3, 0x28],
    [0x41, 0, 0x42, 0],
  ])(
    'rejects malformed UTF-8 and UTF-16 instead of replacing characters: %s',
    (...octets) => {
      expect(() => decodeWordFile(new Uint8Array(octets).buffer)).toThrow(
        /UTF-8/,
      )
    },
  )
  it('rejects oversized files before reading and catches file access failures', async () => {
    const arrayBuffer = vi.fn()
    await expect(
      readWordFile({
        name: 'large.txt',
        size: deckLimits.bytes + 1,
        arrayBuffer,
      } as unknown as File),
    ).rejects.toThrow(/1 MiB/)
    expect(arrayBuffer).not.toHaveBeenCalled()
    await expect(
      readWordFile({
        name: 'words.txt',
        size: 1,
        arrayBuffer: () => Promise.reject(new Error('gone')),
      } as unknown as File),
    ).rejects.toThrow(/could not be opened/)
    expect(() => decodeWordFile(new ArrayBuffer(deckLimits.bytes + 1))).toThrow(
      /1 MiB/,
    )
  })
  it('returns the explicitly named format, leaving malformed JSON for the JSON parser', async () => {
    await expect(
      readWordFile({
        name: 'bad.json',
        size: 3,
        arrayBuffer: async () => bytes('bad'),
      } as File),
    ).resolves.toEqual({ input: 'bad', format: 'json' })
  })
})

describe('CSV selection', () => {
  it('preserves quoted commas, escaped quotes, numeric strings, and selected Arabic cells', () => {
    const parsed = parseCsv(
      '\uFEFFid,word\r\n1,"New York, NY"\r\n2,"say ""hello"""\r\n3,قِطَّة\r\n4,001\r\n5,true',
      {
        ...csvOptions,
        header: true,
        column: 1,
      },
    )
    expect(parsed.cards.map((card) => card.text)).toEqual([
      'New York, NY',
      'say "hello"',
      'قِطَّة',
      '001',
      'true',
    ])
    expect(parsed.cards[0].source).toBe(2)
  })
  it.each(['\n', '\r\n', '\r'])(
    'handles line endings, empty rows, and duplicates with source records: %j',
    (newline) => {
      const parsed = parseCsv(
        ['cat', '', 'cat', 'dog', ''].join(newline),
        csvOptions,
      )
      expect(parsed.cards.map((card) => [card.text, card.source])).toEqual([
        ['cat', 1],
        ['dog', 4],
      ])
      expect(parsed.emptyCount).toBe(2)
      expect(parsed.duplicateCount).toBe(1)
    },
  )
  it('keeps the first row unless a header is explicitly selected', () => {
    expect(
      parseCsv('cat\ndog', csvOptions).cards.map((card) => card.text),
    ).toEqual(['cat', 'dog'])
    expect(
      parseCsv('cat\ndog', { ...csvOptions, header: true }).cards[0],
    ).toMatchObject({ text: 'dog', source: 2 })
  })
  it('flattens embedded newlines visibly and supports explicit semicolon/tab separators', () => {
    const parsed = parseCsv(
      'word;note\n"New\r\nYork";ignored\nقِطَّة;ignored',
      { ...csvOptions, delimiter: ';', header: true },
    )
    expect(parsed.cards[0]).toMatchObject({
      text: 'New York',
      normalized: true,
      source: 2,
    })
    expect(parsed.normalizedCount).toBe(1)
    expect(
      parseCsv('word\tnote\nقِطَّة\tx', {
        ...csvOptions,
        delimiter: '\t',
        header: true,
      }).cards[0].text,
    ).toBe('قِطَّة')
  })
  it('rejects broken quoting, inconsistent records, invalid selections, and excessive columns', () => {
    expect(() => readCsv('word\n"unterminated', ',')).toThrow(/CSV/)
    expect(() => readCsv('a,b\nc', ',')).toThrow(/record 2/)
    expect(() => parseCsv('a,b', { ...csvOptions, column: 2 })).toThrow(
      /column/,
    )
    expect(() => parseCsv('a,b', { ...csvOptions, column: -1 })).toThrow(
      /column/,
    )
    expect(() => readCsv(Array(101).fill('word').join(','), ',')).toThrow(
      /100 columns/,
    )
  })
})

describe('JSON word banks', () => {
  it('accepts lists and named decks, preserving mixed scripts and distinct diacritics', () => {
    const parsed = parseJson(
      '\uFEFF' +
        JSON.stringify({
          title: 'الدرس الأول',
          words: ['قطة', 'قِطَّة', 'New York', 'e\u0301', 'é', '', 'cat\ndog'],
        }),
    )
    expect(parsed.title).toBe('الدرس الأول')
    expect(parsed.cards.map((card) => card.text)).toEqual([
      'قطة',
      'قِطَّة',
      'New York',
      'e\u0301',
      'cat dog',
    ])
    expect(parsed).toMatchObject({
      duplicateCount: 1,
      emptyCount: 1,
      normalizedCount: 1,
    })
    expect(parseJson('["New York", "<b>cat</b>"]').cards[1].text).toBe(
      '<b>cat</b>',
    )
  })
  it('retains non-string entries as flagged editable cards without coercion', () => {
    const parsed = parseJson(
      '["cat", 12, null, {"word":"dog"}, ["bird"], true]',
    )
    expect(parsed.cards).toHaveLength(6)
    expect(
      parsed.cards
        .slice(1)
        .every((card) => card.text === '' && card.importProblem),
    ).toBe(true)
    expect(parsed.cards[3].source).toBe(4)
    expect(reviewCards(parsed.cards).validCount).toBe(1)
    expect(() => createCustomBank('Draft', parsed.cards)).toThrow(/highlighted/)
    const corrected = [
      parsed.cards[0],
      { ...parsed.cards[1], text: 'dog', importProblem: undefined },
    ]
    expect(
      createCustomBank('Draft', corrected).prompts.map((prompt) => prompt.text),
    ).toEqual(['cat', 'dog'])
  })
  it.each([
    '{"words":',
    '{"cards":["cat"]}',
    '{"words":"cat"}',
    '{"words":["cat"],"title":12}',
    'null',
    '12',
    '{"words":["cat"],"nested":{"words":["dog"]}}',
  ])('rejects malformed or unsupported JSON: %s', (input) => {
    expect(() => parseJson(input)).toThrow(/JSON/)
  })
  it('preserves overlong text for correction rather than truncating', () => {
    const text = '😀'.repeat(121)
    const parsed = parseJson(JSON.stringify([text]))
    expect(parsed.cards[0].text).toBe(text)
    expect(reviewCards(parsed.cards).problems.size).toBe(1)
    expect(reviewCards(parsed.cards).validCount).toBe(0)
  })
  it('enforces input/card boundaries across structured formats', () => {
    const words = Array.from({ length: 2000 }, (_, index) => 'word ' + index)
    expect(parseJson(JSON.stringify(words)).cards).toHaveLength(2000)
    expect(parseCsv(words.join('\n'), csvOptions).cards).toHaveLength(2000)
    expect(() => parseJson(JSON.stringify([...words, 'extra']))).toThrow(
      /2,000/,
    )
    expect(() => parseCsv([...words, 'extra'].join('\n'), csvOptions)).toThrow(
      /2,000/,
    )
    expect(() => parseJson(' '.repeat(deckLimits.bytes + 1))).toThrow(/1 MiB/)
    expect(() =>
      parseCsv(' '.repeat(deckLimits.bytes + 1), csvOptions),
    ).toThrow(/1 MiB/)
  })
})
