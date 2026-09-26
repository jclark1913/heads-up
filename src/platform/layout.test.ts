import { expect, it } from 'vitest'
import { stageLayout } from './layout'
it('preserves the chosen landscape dimensions across a transient browser rotation', () => {
  expect(
    stageLayout({ width: 390, height: 844, angle: 0, landscape: false }, 90),
  ).toEqual({ width: 844, height: 390, rotation: 90 })
  expect(
    stageLayout({ width: 390, height: 844, angle: 0, landscape: false }, 270),
  ).toEqual({ width: 844, height: 390, rotation: -90 })
  expect(
    stageLayout({ width: 844, height: 390, angle: 270, landscape: true }, 90)
      .rotation,
  ).toBe(-180)
})
it('leaves manual portrait play in the natural viewport', () => {
  expect(
    stageLayout({ width: 390, height: 844, angle: 0, landscape: false }, null),
  ).toEqual({ width: 390, height: 844, rotation: 0 })
})
