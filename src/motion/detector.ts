import type { Answer } from '../game/engine'

export const tuning = {
  tilt: 50,
  dwellMs: 120,
  neutral: 15,
  neutralMs: 200,
  calibrationMs: 500,
  calibrationSpread: 6,
  smoothingMs: 40,
  maxGapMs: 250,
} as const
export type DetectorState =
  | 'uncalibrated'
  | 'armed'
  | 'candidate-correct'
  | 'candidate-pass'
  | 'awaiting-neutral'
export interface Reading {
  time: number
  elevation: number
}
export interface Gesture {
  answer: Answer
  crossedAt: number
  acceptedAt: number
}
export interface DetectorSnapshot {
  isNeutral: boolean
  state: DetectorState
  elevation: number | null
  neutral: number | null
  delta: number | null
  reason: string
}

export function screenElevation(
  beta: number | null,
  gamma: number | null,
): number | null {
  if (
    beta === null ||
    gamma === null ||
    !Number.isFinite(beta) ||
    !Number.isFinite(gamma) ||
    Math.abs(beta) > 180 ||
    Math.abs(gamma) > 90
  )
    return null
  const radians = Math.PI / 180
  return (
    Math.asin(
      Math.max(
        -1,
        Math.min(1, Math.cos(beta * radians) * Math.cos(gamma * radians)),
      ),
    ) / radians
  )
}

export class GestureDetector {
  state: DetectorState = 'uncalibrated'
  elevation: number | null = null
  neutral: number | null = null
  reason = 'Hold the screen upright and steady.'
  private lastTime: number | null = null
  private lastRaw: number | null = null
  private calibration: Reading[] = []
  private candidateAt: number | null = null
  private neutralAt: number | null = null

  reset() {
    this.state = 'uncalibrated'
    this.elevation = null
    this.neutral = null
    this.lastTime = null
    this.lastRaw = null
    this.calibration = []
    this.candidateAt = null
    this.neutralAt = null
    this.reason = 'Hold the screen upright and steady.'
  }
  invalidate() {
    this.candidateAt = null
    this.neutralAt = null
    this.calibration = []
    this.lastTime = null
    this.state = this.neutral === null ? 'uncalibrated' : 'awaiting-neutral'
    this.reason = 'Waiting for a usable reading.'
  }
  get isNeutral() {
    return (
      this.state === 'armed' &&
      this.neutral !== null &&
      this.elevation !== null &&
      Math.abs(this.elevation - this.neutral) <= tuning.neutral
    )
  }
  // Change-only streams can be silent while stationary. Time can establish
  // neutral/calibration stability, but it can never emit a scoring gesture.
  settle(time: number): boolean {
    if (
      !Number.isFinite(time) ||
      this.lastTime === null ||
      time < this.lastTime
    )
      return false
    if (
      this.neutral === null &&
      this.calibration.length &&
      time - this.calibration[0].time >= tuning.calibrationMs
    ) {
      this.neutral =
        this.calibration.reduce((sum, x) => sum + x.elevation, 0) /
        this.calibration.length
      this.state = 'armed'
      this.calibration = []
      this.reason = 'Ready for a tilt.'
      return true
    }
    if (
      this.state === 'awaiting-neutral' &&
      this.neutral !== null &&
      this.neutralAt !== null &&
      this.lastRaw !== null &&
      Math.abs(this.lastRaw - this.neutral) <= tuning.neutral &&
      time - this.neutralAt >= tuning.neutralMs
    ) {
      this.elevation = this.lastRaw
      this.state = 'armed'
      this.reason = 'Ready for a tilt.'
      return true
    }
    return false
  }
  snapshot(): DetectorSnapshot {
    return {
      isNeutral: this.isNeutral,
      state: this.state,
      elevation: this.elevation,
      neutral: this.neutral,
      delta:
        this.neutral === null || this.elevation === null
          ? null
          : this.elevation - this.neutral,
      reason: this.reason,
    }
  }
  sample(reading: Reading, allowAnswer = true): Gesture | null {
    const { time, elevation } = reading
    if (
      !Number.isFinite(time) ||
      !Number.isFinite(elevation) ||
      Math.abs(elevation) > 90
    ) {
      this.invalidate()
      return null
    }
    if (this.lastTime !== null && time <= this.lastTime) {
      this.reason = 'Ignored an out-of-order reading.'
      return null
    }
    const gap = this.lastTime === null ? null : time - this.lastTime
    if (gap === null || gap > tuning.maxGapMs) {
      this.candidateAt = null
      this.neutralAt = null
      if (gap === null) this.calibration = []
      this.elevation = elevation
      if (this.neutral !== null && this.state !== 'armed')
        this.state = 'awaiting-neutral'
    } else {
      const weight = 1 - Math.exp(-gap / tuning.smoothingMs)
      this.elevation =
        this.elevation === null
          ? elevation
          : this.elevation + weight * (elevation - this.elevation)
    }
    this.lastTime = time
    this.lastRaw = elevation
    const filtered = this.elevation!
    if (this.neutral === null) {
      if (Math.abs(elevation) > tuning.neutral) {
        this.calibration = []
        this.reason = 'Hold the screen upright, facing your friends.'
        return null
      }
      const values = [...this.calibration.map((x) => x.elevation), elevation]
      if (Math.max(...values) - Math.min(...values) > tuning.calibrationSpread)
        this.calibration = []
      this.calibration.push({ time, elevation })
      this.settle(time)
      return null
    }
    const delta = filtered - this.neutral
    if (this.state === 'awaiting-neutral') {
      if (Math.abs(elevation - this.neutral) <= tuning.neutral) {
        this.neutralAt ??= time
        this.settle(time)
      } else {
        this.neutralAt = null
        this.reason = 'Return the screen to upright.'
      }
      return null
    }
    if (!allowAnswer) {
      this.candidateAt = null
      if (Math.abs(delta) > tuning.neutral) {
        this.state = 'awaiting-neutral'
        this.neutralAt = null
      } else this.state = 'armed'
      return null
    }
    const direction: DetectorState | null =
      delta <= -tuning.tilt
        ? 'candidate-correct'
        : delta >= tuning.tilt
          ? 'candidate-pass'
          : null
    if (!direction) {
      this.candidateAt = null
      this.state = 'armed'
      this.reason = 'Ready for a tilt.'
      return null
    }
    if (direction !== this.state || this.candidateAt === null) {
      this.state = direction
      this.candidateAt = time
      this.reason = 'Hold that tilt briefly.'
      return null
    }
    if (time - this.candidateAt < tuning.dwellMs) return null
    const gesture: Gesture = {
      answer: direction === 'candidate-correct' ? 'correct' : 'passed',
      crossedAt: this.candidateAt,
      acceptedAt: time,
    }
    this.state = 'awaiting-neutral'
    this.neutralAt = null
    this.candidateAt = null
    this.reason = 'Return the screen to upright.'
    return gesture
  }
}
