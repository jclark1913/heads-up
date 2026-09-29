import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { gzipSync } from 'node:zlib'
import jsQR from 'jsqr'
import sharp from 'sharp'
const words = ['قِطَّة', 'New York', 'Playing football']
const hash = (title = 'Guest cards', cards = words) =>
  '#deck=1.' +
  gzipSync(JSON.stringify({ v: 1, title, words: cards })).toString('base64url')
async function create(page: Page, cards = words) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Create deck' }).click()
  await page.getByLabel('Paste your words').fill(cards.join('\n'))
  await page.getByRole('button', { name: 'Preview cards', exact: true }).click()
  await page.getByLabel('Deck name').fill('Class words')
  await page.getByRole('button', { name: 'Save deck & play' }).click()
  await expect(page.locator('.setup-heading h1')).toHaveText('Class words')
  await page.reload()
  await page.getByRole('button', { name: /My decks/ }).click()
}
async function share(page: Page) {
  await page
    .getByRole('button', { name: 'Share Class words', exact: true })
    .click()
  await page.getByRole('button', { name: 'Create share link' }).click()
  await expect(page.getByLabel('Deck link', { exact: true })).toBeVisible()
  return page.getByLabel('Deck link', { exact: true }).inputValue()
}
async function buttons(page: Page) {
  await page.getByRole('button', { name: 'Game settings', exact: true }).click()
  await page
    .getByRole('checkbox', { name: /Use buttons instead of motion/ })
    .check()
  await page.getByRole('button', { name: 'Close dialog' }).click()
}
test('generated QR transfers Arabic cards to a fresh browser and plays them', async ({
  page,
  browser,
}, info) => {
  await create(page)
  const outgoing: string[] = []
  page.on('request', (request) => outgoing.push(request.url()))
  const link = await share(page)
  await expect(page.getByRole('img', { name: /QR code for/ })).toBeInViewport({
    ratio: 1,
  })
  const source = await page
    .getByRole('img', { name: /QR code for/ })
    .getAttribute('src')
  const { data, info: dimensions } = await sharp(
    Buffer.from(source!.split(',')[1], 'base64'),
  )
    .resize(320, 320)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const decoded = jsQR(
    new Uint8ClampedArray(data),
    dimensions.width,
    dimensions.height,
  )
  expect(decoded?.data).toBe(link)
  expect(outgoing).toEqual([])
  await page.screenshot({ path: info.outputPath('share-qr.png') })
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  })
  try {
    const guest = await context.newPage()
    await guest.clock.install()
    await guest.goto(decoded!.data)
    await expect(
      guest.getByRole('dialog', { name: 'Open shared deck' }),
    ).toBeVisible()
    await guest.getByText('View all cards', { exact: true }).click()
    await expect(guest.locator('.shared-cards li').first()).toHaveCSS(
      'direction',
      'rtl',
    )
    await expect(guest.locator('.shared-cards li')).toHaveText(words)
    await guest.screenshot({ path: info.outputPath('receive-arabic.png') })
    await guest.getByRole('button', { name: 'Save a copy & play' }).click()
    await expect(guest.locator('.share-dialog')).toHaveCount(0)
    await expect(guest.locator('.setup-heading h1')).toHaveText('Class words')
    await buttons(guest)
    await guest.getByRole('button', { name: 'Start round' }).click()
    await guest.clock.runFor(3100)
    await expect(guest.locator('.game-stage')).toHaveClass(/playing/)
    const actual: string[] = []
    for (let i = 0; i < 3; i++) {
      actual.push(
        (await guest.locator('.game-center .prompt-text').textContent())!,
      )
      await guest.getByRole('button', { name: 'Correct', exact: true }).click()
      await guest.clock.runFor(350)
    }
    expect(actual.sort()).toEqual([...words].sort())
  } finally {
    await context.close()
  }
})
test('reopening a link preserves edits and offers another independent copy', async ({
  page,
}) => {
  await page.goto('/' + hash())
  await page.getByRole('button', { name: 'Save a copy & play' }).click()
  await expect(page.locator('.share-dialog')).toHaveCount(0)
  await page.reload()
  await page.getByRole('button', { name: /My decks/ }).click()
  await page.getByRole('button', { name: 'Manage Guest cards' }).click()
  await page.getByLabel('Deck name').fill('My edited copy')
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(page.locator('.deck-dialog[open]')).toHaveCount(0)
  await page.goto('/' + hash())
  await page.getByRole('button', { name: 'Open saved copy' }).click()
  await expect(page.locator('.setup-heading h1')).toHaveText('My edited copy')
  await page.goto('/' + hash())
  await page.getByRole('button', { name: 'Save another copy' }).click()
  await expect(page.locator('.share-dialog')).toHaveCount(0)
  await page.reload()
  await page.getByRole('button', { name: /My decks/ }).click()
  await expect(page.locator('.bank-card.custom')).toHaveCount(2)
  await expect(
    page.getByRole('button', { name: 'Manage My edited copy' }),
  ).toBeVisible()
})
test('bad links are recoverable and incoming links wait for drafts', async ({
  page,
}) => {
  await page.goto('/#deck=1.broken')
  await expect(page.getByRole('alert')).toContainText('could not be read')
  await page
    .getByLabel('Paste deck link')
    .fill(new URL(hash(), page.url()).href)
  await page.getByRole('button', { name: 'Preview shared deck' }).click()
  await expect(page.getByRole('heading', { name: 'Guest cards' })).toBeVisible()
  await page.getByRole('button', { name: 'Close sharing' }).click()
  await page.getByRole('button', { name: 'Create deck' }).click()
  await page.getByLabel('Paste your words').fill('Unfinished work')
  await page.evaluate((value) => {
    location.hash = value
  }, hash())
  await expect(page.locator('.share-dialog')).toHaveCount(0)
  await expect(page.getByLabel('Paste your words')).toHaveValue(
    'Unfinished work',
  )
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Close deck creator' }).click()
  await expect(page.getByRole('heading', { name: 'Guest cards' })).toBeVisible()
})
test('incoming sharing waits until the active round ends', async ({ page }) => {
  await page.clock.install()
  await page.goto('/')
  await page.locator('.bank-card').first().click()
  await buttons(page)
  await page.getByRole('button', { name: 'Start round' }).click()
  await page.clock.runFor(3100)
  await expect(page.locator('.game-stage')).toHaveClass(/playing/)
  await page.evaluate((value) => {
    location.hash = value
  }, hash())
  await expect(page.locator('.share-dialog')).toHaveCount(0)
  await page.clock.fastForward(61000)
  await expect(page.getByRole('heading', { name: 'Guest cards' })).toBeVisible()
})
test('failed saving preserves the preview and file export', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const add = IDBObjectStore.prototype.add
    let fail = true
    IDBObjectStore.prototype.add = function (...args) {
      const request = add.apply(this, args)
      if (fail) {
        fail = false
        request.addEventListener('success', () => this.transaction.abort())
      }
      return request
    }
  })
  await page.goto('/' + hash())
  await page.getByRole('button', { name: 'Save a copy & play' }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export words (.txt)' }).click()
  expect((await download).suggestedFilename()).toBe('Guest cards.txt')
  await expect(page.getByRole('heading', { name: 'Guest cards' })).toBeVisible()
  await page.getByRole('button', { name: 'Save a copy & play' }).click()
  await expect(page.locator('.share-dialog')).toHaveCount(0)
  await expect(page.locator('.setup-heading h1')).toHaveText('Guest cards')
})
test('clipboard denial and cancelled native sharing retain the link', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: async () => {
          throw new Error('denied')
        },
      },
    })
    Object.defineProperty(navigator, 'share', {
      value: async () => {
        throw new DOMException('cancelled', 'AbortError')
      },
    })
  })
  await create(page)
  const link = await share(page)
  await page.getByRole('button', { name: 'Copy link', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Select and copy')
  await page.getByRole('button', { name: 'Share link', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Sharing cancelled')
  await expect(page.getByLabel('Deck link', { exact: true })).toHaveValue(link)
  await page.getByRole('button', { name: 'Close sharing' }).click()
  await expect(
    page.getByRole('button', { name: 'Share Class words' }),
  ).toBeFocused()
})
test('large decks offer links or files without truncation', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 844, height: 390 })
  await create(
    page,
    Array.from(
      { length: 200 },
      (_, i) => 'Word ' + i + ' ' + ((i * 2654435761) >>> 0).toString(36),
    ),
  )
  await share(page)
  await expect(
    page.getByText('A QR code is unavailable', { exact: false }),
  ).toBeVisible()
  await expect(page.getByRole('img', { name: /QR code for/ })).toHaveCount(0)
  await page
    .getByRole('button', { name: 'Export words (.txt)' })
    .scrollIntoViewIfNeeded()
  await expect(
    page.getByRole('button', { name: 'Export words (.txt)' }),
  ).toBeInViewport({ ratio: 1 })
  await page.screenshot({
    path: info.outputPath('share-landscape-file-fallback.png'),
  })
})

