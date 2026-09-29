import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

async function paste(page: Page, words: string, delimiter = 'commas') {
  await page.getByRole('button', { name: 'Create deck' }).click()
  await page.getByLabel('Paste your words').fill(words)
  await page.getByLabel('Separate cards by').selectOption(delimiter)
  await page.getByRole('button', { name: 'Preview cards', exact: true }).click()
}
async function enableButtons(page: Page) {
  await page.getByRole('button', { name: 'Game settings', exact: true }).click()
  await page
    .getByRole('checkbox', { name: /Use buttons instead of motion/ })
    .check()
  await page.getByRole('button', { name: 'Close dialog' }).click()
}

test('paste, correct, save, reload, and play every custom card', async ({
  page,
}, info) => {
  await page.clock.install()
  await page.setViewportSize({ width: 844, height: 390 })
  await page.goto('/')
  await paste(page, 'cat, dog, New York,قِطَّة, cat,,')
  await expect(page.getByRole('status')).toContainText(
    '4 cards · 2 empty entries removed · 1 duplicates removed',
  )
  await expect(
    page.getByRole('button', { name: 'Save deck & play' }),
  ).toBeDisabled()
  await page.getByLabel('Deck name').fill('Classroom favorites')
  await page
    .getByRole('textbox', { name: 'Card 2', exact: true })
    .fill('Playing football')
  await page.getByRole('textbox', { name: 'Card 4', exact: true }).focus()
  await expect(page.locator('.card-sample .prompt-text')).toHaveCSS(
    'direction',
    'rtl',
  )
  await expect(
    page.getByRole('button', { name: 'Save deck & play' }),
  ).toBeInViewport({ ratio: 1 })
  await page.screenshot({ path: info.outputPath('custom-deck-preview.png') })
  await page.getByRole('button', { name: 'Save deck & play' }).click()
  await expect(page.locator('.setup-heading h1')).toHaveText(
    'Classroom favorites',
  )
  // Creation does not silently switch controls.
  await expect(page.getByRole('button', { name: 'Start round' })).toBeDisabled()
  await page.reload()
  await page.getByRole('button', { name: /My decks/ }).click()
  await expect(page.locator('.bank-card.custom')).toHaveCount(1)
  await page.locator('.bank-card.custom').click()
  await enableButtons(page)
  await page.getByRole('button', { name: 'Start round' }).click()
  await page.clock.runFor(3100)
  const words: string[] = []
  for (let i = 0; i < 4; i++) {
    words.push((await page.locator('.game-center .prompt-text').textContent())!)
    await page.getByRole('button', { name: 'Correct', exact: true }).click()
    await page.clock.runFor(350)
  }
  expect(words.sort()).toEqual(
    ['cat', 'Playing football', 'New York', 'قِطَّة'].sort(),
  )
  await expect(
    page.getByText('ALL CARDS PLAYED', { exact: true }),
  ).toBeVisible()
  await expect(page.locator('.results-list .section-heading')).toContainText(
    'Classroom favorites',
  )
  await page.getByRole('button', { name: 'Play again' }).click()
  await expect(page.locator('.setup-heading h1')).toHaveText(
    'Classroom favorites',
  )
})

test('cancel, validation, and changing parsing options preserve corrections until confirmed', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Create deck' }).click()
  await expect(page.getByLabel('Separate cards by')).toHaveValue('lines')
  await page.getByLabel('Paste your words').fill('cat, dog\n' + 'x'.repeat(121))
  await page.getByRole('button', { name: 'Preview cards', exact: true }).click()
  await page.getByLabel('Deck name').fill('Practice')
  await expect(
    page.getByRole('textbox', { name: 'Card 1', exact: true }),
  ).toHaveValue('cat, dog')
  await expect(
    page.getByRole('textbox', { name: 'Card 2', exact: true }),
  ).toHaveAttribute('aria-invalid', 'true')
  await expect(
    page.getByRole('button', { name: 'Save deck & play' }),
  ).toBeDisabled()
  await page.getByRole('button', { name: 'Remove card 2' }).click()
  await page
    .getByRole('textbox', { name: 'Card 1', exact: true })
    .fill('Corrected')
  await page.getByRole('button', { name: 'Back to text' }).click()
  await page.getByLabel('Separate cards by').selectOption('commas')
  page.once('dialog', (dialog) => dialog.dismiss())
  await page.getByRole('button', { name: 'Preview cards', exact: true }).click()
  await expect(
    page.getByRole('textbox', { name: 'Card 1', exact: true }),
  ).toHaveValue('Corrected')
  await page.getByRole('button', { name: 'Back to text' }).click()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Preview cards', exact: true }).click()
  await expect(
    page.getByRole('textbox', { name: 'Card 1', exact: true }),
  ).toHaveValue('cat')
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Close deck creator' }).click()
  await expect(page.getByRole('button', { name: 'Create deck' })).toBeFocused()
  await page.getByRole('button', { name: /My decks/ }).click()
  await expect(page.locator('.bank-card.custom')).toHaveCount(0)
})

