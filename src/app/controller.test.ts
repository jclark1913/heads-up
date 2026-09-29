import {
  createCustomBank,
  draftFromBank,
  reviseCustomBank,
} from '../content/decks'
import type { CustomBank } from '../content/decks'
import type { DeckRepository } from '../content/repository'
import { parseText } from '../content/textImport'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deckRepository } from '../content/repository'
import { GameController } from './controller'

let disconnect: (() => void) | undefined
function controller() {
  const app = new GameController()
  disconnect = app.connect()
  app.chooseBank('en-mix')
  return app
}
function samples(beta: number, gamma: number, duration: number) {
  for (let elapsed = 0; elapsed < duration; elapsed += 20) {
    vi.advanceTimersByTime(20)
    const event = new Event('deviceorientation')
    Object.defineProperties(event, {
      beta: { value: beta },
      gamma: { value: gamma },
      timeStamp: { value: performance.now() },
    })
    window.dispatchEvent(event)
  }
}
beforeEach(() => {
  vi.useFakeTimers({
    toFake: [
      'setTimeout',
      'clearTimeout',
      'setInterval',
      'clearInterval',
      'Date',
      'performance',
    ],
  })
  localStorage.clear()
  vi.stubGlobal('isSecureContext', true)
  vi.stubGlobal('DeviceOrientationEvent', {
    requestPermission: vi.fn().mockResolvedValue('granted'),
  })
  vi.stubGlobal('matchMedia', () => ({ matches: false }))
})
afterEach(() => {
  disconnect?.()
  disconnect = undefined
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
describe('browser motion lifecycle', () => {
  it('invokes the permission method synchronously in the request call', async () => {
    const app = controller()
    const request = vi.fn().mockResolvedValue('granted')
    vi.stubGlobal('DeviceOrientationEvent', { requestPermission: request })
    const pending = app.requestMotion()
    expect(request).toHaveBeenCalledOnce()
    await pending
  })
  it('starts the no-data deadline after permission resolves', async () => {
    const app = controller()
    let allow!: (result: 'granted') => void
    vi.stubGlobal('DeviceOrientationEvent', {
      requestPermission: () =>
        new Promise<'granted'>((resolve) => {
          allow = resolve
        }),
    })
    const pending = app.requestMotion()
    vi.advanceTimersByTime(10_000)
    expect(app.getSnapshot().motion).toBe('checking')
    allow('granted')
    await pending
    vi.advanceTimersByTime(4990)
    expect(app.getSnapshot().motion).toBe('checking')
    vi.advanceTimersByTime(10)
    expect(app.getSnapshot().motion).toBe('unavailable')
    expect(app.getSnapshot().mode).toBe('motion')
  })
  it('ignores a late permission resolution after selecting manual mode', async () => {
    const app = controller()
    let allow!: (result: 'granted') => void
    vi.stubGlobal('DeviceOrientationEvent', {
      requestPermission: () =>
        new Promise<'granted'>((resolve) => {
          allow = resolve
        }),
    })
    const pending = app.requestMotion()
    app.setMode('manual')
    allow('granted')
    await pending
    samples(0, 90, 1000)
    expect(app.getSnapshot().mode).toBe('manual')
    expect(app.getSnapshot().motion).toBe('idle')
    expect(app.getSnapshot().detector.neutral).toBeNull()
  })
  it('accepts useful events without a requestPermission method', async () => {
    vi.stubGlobal('DeviceOrientationEvent', {})
    const app = controller()
    await app.requestMotion()
    samples(0, 90, 700)
    expect(app.getSnapshot().motion).toBe('ready')
    expect(app.getSnapshot().detector.isNeutral).toBe(true)
    vi.advanceTimersByTime(6000)
    expect(app.getSnapshot().motion).toBe('ready')
  })
  it('recovers from permission denial while resuming without losing the round', async () => {
    const app = controller()
    await app.requestMotion()
    samples(0, 90, 700)
    app.start()
    samples(0, 90, 3100)
    expect(app.getSnapshot().round?.phase).toBe('playing')
    app.pause()
    const remaining = app.getSnapshot().round?.remainingMs
    vi.stubGlobal('DeviceOrientationEvent', {
      requestPermission: () => Promise.resolve('denied'),
    })
    app.resume()
    await Promise.resolve()
    await Promise.resolve()
    expect(app.getSnapshot().round?.phase).toBe('interrupted')
    expect(app.getSnapshot().motion).toBe('denied')
    expect(app.getSnapshot().mode).toBe('motion')
    expect(app.getSnapshot().round?.remainingMs).toBe(remaining)
    app.setMode('manual')
    app.resume()
    vi.advanceTimersByTime(3100)
    expect(app.getSnapshot().round?.phase).toBe('playing')
  })
  it('makes no sensor request for a saved manual choice and starts a clean round', () => {
    localStorage.setItem('heads-up.controls.v1', 'manual')
    const app = controller()
    app.start()
    vi.advanceTimersByTime(3100)
    expect(app.getSnapshot().round?.phase).toBe('playing')
    expect(app.getSnapshot().round?.answers).toHaveLength(0)
    expect(
      (
        window.DeviceOrientationEvent as unknown as {
          requestPermission: ReturnType<typeof vi.fn>
        }
      ).requestPermission,
    ).not.toHaveBeenCalled()
  })
  it('keeps traces opt-in, bounded, and local', async () => {
    const app = controller()
    await app.requestMotion()
    samples(0, 90, 700)
    expect(JSON.parse(app.report()).trace).toEqual([])
    app.setDiagnostics(true)
    samples(0, 90, 400)
    expect(JSON.parse(app.report()).trace.length).toBeGreaterThan(0)
    app.setDiagnostics(false)
    expect(JSON.parse(app.report()).trace).toEqual([])
  })
})

it('starts a round with change-only readings after a genuinely observed neutral pose', async () => {
  const app = controller()
  await app.requestMotion()
  samples(0, 90, 20)
  vi.advanceTimersByTime(600)
  expect(app.getSnapshot().detector.isNeutral).toBe(true)
  app.start()
  expect(app.getSnapshot().detector.neutral).toBeNull()
  samples(0, 90, 20)
  vi.advanceTimersByTime(3100)
  expect(app.getSnapshot().round?.phase).toBe('playing')
  expect(app.getSnapshot().round?.answers).toHaveLength(0)
})

describe('custom deck library integration', () => {
  it('waits for the committed write before exposing a deck or entering setup', async () => {
    const { createCustomBank } = await import('../content/decks')
    const { parseText } = await import('../content/textImport')
    let commit!: () => void
    const app = new GameController({
      ...deckRepository,
      list: async () => ({ banks: [], skipped: 0 }),
      add: () =>
        new Promise<void>((resolve) => {
          commit = resolve
        }),
    })
    const bank = createCustomBank(
      'My words',
      parseText('cat,dog', 'commas').cards,
    )
    const pending = app.saveBank(bank)
    expect(app.getSnapshot().scene).toBe('home')
    expect(app.getSnapshot().banks).toHaveLength(2)
    commit()
    await pending
    expect(app.getSnapshot().scene).toBe('setup')
    expect(app.getSnapshot().bankId).toBe(bank.id)
    expect(app.getSnapshot().mode).toBe('motion')
  })

  it('does not add a deck when persistence fails', async () => {
    const { createCustomBank } = await import('../content/decks')
    const { parseText } = await import('../content/textImport')
    const app = new GameController({
      ...deckRepository,
      list: async () => ({ banks: [], skipped: 0 }),
      add: async () => {
        throw new Error('Storage full')
      },
    })
    const bank = createCustomBank('Words', parseText('cat', 'lines').cards)
    await expect(app.saveBank(bank)).rejects.toThrow('Storage full')
    expect(app.getSnapshot().scene).toBe('home')
    expect(app.getSnapshot().banks).toHaveLength(2)
  })

  it('snapshots deck identity and words for the round and its results', async () => {
    const { createCustomBank } = await import('../content/decks')
    const { parseText } = await import('../content/textImport')
    const app = new GameController({
      ...deckRepository,
      list: async () => ({ banks: [], skipped: 0 }),
      add: async () => {},
    })
    const bank = createCustomBank(
      'Original name',
      parseText('Original word', 'lines').cards,
    )
    await app.saveBank(bank)
    app.setMode('manual')
    app.start()
    const saved = app.getSnapshot().banks.find((item) => item.id === bank.id)!
    saved.title = 'Changed name'
    saved.prompts[0].text = 'Changed word'
    app.end()
    expect(app.getSnapshot().scene).toBe('results')
    expect(app.getSnapshot().roundBank?.title).toBe('Original name')
    expect(app.getSnapshot().roundBank?.prompts[0].text).toBe('Original word')
    expect(app.getSnapshot().round?.prompts[0].text).toBe('Original word')
  })
})

describe('saved deck changes', () => {
  function memory() {
    let records = [
      createCustomBank('Original', parseText('cat\nقِطَّة', 'lines').cards),
    ]
    const repository: DeckRepository = {
      ...deckRepository,
      list: vi.fn(async () => ({
        banks: structuredClone(records),
        skipped: 0,
      })),
      update: vi.fn(async (bank) => {
        records = [structuredClone(bank)]
      }),
      remove: vi.fn(async () => {
        records = []
      }),
    }
    return { repository, bank: records[0] }
  }
  it('applies authoritative refreshes and leaves setup if its deck was deleted', async () => {
    const { repository, bank } = memory()
    const app = new GameController(repository)
    await app.loadLibrary()
    app.chooseBank(bank.id)
    await repository.remove(bank.id, bank.version)
    await app.loadLibrary()
    expect(app.getSnapshot().banks.some((item) => item.id === bank.id)).toBe(
      false,
    )
    expect(app.getSnapshot().scene).toBe('home')
  })
  it('keeps active cards and results unchanged across updates and deletion', async () => {
    const { repository, bank } = memory()
    const app = new GameController(repository)
    disconnect = app.connect()
    await app.loadLibrary()
    app.chooseBank(bank.id)
    app.setMode('manual')
    app.start()
    vi.advanceTimersByTime(3100)
    const before = structuredClone(app.getSnapshot().round)
    const revised = reviseCustomBank(
      bank,
      'Changed',
      parseText('Different', 'lines').cards,
    )
    await app.updateBank(revised, 1)
    expect(app.getSnapshot().round).toEqual(before)
    expect(app.getSnapshot().roundBank).toEqual(bank)
    await app.deleteBank(bank.id, 2)
    expect(app.getSnapshot().scene).toBe('game')
    expect(app.getSnapshot().round).toEqual(before)
    app.end()
    expect(app.getSnapshot().roundBank).toEqual(bank)
    expect(app.getSnapshot().scene).toBe('results')
    app.replay()
    expect(app.getSnapshot().scene).toBe('home')
  })
  it('does not expose an update or deletion until the transaction commits', async () => {
    const { repository, bank } = memory()
    let commit!: () => void
    repository.update = () =>
      new Promise((resolve) => {
        commit = resolve
      })
    const app = new GameController(repository)
    await app.loadLibrary()
    const revised = reviseCustomBank(bank, 'Changed', draftFromBank(bank))
    const pending = app.updateBank(revised, 1)
    expect(
      app.getSnapshot().banks.find((item) => item.id === bank.id)?.title,
    ).toBe('Original')
    commit()
    await pending
    expect(
      app.getSnapshot().banks.find((item) => item.id === bank.id)?.title,
    ).toBe('Changed')
    repository.remove = () =>
      new Promise((resolve) => {
        commit = resolve
      })
    const deletion = app.deleteBank(bank.id, 2)
    expect(app.getSnapshot().banks).toHaveLength(3)
    commit()
    await deletion
    expect(app.getSnapshot().banks).toHaveLength(2)
  })
  it('preserves loaded banks when edits, deletes, or refreshes fail', async () => {
    const { repository, bank } = memory()
    const app = new GameController(repository)
    await app.loadLibrary()
    const fail = async () => {
      throw new Error('Storage failed')
    }
    repository.update = fail
    repository.remove = fail
    repository.list = fail
    await expect(
      app.updateBank(reviseCustomBank(bank, 'Changed', draftFromBank(bank)), 1),
    ).rejects.toThrow()
    await expect(app.deleteBank(bank.id, 1)).rejects.toThrow()
    await app.loadLibrary()
    expect(app.getSnapshot().banks.find((item) => item.id === bank.id)).toEqual(
      bank,
    )
    expect(app.getSnapshot().libraryStatus).toBe('error')
  })
  it.each(['update', 'delete'] as const)(
    'ignores a stale library read after a committed %s',
    async (action) => {
      const { repository, bank } = memory()
      const app = new GameController(repository)
      await app.loadLibrary()
      const realList = repository.list
      let finish!: (value: { banks: CustomBank[]; skipped: number }) => void
      repository.list = vi
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              finish = resolve
            }),
        )
        .mockImplementation(realList)
      const pending = app.loadLibrary()
      if (action === 'update')
        await app.updateBank(
          reviseCustomBank(bank, 'Changed', draftFromBank(bank)),
          1,
        )
      else await app.deleteBank(bank.id, 1)
      finish({ banks: [bank], skipped: 0 })
      await pending
      const current = app
        .getSnapshot()
        .banks.find((item) => item.id === bank.id)
      if (action === 'update') expect(current?.title).toBe('Changed')
      else expect(current).toBeUndefined()
      expect(repository.list).toHaveBeenCalledTimes(2)
    },
  )
})

