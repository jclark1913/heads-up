export interface Viewport {
  width: number
  height: number
  angle: number
  landscape: boolean
}
export function viewport(): Viewport {
  const width = window.innerWidth,
    height = window.innerHeight
  const legacy = (window as Window & { orientation?: number }).orientation
  const reported = window.screen.orientation?.angle ?? legacy
  const angle =
    typeof reported === 'number'
      ? (reported + 360) % 360
      : width >= height
        ? 90
        : 0
  return { width, height, angle, landscape: width >= height }
}
export function stageLayout(view: Viewport, lockedAngle: number | null) {
  const rotation =
    lockedAngle === null ? 0 : ((lockedAngle - view.angle + 540) % 360) - 180
  const sideways = Math.abs(rotation) === 90
  return {
    width: sideways ? view.height : view.width,
    height: sideways ? view.width : view.height,
    rotation,
  }
}
