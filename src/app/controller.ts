import { banks, shuffle } from '../content/banks'
import { createRound, remaining, stepRound } from '../game/engine'
import type { Answer, Clock, Command, Mode, Round } from '../game/engine'
import { GestureDetector, screenElevation, tuning } from '../motion/detector'
import type { DetectorSnapshot } from '../motion/detector'
import { GameEffects } from '../platform/effects'
import { viewport } from '../platform/layout'
import type { Viewport } from '../platform/layout'

export type MotionStatus =
  'idle' | 'checking' | 'ready' | 'denied' | 'unavailable' | 'insecure-context'
export interface AppSnapshot {
  scene: 'home' | 'setup' | 'game' | 'results'
  bankId: string
  mode: Mode
  sound: boolean
  round: Round | null
  motion: MotionStatus
  detector: DetectorSnapshot
  practice: { correct: number; passed: number; last: Answer | null }
  view: Viewport
  lockedAngle: number | null
  now: Clock
  diagnostics: boolean
  traceCount: number
  storageNotice: string
  audioStatus: string
  wakeStatus: string
}
interface Trace {
  at: number
  event: string
  detail: unknown
}
type OrientationClass = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>
}
const preferenceKey = 'heads-up.controls.v1'
const time = (): Clock => ({ mono: performance.now(), wall: Date.now() })

export class GameController {
  private listeners = new Set<() => void>()
  private timer: ReturnType<typeof setInterval> | null = null
  private sensorTimer: ReturnType<typeof setTimeout> | null = null
  private generation = 0
  private sensorAttached = false
  private sequence = 0
  private lastEmit = 0
  private lastSampleLog = 0
  private invalidSince: number | null = null
  private portraitSince: number | null = null
  private physicalPortrait = false
  private trace: Trace[] = []
  private detector = new GestureDetector()
  private effects = new GameEffects()
  private state: AppSnapshot

  constructor() {
    let mode: Mode = 'motion'
    let storageNotice = ''
    try {
      if (localStorage.getItem(preferenceKey) === 'manual') mode = 'manual'
    } catch {
      storageNotice = 'Settings will last for this visit only.'
    }
    this.state = {
      scene: 'home',
      bankId: banks[0].id,
      mode,
      sound: true,
      round: null,
      motion: 'idle',
      detector: this.detector.snapshot(),
      practice: { correct: 0, passed: 0, last: null },
      view: viewport(),
      lockedAngle: null,
      now: time(),
      diagnostics: false,
      traceCount: 0,
      storageNotice,
      audioStatus: this.effects.audioStatus,
      wakeStatus: this.effects.wakeStatus,
    }
  }
  getSnapshot = () => this.state
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
  private emit() {
    this.lastEmit = performance.now()
    this.state = {
      ...this.state,
      detector: this.detector.snapshot(),
      now: time(),
      traceCount: this.trace.length,
      audioStatus: this.effects.audioStatus,
      wakeStatus: this.effects.wakeStatus,
    }
    this.listeners.forEach((listener) => listener())
  }
  private record(event: string, detail: unknown = null) {
    if (!this.state.diagnostics) return
    this.trace.push({ at: performance.now(), event, detail })
    if (this.trace.length > 1800) this.trace.splice(0, this.trace.length - 1800)
  }
  connect = () => {
    if (this.timer) return () => {}
    this.timer = setInterval(this.tick, 50)
    window.addEventListener('resize', this.resize)
    window.addEventListener('orientationchange', this.resize)
    document.addEventListener('visibilitychange', this.visibility)
    window.addEventListener('pagehide', this.hidden)
    this.resize()
    return () => {
      if (this.timer) clearInterval(this.timer)
      this.timer = null
      window.removeEventListener('resize', this.resize)
      window.removeEventListener('orientationchange', this.resize)
      document.removeEventListener('visibilitychange', this.visibility)
      window.removeEventListener('pagehide', this.hidden)
      this.stopMotion()
      this.effects.dispose()
    }
  }
  private resize = () => {
    this.state = { ...this.state, view: viewport() }
    this.emit()
  }
  private hidden = () => {
    this.pause('You left the game. Get ready, then resume.')
    this.stopMotion()
    this.detector.reset()
    this.record('hidden')
    void this.effects.keepAwake(false)
    this.emit()
  }
  private visibility = () => {
    if (document.hidden) this.hidden()
    else {
      this.resize()
      this.record('visible')
    }
  }

