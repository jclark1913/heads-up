import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
