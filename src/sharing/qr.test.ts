// @vitest-environment node
import { expect, it } from 'vitest'
import jsQR from 'jsqr'
import sharp from 'sharp'
import { makeQrImage, maximumQrVersion } from './qr'

it('produces a real QR that decodes to the exact app link at phone display size', async () => {
  const link =
    'https://example.github.io/heads-up/#deck=v1.' + 'aB9_-z'.repeat(75)
  const image = await makeQrImage(link)
  expect(image).toMatch(/^data:image\/png;base64,/)
  const { data, info } = await sharp(
    Buffer.from(image!.split(',')[1], 'base64'),
  )
    .resize(320, 320)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const decoded = jsQR(new Uint8ClampedArray(data), info.width, info.height)
  expect(decoded?.data).toBe(link)
  expect(decoded?.version).toBeLessThanOrEqual(maximumQrVersion)
})
it('declines overly dense QR codes instead of displaying an untested tiny matrix', async () => {
  expect(
    await makeQrImage('https://example.com/#' + 'a'.repeat(2000)),
  ).toBeNull()
  expect(await makeQrImage('x'.repeat(40_000))).toBeNull()
})