test('oversized links keep every word available as a file', async ({
  page,
}) => {
  const cards = Array.from(
    { length: 400 },
    () => crypto.randomUUID() + crypto.randomUUID(),
  )
  await create(page, cards)
  await page.getByRole('button', { name: 'Share Class words' }).click()
  await page.getByRole('button', { name: 'Create share link' }).click()
  await expect(page.getByRole('alert')).toContainText('too large')
  await expect(page.getByLabel('Deck link', { exact: true })).toHaveCount(0)
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export words (.txt)' }).click()
  const path = await (await download).path()
  const { readFile } = await import('node:fs/promises')
  expect(await readFile(path!, 'utf8')).toBe(cards.join('\n'))
  await page.getByRole('button', { name: 'Close sharing' }).click()
  await expect(page.locator('.bank-card.custom')).toContainText('400 cards')
})
test('unavailable compression offers export and opening a link remains usable', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'CompressionStream', { value: undefined })
  })
  await create(page)
  await page.getByRole('button', { name: 'Share Class words' }).click()
  await page.getByRole('button', { name: 'Create share link' }).click()
  await expect(page.getByRole('alert')).toContainText('Export a word-bank file')
  await expect(
    page.getByRole('button', { name: 'Export words (.txt)' }),
  ).toBeEnabled()
  await page.getByRole('button', { name: 'Close sharing' }).click()
  await page.getByRole('button', { name: 'Open deck link' }).click()
  await page
    .getByLabel('Paste deck link')
    .fill(new URL(hash(), page.url()).href)
  await page.getByRole('button', { name: 'Preview shared deck' }).click()
  await expect(page.getByRole('heading', { name: 'Guest cards' })).toBeVisible()
})
test('shared preview preserves literal text and fits short landscape with enlarged text', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 740, height: 320 })
  const literal = '<img src=x onerror=alert(1)>'
  await page.goto('/' + hash('قائمة كلمات طويلة', [words[0], literal]))
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
  await page.getByText('View all cards', { exact: true }).click()
  await expect(page.locator('.shared-cards li').last()).toHaveText(literal)
  await expect(page.locator('.shared-cards img')).toHaveCount(0)
  const save = page.getByRole('button', { name: 'Save a copy & play' })
  await save.scrollIntoViewIfNeeded()
  await expect(save).toBeInViewport({ ratio: 1 })
  expect(
    await page
      .locator('.share-dialog')
      .evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
  ).toBe(true)
  await page.screenshot({
    path: info.outputPath('receive-landscape-200-text.png'),
  })
})
