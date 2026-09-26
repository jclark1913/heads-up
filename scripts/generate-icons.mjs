import sharp from 'sharp'
import { mkdir, readFile } from 'node:fs/promises'
await mkdir('public/icons', { recursive: true })
const svg = await readFile('public/icon.svg')
for (const [name, size] of [
  ['icon-192', 192],
  ['icon-512', 512],
  ['apple-touch-icon', 180],
]) {
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile('public/icons/' + name + '.png')
}
const inset = await sharp(svg).resize(360, 360).png().toBuffer()
await sharp({
  create: { width: 512, height: 512, channels: 4, background: '#183e36' },
})
  .composite([{ input: inset, left: 76, top: 76 }])
  .png()
  .toFile('public/icons/maskable-512.png')
console.log('Generated install icons.')