test('a transaction aborted after request success keeps the draft and allows retry', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const add = IDBObjectStore.prototype.add
    let failOnce = true
    IDBObjectStore.prototype.add = function (...args) {
      const request = add.apply(this, args)
      if (failOnce) {
        failOnce = false
        const transaction = this.transaction
        request.addEventListener('success', () => transaction.abort())
      }
      return request
    }
  })
  await page.goto('/')
  await paste(page, 'cat, dog')
  await page.getByLabel('Deck name').fill('Retry me')
  await page.getByRole('button', { name: 'Save deck & play' }).click()
  await expect(page.getByRole('alert')).toContainText('could not be saved')
  await expect(page.getByLabel('Deck name')).toHaveValue('Retry me')
  const downloaded = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export words' }).click()
  expect((await downloaded).suggestedFilename()).toBe('Retry me.txt')
  await page.getByRole('button', { name: 'Save deck & play' }).click()
  await expect(page.locator('.setup-heading h1')).toHaveText('Retry me')
  await page.reload()
  await page.getByRole('button', { name: /My decks/ }).click()
  await expect(page.locator('.bank-card.custom')).toHaveCount(1)
})

test('unavailable storage leaves starter decks playable and never claims a save', async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      get() {
        throw new DOMException('Blocked', 'SecurityError')
      },
    }),
  )
  await page.goto('/')
  await expect(page.getByRole('status')).toContainText('could not be loaded')
  await paste(page, 'قِطَّة')
  await page.getByLabel('Deck name').fill('Arabic')
  await page.getByRole('button', { name: 'Save deck & play' }).click()
  await expect(page.getByRole('alert')).toContainText('storage is unavailable')
  await expect(
    page.getByRole('textbox', { name: 'Card 1', exact: true }),
  ).toHaveValue('قِطَّة')
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Close deck creator' }).click()
  await page.locator('.bank-card.en').click()
  await enableButtons(page)
  await expect(page.getByRole('button', { name: 'Start round' })).toBeEnabled()
})

test('short landscape keeps creation actions visible, including enlarged text', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 740, height: 320 })
  await page.goto('/')
  await paste(page, 'قِطَّة, New York, ' + 'A long phrase '.repeat(8))
  await page.getByLabel('Deck name').fill('Weekend words')
  await page.screenshot({
    path: info.outputPath('short-landscape-preview.png'),
  })
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  await expect(
    page.getByRole('button', { name: 'Save deck & play' }),
  ).toBeInViewport({ ratio: 1 })
  await expect(
    page.getByRole('button', { name: 'Back to text' }),
  ).toBeInViewport({ ratio: 1 })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollHeight <= innerHeight + 1,
    ),
  ).toBe(true)
  await page.screenshot({ path: info.outputPath('large-text-preview.png') })
  await page.evaluate(() => {
    document.documentElement.style.fontSize = ''
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(
    page.getByRole('button', { name: 'Save deck & play' }),
  ).toBeInViewport({ ratio: 1 })
  await page.screenshot({ path: info.outputPath('portrait-preview.png') })
})

test('unreadable saved records are retained while valid decks still load', async ({
  page,
}) => {
  await page.goto('/')
  await paste(page, '<b>Plain text</b>,قِطَّة')
  await page.getByLabel('Deck name').fill('Kept deck')
  await page.getByRole('button', { name: 'Save deck & play' }).click()
  await expect(page.locator('.setup-heading h1')).toHaveText('Kept deck')
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('heads-up.decks', 1)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const db = request.result
        const transaction = db.transaction('banks', 'readwrite')
        transaction
          .objectStore('banks')
          .add({ id: 'custom-corrupt', prompts: [null] })
        transaction
          .objectStore('banks')
          .add({ id: 'custom-future', schemaVersion: 2 })
        transaction.oncomplete = () => {
          db.close()
          resolve()
        }
        transaction.onabort = () => {
          db.close()
          reject(transaction.error)
        }
      }
    })
  })
  await page.reload()
  await expect(page.getByRole('status')).toContainText(
    'Their stored data has been kept',
  )
  await page.getByRole('button', { name: /My decks/ }).click()
  await expect(page.locator('.bank-card.custom')).toHaveCount(1)
  const count = await page.evaluate(
    () =>
      new Promise<number>((resolve, reject) => {
        const request = indexedDB.open('heads-up.decks', 1)
        request.onsuccess = () => {
          const db = request.result
          const transaction = db.transaction('banks', 'readonly')
          const count = transaction.objectStore('banks').count()
          transaction.oncomplete = () => {
            db.close()
            resolve(count.result)
          }
          transaction.onabort = () => {
            db.close()
            reject(transaction.error)
          }
        }
        request.onerror = () => reject(request.error)
      }),
  )
  expect(count).toBe(3)
})