  chooseBank = (bankId: string) => {
    if (
      !banks.some((bank) => bank.id === bankId) ||
      this.state.scene === 'game'
    )
      return
    this.stopMotion()
    this.detector.reset()
    this.state = {
      ...this.state,
      bankId,
      scene: 'setup',
      round: null,
      practice: { correct: 0, passed: 0, last: null },
    }
    this.emit()
  }
  home = () => {
    if (this.state.round && this.state.round.phase !== 'finished') return
    this.stopMotion()
    void this.effects.keepAwake(false)
    this.state = {
      ...this.state,
      scene: 'home',
      round: null,
      lockedAngle: null,
    }
    this.emit()
  }
  backToBanks = () => {
    if (this.state.scene === 'setup') {
      this.stopMotion()
      void this.effects.keepAwake(false)
      this.state = { ...this.state, scene: 'home', round: null }
      this.emit()
    }
  }
  setSound = (sound: boolean) => {
    this.effects.sound = sound
    this.state = { ...this.state, sound }
    if (sound) {
      this.effects.unlockAudio()
      this.effects.cue('start')
    }
    this.emit()
  }
  testSound = () => {
    this.effects.unlockAudio()
    setTimeout(() => {
      this.effects.cue('start')
      this.emit()
    }, 100)
  }
  setDiagnostics = (diagnostics: boolean) => {
    this.state = { ...this.state, diagnostics }
    if (!diagnostics) this.trace = []
    else this.record('diagnostics-enabled', { tuning })
    this.emit()
  }
  setMode = (mode: Mode) => {
    const round = this.state.round
    if (round && round.phase !== 'finished' && round.phase !== 'interrupted')
      return
    this.stopMotion()
    this.detector.reset()
    this.state = {
      ...this.state,
      mode,
      lockedAngle: mode === 'manual' ? null : this.state.lockedAngle,
    }
    try {
      localStorage.setItem(preferenceKey, mode)
    } catch {
      this.state.storageNotice = 'Settings will last for this visit only.'
    }
    if (round?.phase === 'interrupted') this.command({ type: 'mode', mode })
    this.record('mode', mode)
    this.emit()
  }
  private stopMotion() {
    this.generation++
    if (this.sensorTimer) clearTimeout(this.sensorTimer)
    this.sensorTimer = null
    if (this.sensorAttached)
      window.removeEventListener('deviceorientation', this.orientation)
    this.sensorAttached = false
    this.invalidSince = null
    this.portraitSince = null
    this.state = { ...this.state, motion: 'idle' }
  }
  private failMotion(status: MotionStatus, reason: string) {
    this.stopMotion()
    this.pause(reason)
    this.state = { ...this.state, motion: status }
    this.record('motion-failed', { status, reason })
    this.emit()
  }
  requestMotion = async () => {
    if (
      this.state.mode !== 'motion' ||
      document.hidden ||
      (this.state.scene !== 'setup' && this.state.scene !== 'game')
    )
      return
    this.stopMotion()
    const request = this.generation
    this.detector.reset()
    if (!window.isSecureContext) {
      this.failMotion(
        'insecure-context',
        'Open the HTTPS test link to use movement, or enable buttons.',
      )
      return
    }
    const EventClass = window.DeviceOrientationEvent as
      OrientationClass | undefined
    if (!EventClass) {
      this.failMotion(
        'unavailable',
        'Movement is unavailable here. Enable buttons to play.',
      )
      return
    }
    this.state = { ...this.state, motion: 'checking' }
    this.emit()
    try {
      // Invoke the permission method in this tap's activation, before awaiting anything.
      const permission = EventClass.requestPermission
        ? EventClass.requestPermission()
        : Promise.resolve('granted' as const)
      this.effects.unlockAudio()
      const result = await permission
      if (request !== this.generation || document.hidden) return
      if (result !== 'granted') {
        this.failMotion(
          'denied',
          'Movement permission was not granted. Retry, or enable buttons.',
        )
        return
      }
      this.record('permission', 'granted-or-not-required')
      window.addEventListener('deviceorientation', this.orientation)
      this.sensorAttached = true
      this.sensorTimer = setTimeout(() => {
        if (request !== this.generation) return
        this.failMotion(
          'unavailable',
          'No usable movement readings arrived. Retry, or enable buttons.',
        )
      }, 5000)
      void this.effects.keepAwake(true)
    } catch (error) {
      if (request !== this.generation) return
      this.record(
        'permission-error',
        error instanceof Error ? error.name : 'unknown',
      )
      this.failMotion(
        'denied',
        'Movement permission could not be requested. Retry, or enable buttons.',
      )
    }
  }
  private orientation = (event: DeviceOrientationEvent) => {
    if (document.hidden || this.state.mode !== 'motion') return
    const now = time()
    const stamp =
      event.timeStamp > 1e12
        ? now.mono - (now.wall - event.timeStamp)
        : event.timeStamp
    const elevation = screenElevation(event.beta, event.gamma)
    if (
      elevation === null ||
      now.mono - stamp > 250 ||
      stamp - now.mono > 100
    ) {
      this.detector.invalidate()
      this.invalidSince ??= now.mono
      this.record('invalid-reading', {
        beta: event.beta,
        gamma: event.gamma,
        ageMs: now.mono - stamp,
      })
      if (now.mono - this.invalidSince > 1000)
        this.pause(
          'Movement readings became unavailable. Retry, or enable buttons.',
        )
      if (now.mono - this.lastEmit >= 100) this.emit()
      return
    }
    this.invalidSince = null
    if (this.sensorTimer) clearTimeout(this.sensorTimer)
    this.sensorTimer = null
    this.state = { ...this.state, motion: 'ready' }
    this.physicalPortrait =
      Math.abs(Math.sin((event.beta! * Math.PI) / 180)) > 0.75
    const round = this.state.round
    const allowAnswer =
      this.state.scene === 'setup' || round?.phase === 'playing'
    const gesture = this.detector.sample(
      { time: now.mono, elevation },
      allowAnswer,
    )
    if (now.mono - this.lastSampleLog >= 100) {
      this.lastSampleLog = now.mono
      this.record('sample', {
        beta: event.beta,
        gamma: event.gamma,
        rawElevation: elevation,
        ...this.detector.snapshot(),
      })
    }
    if (gesture) {
      this.record('gesture', gesture)
      if (this.state.scene === 'setup') {
        this.state = {
          ...this.state,
          practice: {
            ...this.state.practice,
            [gesture.answer]: this.state.practice[gesture.answer] + 1,
            last: gesture.answer,
          },
        }
        this.effects.cue(gesture.answer)
      } else if (round?.phase === 'playing') {
        this.answer(gesture.answer, 'motion')
      }
      this.emit()
    } else if (
      now.mono - this.lastEmit >= 100 &&
      (this.state.scene === 'setup' || this.state.diagnostics)
    )
      this.emit()
  }
  private command(command: Command, now = time()) {
    const old = this.state.round
    if (!old) return
    const next = stepRound(old, old.id, command, now)
    this.state = { ...this.state, round: next }
    if (
      next.answers.length > old.answers.length &&
      next.lastAnswer &&
      command.type === 'answer'
    )
      this.effects.cue(next.lastAnswer)
    if (next.phase !== old.phase) {
      this.record('phase', {
        from: old.phase,
        to: next.phase,
        reason: next.reason,
        remainingMs: next.remainingMs,
      })
      if (next.phase === 'playing' && old.phase === 'preparing')
        this.effects.cue('start')
      if (next.phase === 'interrupted') {
        this.stopMotion()
        this.detector.reset()
        void this.effects.keepAwake(false)
      }
      if (next.phase === 'finished') {
        this.effects.cue('end')
        this.stopMotion()
        void this.effects.keepAwake(false)
        this.state = { ...this.state, scene: 'results', lockedAngle: null }
      }
      this.emit()
    }
  }
  private tick = () => {
    const now = time()
    if (this.state.motion === 'ready' && this.detector.settle(now.mono))
      this.emit()
    const round = this.state.round
    if (this.state.scene === 'game' && round && round.phase !== 'interrupted') {
      if (
        round.mode === 'motion' &&
        !this.state.view.landscape &&
        this.physicalPortrait
      ) {
        this.portraitSince ??= now.mono
        if (now.mono - this.portraitSince > 1000)
          this.pause('Hold the phone sideways again, then resume.')
      } else this.portraitSince = null
      this.command(
        {
          type: 'tick',
          ready:
            round.mode === 'manual' ||
            (this.state.motion === 'ready' &&
              this.state.view.landscape &&
              this.detector.isNeutral),
          neutral: this.detector.isNeutral,
        },
        now,
      )
      if (now.mono - this.lastEmit >= 200) this.emit()
    }
  }
  start = () => {
    if (this.state.scene !== 'setup') return
    if (
      this.state.mode === 'motion' &&
      (this.state.motion !== 'ready' || !this.state.view.landscape)
    )
      return
    this.effects.unlockAudio()
    this.detector.reset()
    const bank = banks.find((item) => item.id === this.state.bankId)!
    this.state = {
      ...this.state,
      scene: 'game',
      lockedAngle: this.state.mode === 'motion' ? this.state.view.angle : null,
      round: createRound(
        crypto.randomUUID(),
        shuffle(bank.prompts),
        this.state.mode,
        time(),
      ),
    }
    this.record('round-start', { bank: bank.id, mode: this.state.mode })
    void this.effects.keepAwake(true)
    this.emit()
  }
  answer = (answer: Answer, source: Mode = 'manual') => {
    const round = this.state.round
    if (!round || round.phase !== 'playing') return
    const actionId = String(++this.sequence)
    const before = round.answers.length
    this.command({
      type: 'answer',
      answer,
      source,
      actionId,
      promptId: round.prompts[round.index].id,
    })
    this.record('answer', {
      answer,
      source,
      actionId,
      accepted: (this.state.round?.answers.length ?? 0) > before,
      promptId: round.prompts[round.index].id,
      feedbackAt: performance.now(),
    })
    this.emit()
  }
  pause = (reason = 'Take your time. The round is paused.') => {
    if (
      this.state.scene !== 'game' ||
      this.state.round?.phase === 'interrupted'
    )
      return
    this.command({ type: 'pause', reason })
    this.emit()
  }
  resume = () => {
    if (this.state.round?.phase !== 'interrupted') return
    if (this.state.mode === 'motion' && !this.state.view.landscape) return
    this.detector.reset()
    this.state = {
      ...this.state,
      lockedAngle: this.state.mode === 'motion' ? this.state.view.angle : null,
    }
    this.command({ type: 'resume' })
    this.effects.unlockAudio()
    if (this.state.mode === 'motion') void this.requestMotion()
    void this.effects.keepAwake(true)
    this.emit()
  }
  end = () => {
    this.command({ type: 'end' })
    this.emit()
  }
  replay = () => {
    const bankId = this.state.bankId
    this.state = { ...this.state, scene: 'results' }
    this.chooseBank(bankId)
  }
  report = () =>
    JSON.stringify(
      {
        schemaVersion: 1,
        build: __BUILD_ID__,
        exportedAt: new Date().toISOString(),
        userAgent: navigator.userAgent,
        launchMode:
          matchMedia('(display-mode: standalone)').matches ||
          (navigator as Navigator & { standalone?: boolean }).standalone
            ? 'installed'
            : 'tab',
        secureContext: window.isSecureContext,
        viewport: this.state.view,
        mode: this.state.mode,
        motion: this.state.motion,
        detector: this.detector.snapshot(),
        tuning,
        effects: {
          audio: this.effects.audioStatus,
          wakeLock: this.effects.wakeStatus,
        },
        remainingMs: this.state.round
          ? remaining(this.state.round, time())
          : null,
        round: this.state.round
          ? {
              id: this.state.round.id,
              phase: this.state.round.phase,
              finishReason: this.state.round.finishReason,
              outcomes: this.state.round.answers.map(({ id, outcome }) => ({
                id,
                outcome,
              })),
            }
          : null,
        observerNote:
          'Fill in intended gestures, misses, wrong directions, duplicates, comfort, OS version, and rotation-lock setting using the device trial checklist.',
        trace: this.trace,
      },
      null,
      2,
    )
}
