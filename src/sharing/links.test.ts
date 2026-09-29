// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { gzipSync } from 'node:zlib'
import {
  createCustomBank,
  isCustomBank,
  reviseCustomBank,
  draftFromBank,
} from '../content/decks'
import {
  createShareLink,
  readShareLink,
  receivedCopy,
  snapshotDeck,
  validateSharedDeck,
} from './links'
const base = 'https://example.github.io/heads-up/'
const deck = {
  v: 1 as const,
  title: 'كلمات الصف',
  words: ['قِطَّة', 'New York', 'Playing football'],
  language: 'ar' as const,
}
const encoded = (value: unknown) =>
  base + '#deck=1.' + gzipSync(JSON.stringify(value)).toString('base64url')
afterEach(() => vi.unstubAllGlobals())

describe('portable deck links', () => {
  it('round trips Arabic, diacritics, phrases and the Pages base path', async () => {
    const link = await createShareLink(deck, base + '?debug=1#old')
    expect(link.startsWith(base + '#deck=1.')).toBe(true)
    expect(new URL(link).search).toBe('')
    expect((await readShareLink(link)).deck).toEqual(deck)
    expect(await readShareLink(new URL(link).hash)).toEqual(
      await readShareLink(link),
    )
  })
  it('projects only shared content and gives every copy fresh IDs', async () => {
    const bank = createCustomBank('My list', [
      { id: 'draft', text: 'Cat', source: 1 },
    ])
    const snapshot = snapshotDeck(bank)
    expect(Object.keys(snapshot).sort()).toEqual(['title', 'v', 'words'])
    const received = await readShareLink(await createShareLink(snapshot, base))
    const first = receivedCopy(received),
      second = receivedCopy(received)
    expect(isCustomBank(first)).toBe(true)
    expect(first.id).not.toBe(bank.id)
    expect(first.id).not.toBe(second.id)
    expect(first.prompts[0].id).not.toBe(second.prompts[0].id)
    const edited = reviseCustomBank(first, 'Edited', draftFromBank(first))
    expect(edited.sharedFrom).toBe(received.fingerprint)
    expect(isCustomBank({ ...first, sharedFrom: 'invalid' })).toBe(false)
  })
  it('fingerprints content independent of JSON order and tracks snapshot changes', async () => {
    const first = await readShareLink(encoded(deck))
    const reordered = await readShareLink(
      encoded({ words: deck.words, language: 'ar', v: 1, title: deck.title }),
    )
    expect(reordered.fingerprint).toBe(first.fingerprint)
    expect(
      (
        await readShareLink(
          encoded({ ...deck, words: [...deck.words].reverse() }),
        )
      ).fingerprint,
    ).not.toBe(first.fingerprint)
    expect(
      (await readShareLink(encoded({ ...deck, title: 'Changed' }))).fingerprint,
    ).not.toBe(first.fingerprint)
  })
  it.each([
    null,
    { ...deck, v: 2 },
    { ...deck, owner: 'hidden' },
    { ...deck, title: ' ' },
    { ...deck, words: [] },
    { ...deck, words: [3] },
    { ...deck, words: [' Cat'] },
    { ...deck, words: ['x'.repeat(121)] },
    { ...deck, words: ['two\nlines'] },
    { ...deck, words: ['é', 'e\u0301'] },
    { ...deck, language: 'xx' },
    { ...deck, words: Array.from({ length: 2001 }, (_, i) => String(i)) },
  ])('rejects malformed or unsupported deck content %#', async (value) => {
    await expect(readShareLink(encoded(value))).rejects.toThrow()
  })
  it('treats markup as literal card text', () => {
    expect(
      validateSharedDeck({ ...deck, words: ['<img src=x onerror=alert(1)>'] })
        .words[0],
    ).toContain('<img')
  })
  it('rejects bad URLs, broken gzip, invalid UTF-8 and decompression bombs', async () => {
    for (const link of [
      'javascript:alert(1)',
      base + '#deck=2.abc',
      base + '#deck=1.abc',
      base + '#deck=1.%%%',
    ]) {
      await expect(readShareLink(link)).rejects.toThrow()
    }
    const invalid =
      base +
      '#deck=1.' +
      gzipSync(Buffer.from([0xff, 0xfe])).toString('base64url')
    await expect(readShareLink(invalid)).rejects.toThrow('could not be read')
    const bomb =
      base +
      '#deck=1.' +
      gzipSync(' '.repeat(2 * 1024 * 1024)).toString('base64url')
    expect(bomb.length).toBeLessThan(8192)
    await expect(readShareLink(bomb)).rejects.toThrow('could not be read')
  })
  it('refuses oversized links without dropping cards', async () => {
    const large = {
      ...deck,
      words: Array.from({ length: 1000 }, () => crypto.randomUUID()),
    }
    await expect(createShareLink(large, base)).rejects.toThrow('Export a file')
    await expect(readShareLink('x'.repeat(8193))).rejects.toThrow('too large')
  })
  it('provides file fallbacks when compression APIs are unavailable', async () => {
    vi.stubGlobal('CompressionStream', undefined)
    await expect(createShareLink(deck, base)).rejects.toThrow(
      'Export a word-bank file',
    )
    vi.stubGlobal('DecompressionStream', undefined)
    await expect(readShareLink(encoded(deck))).rejects.toThrow('word-bank file')
  })
})
