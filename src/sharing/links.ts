import type { Bank } from '../content/banks'
import {
  createCustomBank,
  deckLimits,
  promptProblem,
  titleProblem,
} from '../content/decks'
import type { CustomBank } from '../content/decks'

export const shareLimits = {
  link: 8192,
  inflatedBytes: deckLimits.bytes,
} as const
export interface SharedDeck {
  v: 1
  title: string
  words: string[]
  language?: 'en' | 'ar'
}
export interface ReceivedDeck {
  deck: SharedDeck
  fingerprint: string
}

export function validateSharedDeck(value: unknown): SharedDeck {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('This deck link is invalid.')
  const deck = value as Partial<SharedDeck>
  if (
    Object.keys(value).some(
      (key) => !['v', 'title', 'words', 'language'].includes(key),
    ) ||
    deck.v !== 1 ||
    typeof deck.title !== 'string' ||
    titleProblem(deck.title) ||
    deck.title !== deck.title.trim() ||
    !Array.isArray(deck.words) ||
    !deck.words.length ||
    deck.words.length > deckLimits.cards ||
    (deck.language !== undefined &&
      deck.language !== 'en' &&
      deck.language !== 'ar')
  )
    throw new Error('This deck link is invalid or uses an unsupported version.')
  const seen = new Set<string>()
  for (const word of deck.words) {
    if (
      typeof word !== 'string' ||
      promptProblem(word) ||
      word !== word.trim() ||
      seen.has(word.normalize('NFC'))
    )
      throw new Error('This deck link contains invalid or duplicate cards.')
    seen.add(word.normalize('NFC'))
  }
  return {
    v: 1,
    title: deck.title,
    words: [...deck.words],
    ...(deck.language ? { language: deck.language } : {}),
  }
}
export function snapshotDeck(bank: Bank): SharedDeck {
  return validateSharedDeck({
    v: 1,
    title: bank.title,
    words: bank.prompts.map((p) => p.text),
    ...(bank.language ? { language: bank.language } : {}),
  })
}
async function limitedBytes(
  stream: ReadableStream<Uint8Array>,
  limit: number,
): Promise<Uint8Array<ArrayBuffer>> {
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.length
      if (size > limit) {
        await reader.cancel().catch(() => {})
        throw new Error(
          'This deck link is too large. Use a word-bank file instead.',
        )
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const result = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  return result
}
export async function createShareLink(
  deck: SharedDeck,
  appUrl: string,
): Promise<string> {
  if (typeof CompressionStream === 'undefined')
    throw new Error(
      'This browser cannot create deck links. Export a word-bank file instead.',
    )
  const valid = validateSharedDeck(deck)
  const bytes = new TextEncoder().encode(JSON.stringify(valid))
  if (bytes.length > shareLimits.inflatedBytes)
    throw new Error(
      'This deck is too large to share as a link. Export a file instead.',
    )
  const compressed = await limitedBytes(
    new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip')),
    shareLimits.inflatedBytes,
  )
  let binary = ''
  for (const byte of compressed) binary += String.fromCharCode(byte)
  const encoded = btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')
  const url = new URL(appUrl)
  if (!['https:', 'http:'].includes(url.protocol))
    throw new Error('Open the app using its published web address to share.')
  url.search = ''
  url.hash = 'deck=1.' + encoded
  if (url.href.length > shareLimits.link)
    throw new Error(
      'This deck is too large to share as a link. Export a file or split it into smaller decks.',
    )
  return url.href
}
export async function readShareLink(input: string): Promise<ReceivedDeck> {
  if (input.length > shareLimits.link)
    throw new Error(
      'This deck link is too large. Ask for a word-bank file instead.',
    )
  const trimmed = input.trim()
  let hash: string
  try {
    if (trimmed.startsWith('#')) hash = trimmed
    else {
      const url = new URL(trimmed)
      if (!['https:', 'http:'].includes(url.protocol)) throw new Error()
      hash = url.hash
    }
  } catch {
    throw new Error('Paste a complete deck-sharing link.')
  }
  const match = /^#deck=1\.([A-Za-z0-9_-]+)$/.exec(hash)
  if (!match)
    throw new Error(
      'This deck link is incomplete or uses an unsupported version.',
    )
  if (typeof DecompressionStream === 'undefined')
    throw new Error(
      'This browser cannot open deck links. Ask for a word-bank file instead.',
    )
  let parsed: unknown
  try {
    const encoded = match[1].replaceAll('-', '+').replaceAll('_', '/')
    const binary = atob(encoded + '='.repeat((4 - (encoded.length % 4)) % 4))
    const compressed = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    const inflated = await limitedBytes(
      new Blob([compressed])
        .stream()
        .pipeThrough(new DecompressionStream('gzip')),
      shareLimits.inflatedBytes,
    )
    parsed = JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(inflated),
    )
  } catch {
    throw new Error(
      'This deck link could not be read. Ask for a fresh link or a word-bank file.',
    )
  }
  const deck = validateSharedDeck(parsed)
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify(deck)),
  )
  const fingerprint = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
  return { deck, fingerprint }
}
export function receivedCopy(received: ReceivedDeck): CustomBank {
  const deck = validateSharedDeck(received.deck)
  return {
    ...createCustomBank(
      deck.title,
      deck.words.map((text, i) => ({ id: String(i), text, source: i + 1 })),
    ),
    ...(deck.language ? { language: deck.language } : {}),
    sharedFrom: received.fingerprint,
  }
}
