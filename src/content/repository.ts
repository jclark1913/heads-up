import { isCustomBank } from './decks'
import type { CustomBank } from './decks'

export interface DeckRepository {
  list(): Promise<{ banks: CustomBank[]; skipped: number }>
  add(bank: CustomBank): Promise<void>
  get(id: string): Promise<CustomBank | null>
  update(bank: CustomBank, expectedVersion: number): Promise<void>
  remove(id: string, expectedVersion: number): Promise<void>
}
export class DeckConflictError extends Error {
  constructor(readonly reason: 'changed' | 'missing' | 'unreadable') {
    super(
      reason === 'changed'
        ? 'This deck changed in another tab. Reload the saved deck or save your edits as a new deck.'
        : reason === 'missing'
          ? 'This deck was deleted in another tab. You can save your edits as a new deck.'
          : 'This saved deck cannot be read by this version. Its stored data has been kept.',
    )
    this.name = 'DeckConflictError'
  }
}
const databaseName = 'heads-up.decks'
const storeName = 'banks'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let settled = false
    const timeout = setTimeout(() => {
      settled = true
      reject(
        new Error(
          'Deck storage did not respond. Close other game tabs and retry.',
        ),
      )
    }, 5000)
    const fail = (message: string) => {
      settled = true
      clearTimeout(timeout)
      reject(new Error(message))
    }
    let request: IDBOpenDBRequest
    try {
      request = indexedDB.open(databaseName, 1)
    } catch {
      fail('Deck storage is unavailable in this browser.')
      return
    }
    request.onupgradeneeded = () => {
      // Future migrations must retain existing stores and records.
      if (!request.result.objectStoreNames.contains(storeName))
        request.result.createObjectStore(storeName, { keyPath: 'id' })
    }
    request.onerror = () => fail('Deck storage could not be opened. Try again.')
    request.onblocked = () =>
      fail('Close other game tabs, then retry deck storage.')
    request.onsuccess = () => {
      clearTimeout(timeout)
      const db = request.result
      db.onversionchange = () => db.close()
      if (settled) db.close()
      else {
        settled = true
        resolve(db)
      }
    }
  })
}
async function changeBank(
  id: string,
  expectedVersion: number,
  bank?: CustomBank,
) {
  if (
    !id.startsWith('custom-') ||
    !Number.isSafeInteger(expectedVersion) ||
    expectedVersion < 1
  )
    throw new Error('Choose a saved custom deck.')
  if (bank && (!isCustomBank(bank) || bank.version !== expectedVersion + 1))
    throw new Error('This deck is invalid. Review the cards before saving.')
  const db = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      let failure: Error | undefined
      transaction.oncomplete = () => resolve()
      transaction.onabort = () =>
        reject(
          failure ??
            new Error(
              'The deck could not be changed. Storage may be full or unavailable. Retry or export your words.',
            ),
        )
      // Read, compare, and write inside one transaction so competing tabs cannot both win.
      const request = store.get(id)
      request.onsuccess = () => {
        try {
          const current: unknown = request.result
          if (current === undefined) throw new DeckConflictError('missing')
          if (!isCustomBank(current)) throw new DeckConflictError('unreadable')
          if (current.version !== expectedVersion)
            throw new DeckConflictError('changed')
          if (bank) {
            if (bank.id !== current.id || bank.createdAt !== current.createdAt)
              throw new Error('The saved deck identity cannot be changed.')
            store.put(bank)
          } else store.delete(id)
        } catch (error) {
          failure =
            error instanceof Error
              ? error
              : new Error('The deck could not be changed.')
          transaction.abort()
        }
      }
    })
  } finally {
    db.close()
  }
}
export const deckRepository: DeckRepository = {
  async get(id) {
    const db = await openDatabase()
    try {
      return await new Promise<CustomBank | null>((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly')
        const request = transaction.objectStore(storeName).get(id)
        transaction.onabort = () =>
          reject(new Error('The saved deck could not be loaded. Try again.'))
        transaction.oncomplete = () => {
          if (request.result === undefined) resolve(null)
          else if (isCustomBank(request.result)) resolve(request.result)
          else reject(new DeckConflictError('unreadable'))
        }
      })
    } finally {
      db.close()
    }
  },
  update: (bank, expectedVersion) => changeBank(bank.id, expectedVersion, bank),
  remove: (id, expectedVersion) => changeBank(id, expectedVersion),
  async list() {
    const db = await openDatabase()
    try {
      return await new Promise<{ banks: CustomBank[]; skipped: number }>(
        (resolve, reject) => {
          const transaction = db.transaction(storeName, 'readonly')
          const request = transaction.objectStore(storeName).getAll()
          transaction.onabort = () =>
            reject(new Error('Your decks could not be loaded. Try again.'))
          transaction.oncomplete = () => {
            const records: unknown[] = request.result
            const banks = records.filter(isCustomBank)
            banks.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            resolve({ banks, skipped: records.length - banks.length })
          }
        },
      )
    } finally {
      db.close()
    }
  },
  async add(bank) {
    if (!isCustomBank(bank))
      throw new Error('This deck is invalid. Review the cards before saving.')
    const db = await openDatabase()
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite')
        // Request success is not a committed write. Only completion means saved.
        transaction.oncomplete = () => resolve()
        transaction.onabort = () =>
          reject(
            new Error(
              'The deck could not be saved. Storage may be full or unavailable. Retry or export your words.',
            ),
          )
        transaction.objectStore(storeName).add(bank)
      })
    } finally {
      db.close()
    }
  },
}
