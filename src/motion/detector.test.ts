import { describe, expect, it } from 'vitest'
import { GestureDetector, screenElevation } from './detector'
import type { Gesture } from './detector'
function driver() {
  const detector = new GestureDetector()
  let now = 0
  const gestures: Gesture[] = []
  const feed = (elevation: number, duration = 600, allow = true) => {
    for (let i = 0; i < duration; i += 20) {
      now += 20
      const result = detector.sample({ time: now, elevation }, allow)
      if (result) gestures.push(result)
    }
  }
  return {
    detector,
    feed,
    gestures,
    skip: (ms: number) => {
      now += ms
    },
  }
}
describe('gesture detector', () => {
  it('maps both landscape directions to the same physical face-up/down elevation', () => {
    expect(screenElevation(0, 90)).toBeCloseTo(0)
    expect(screenElevation(0, -90)).toBeCloseTo(0)
    expect(screenElevation(0, 30)).toBeCloseTo(60)
    expect(screenElevation(0, -30)).toBeCloseTo(60)
    expect(screenElevation(180, 30)).toBeCloseTo(-60)
    expect(screenElevation(-180, -30)).toBeCloseTo(-60)
    expect(screenElevation(null, 0)).toBeNull()
    expect(screenElevation(NaN, 0)).toBeNull()
    expect(screenElevation(0, 0)).toBe(90)
  })
  it('rejects flat calibration and accepts a stable near-vertical pose', () => {
    const { detector, feed } = driver()
    feed(85)
    expect(detector.neutral).toBeNull()
    feed(4)
    expect(detector.neutral).toBeCloseTo(4)
    expect(detector.isNeutral).toBe(true)
  })
  it('emits one Correct for a held down tilt, ignoring opposite overshoot until neutral', () => {
    const { detector, feed, gestures } = driver()
    feed(0)
    feed(-70, 2500)
    feed(70)
    expect(gestures.map((g) => g.answer)).toEqual(['correct'])
    expect(detector.state).toBe('awaiting-neutral')
    feed(0)
    feed(70)
    expect(gestures.map((g) => g.answer)).toEqual(['correct', 'passed'])
  })
  it('rejects a brief spike and natural neutral movement', () => {
    const { feed, gestures } = driver()
    feed(0)
    feed(-85, 40)
    feed(0)
    feed(10)
    feed(-8)
    feed(5)
    expect(gestures).toHaveLength(0)
  })
  it('does not let a gap satisfy dwell or a held tilt rearm', () => {
    const { detector, feed, gestures, skip } = driver()
    feed(0)
    feed(-70, 100)
    skip(2000)
    feed(-70)
    expect(gestures).toHaveLength(0)
    expect(detector.state).toBe('awaiting-neutral')
    feed(0)
    feed(-70)
    expect(gestures).toHaveLength(1)
  })
  it('disarms invalid samples and ignores nonmonotonic timestamps', () => {
    const { detector, feed, gestures } = driver()
    feed(0)
    detector.sample({ time: 1, elevation: -90 })
    expect(detector.isNeutral).toBe(true)
    detector.sample({ time: 610, elevation: NaN })
    feed(-70)
    expect(gestures).toHaveLength(0)
    feed(0)
    feed(-70)
    expect(gestures).toHaveLength(1)
  })
  it('cannot emit while preparing or in feedback; requires a neutral return', () => {
    const { detector, feed, gestures } = driver()
    feed(0, 600, false)
    feed(70, 600, false)
    feed(70, 600, true)
    expect(gestures).toHaveLength(0)
    expect(detector.isNeutral).toBe(false)
    feed(0)
    feed(70)
    expect(gestures).toHaveLength(1)
  })
})

it('handles change-only neutral readings without allowing silence to score', () => {
  const detector = new GestureDetector()
  detector.sample({ time: 100, elevation: 0 })
  expect(detector.settle(599)).toBe(false)
  expect(detector.settle(600)).toBe(true)
  expect(detector.isNeutral).toBe(true)
  expect(detector.sample({ time: 2000, elevation: -70 })).toBeNull()
  expect(detector.state).toBe('candidate-correct')
  expect(detector.settle(5000)).toBe(false)
  expect(detector.sample({ time: 5001, elevation: -70 })).toBeNull()
  expect(detector.state).toBe('awaiting-neutral')
  detector.sample({ time: 5021, elevation: 0 })
  expect(detector.settle(5221)).toBe(true)
  expect(detector.isNeutral).toBe(true)
})