describe('duration preferences and latest results', () => {
  it('restores muted sound before any audio can be initialized', () => {
    localStorage.setItem(
      'heads-up.preferences.v1',
      JSON.stringify({
        schemaVersion: 1,
        controlMode: 'manual',
        soundEnabled: false,
        durationSeconds: 90,
      }),
    )
    const audio = vi.fn()
    vi.stubGlobal('AudioContext', audio)
    const app = controller()
    expect(app.getSnapshot()).toMatchObject({
      mode: 'manual',
      sound: false,
      durationSeconds: 90,
    })
    app.testSound()
    vi.advanceTimersByTime(100)
    app.start()
    vi.advanceTimersByTime(3100)
    expect(audio).not.toHaveBeenCalled()
    expect(app.getSnapshot().round?.durationMs).toBe(90_000)
  })
  it('changes duration between rounds only and persists the current preferences together', () => {
    const app = controller()
    app.setDuration(30)
    app.setSound(false)
    app.setMode('manual')
    app.start()
    app.setDuration(90)
    expect(app.getSnapshot().durationSeconds).toBe(30)
    app.pause()
    app.setDuration(60)
    expect(app.getSnapshot().durationSeconds).toBe(30)
    app.end()
    app.setDuration(90)
    app.setDuration(45)
    expect(new GameController().getSnapshot()).toMatchObject({
      durationSeconds: 90,
      sound: false,
      mode: 'manual',
    })
    expect(app.getSnapshot().latestResult?.durationSeconds).toBe(30)
  })
  it('persists each finished round once and reopening never resumes or rewrites it', () => {
    const write = vi.spyOn(Storage.prototype, 'setItem')
    const app = controller()
    app.setMode('manual')
    app.setDiagnostics(true)
    app.start()
    vi.advanceTimersByTime(3200)
    app.answer('correct')
    app.pause()
    app.end()
    const finished = structuredClone(app.getSnapshot().latestResult)
    app.end()
    vi.advanceTimersByTime(1000)
    app.home()
    app.viewLatestResult()
    expect(app.getSnapshot().latestResult).toEqual(finished)
    expect(app.getSnapshot().round).toBeNull()
    const restored = new GameController()
    expect(restored.getSnapshot()).toMatchObject({
      scene: 'home',
      round: null,
      latestResult: finished,
    })
    expect(
      write.mock.calls.filter(([key]) => key === 'heads-up.latest-result.v1'),
    ).toHaveLength(1)
    const stored = JSON.parse(
      localStorage.getItem('heads-up.latest-result.v1')!,
    )
    expect(stored).not.toHaveProperty('trace')
    expect(stored).not.toHaveProperty('round')
    expect(stored.deck).not.toHaveProperty('prompts')
    restored.viewLatestResult()
    restored.resume()
    expect(restored.getSnapshot().scene).toBe('results')
    expect(restored.getSnapshot().round).toBeNull()
  })
  it('keeps the previous result while another round is live, and replaces it only at finish', () => {
    const app = controller()
    app.setMode('manual')
    app.start()
    app.end()
    const first = app.getSnapshot().latestResult!
    app.replay()
    app.start()
    app.viewLatestResult()
    expect(app.getSnapshot().scene).toBe('game')
    expect(app.getSnapshot().latestResult?.roundId).toBe(first.roundId)
    expect(new GameController().getSnapshot()).toMatchObject({
      scene: 'home',
      round: null,
      latestResult: first,
    })
    app.end()
    expect(app.getSnapshot().latestResult?.roundId).not.toBe(first.roundId)
  })
  it('keeps settings and results usable for the visit when writes fail', () => {
    const app = controller()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Full')
    })
    app.setDuration(30)
    app.setSound(false)
    app.setMode('manual')
    expect(app.getSnapshot()).toMatchObject({
      durationSeconds: 30,
      mode: 'manual',
      sound: false,
      storageNotice: expect.stringContaining('visit only'),
    })
    app.start()
    app.end()
    expect(app.getSnapshot().scene).toBe('results')
    expect(app.getSnapshot().resultNotice).toContain('could not be saved')
    const result = app.getSnapshot().latestResult
    app.home()
    app.viewLatestResult()
    expect(app.getSnapshot().latestResult).toEqual(result)
  })
})
