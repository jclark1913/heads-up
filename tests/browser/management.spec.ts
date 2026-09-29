import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import type { CustomBank } from '../../src/content/decks'

async function create(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Create deck' }).click()
  await page.getByLabel('Paste your words').fill('cat\nNew York\nقِطَّة')
  await page.getByRole('button', { name: 'Preview cards', exact: true }).click()
  await page.getByLabel('Deck name').fill('Lesson one')
  await page.getByRole('button', { name: 'Save deck & play' }).click()
  await expect(page.locator('.setup-heading h1')).toHaveText('Lesson one')
  await page.reload()
  await page.getByRole('button', { name: /My decks/ }).click()
}
async function manage(page: Page, title = 'Lesson one') {
  await page
    .getByRole('button', { name: 'Manage ' + title, exact: true })
    .click()
  return page.getByRole('dialog', { name: 'Edit your deck' })
}
async function records(page: Page): Promise<CustomBank[]> {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open('heads-up.decks', 1)
        request.onerror = () => reject(request.error?.message)
        request.onsuccess = () => {
          const db = request.result
          const transaction = db.transaction('banks', 'readonly')
          const read = transaction.objectStore('banks').getAll()
          transaction.oncomplete = () => {
            resolve(read.result)
            db.close()
          }
          transaction.onabort = () => {
            reject(transaction.error?.message)
            db.close()
          }
        }
      }),
  )
}
const card = (page: Page, n: number) =>
  page.getByRole('textbox', { name: 'Card ' + n, exact: true })

test('edit, add, remove, export, and reimport retain card text and order', async ({
  page,
}) => {
  await create(page)
  const [original] = await records(page)
  await manage(page)
  await expect(
    page.getByRole('button', { name: 'Save changes' }),
  ).toBeDisabled()
  await page.getByLabel('Deck name').fill('Practice words')
  await card(page, 1).fill('Playing football')
  await page.getByRole('button', { name: 'Remove card 2' }).click()
  await page.getByRole('button', { name: 'Add card', exact: true }).click()
  await expect(card(page, 3)).toBeFocused()
  await expect(
    page.getByRole('button', { name: 'Save changes' }),
  ).toBeDisabled()
  await card(page, 3).fill('New York, NY')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Manage Practice words' }),
  ).toBeFocused()
  await page.reload()
  await page.getByRole('button', { name: /My decks/ }).click()
  await manage(page, 'Practice words')
  const [saved] = await records(page)
  expect(saved).toMatchObject({
    id: original.id,
    version: 2,
    createdAt: original.createdAt,
  })
  expect(saved.prompts.map((p) => p.text)).toEqual([
    'Playing football',
    'قِطَّة',
    'New York, NY',
  ])
  expect(saved.prompts[0].id).toBe(original.prompts[0].id)
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export words' }).click()
  const download = await pending
  expect(download.suggestedFilename()).toBe('Practice words.txt')
  const bytes = await readFile((await download.path())!)
  expect(bytes.toString('utf8')).toBe('Playing football\nقِطَّة\nNew York, NY')
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await page.getByRole('button', { name: 'Create deck' }).click()
  await page.getByLabel('Word bank file').setInputFiles({
    name: 'Practice words.txt',
    mimeType: 'text/plain',
    buffer: bytes,
  })
  await page.getByRole('button', { name: 'Preview cards', exact: true }).click()
  await page.getByLabel('Deck name').fill('Imported copy')
  await page.getByRole('button', { name: 'Save deck & play' }).click()
  await expect(page.locator('.setup-heading h1')).toHaveText('Imported copy')
  const all = await records(page)
  expect(all).toHaveLength(2)
  const copy = all.find((bank) => bank.id !== saved.id)!
  expect(copy.version).toBe(1)
  expect(copy.prompts.map((p) => p.text)).toEqual(
    saved.prompts.map((p) => p.text),
  )
})

test('replacement requires confirmation and preserves deck identity', async ({
  page,
}) => {
  await create(page)
  const [original] = await records(page)
  await manage(page)
  await page
    .getByRole('button', { name: 'Replace cards from text or file' })
    .click()
  await page
    .locator('dialog[open]')
    .getByLabel('Word bank file')
    .setInputFiles({
      name: 'replacement.json',
      mimeType: 'application/json',
      buffer: Buffer.from(
        JSON.stringify({
          title: 'Ignored source title',
          words: ['مَدْرَسَة', 'Reading a book'],
        }),
      ),
    })
  await page.getByRole('button', { name: 'Preview cards', exact: true }).click()
  await expect(page.getByLabel('Deck name')).toHaveValue('Lesson one')
  page.once('dialog', (d) => d.dismiss())
  await page.getByRole('button', { name: 'Save replacement' }).click()
  expect(await records(page)).toEqual([original])
  await expect(card(page, 1)).toHaveValue('مَدْرَسَة')
  page.once('dialog', (d) => d.accept())
  await page.getByRole('button', { name: 'Save replacement' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  const [saved] = await records(page)
  expect(saved).toMatchObject({
    id: original.id,
    version: 2,
    title: 'Lesson one',
  })
  expect(saved.prompts.map((p) => p.text)).toEqual([
    'مَدْرَسَة',
    'Reading a book',
  ])
})

test('cancelled edits and deletion preserve storage; confirmed deletion survives reload', async ({
  page,
}) => {
  await create(page)
  const [original] = await records(page)
  await manage(page)
  await card(page, 1).fill('Unsaved')
  page.once('dialog', (d) => d.dismiss())
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(card(page, 1)).toHaveValue('Unsaved')
  page.once('dialog', (d) => d.accept())
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  expect(await records(page)).toEqual([original])
  await manage(page)
  await expect(card(page, 1)).toHaveValue('cat')
  page.once('dialog', (d) => d.dismiss())
  await page.getByRole('button', { name: 'Delete deck', exact: true }).click()
  expect(await records(page)).toEqual([original])
  page.once('dialog', (d) => d.accept())
  await page.getByRole('button', { name: 'Delete deck', exact: true }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(page.getByRole('button', { name: /My decks/ })).toBeFocused()
  await expect(page.locator('.bank-card.custom')).toHaveCount(0)
  await page.reload()
  await page.getByRole('button', { name: /My decks/ }).click()
  await expect(page.locator('.bank-card.custom')).toHaveCount(0)
  expect(await records(page)).toEqual([])
})

for (const operation of ['put', 'delete'] as const) {
  test(
    'aborted ' +
      operation +
      ' leaves the saved deck and draft intact for retry',
    async ({ page }) => {
      await create(page)
      const [original] = await records(page)
      await page.evaluate((method) => {
        const old = IDBObjectStore.prototype[method]
        let once = true
        // Both methods return IDBRequest and accept a first argument; preserve native invocation.
        Object.defineProperty(IDBObjectStore.prototype, method, {
          configurable: true,
          writable: true,
          value: function (this: IDBObjectStore, ...args: unknown[]) {
            const request: IDBRequest = Reflect.apply(old, this, args)
            if (once) {
              once = false
              const tx = this.transaction
              request.addEventListener('success', () => tx.abort())
            }
            return request
          },
        })
      }, operation)
      await manage(page)
      await card(page, 1).fill('Still here')
      const action = page.getByRole('button', {
        name: operation === 'put' ? 'Save changes' : 'Delete deck',
        exact: true,
      })
      if (operation === 'delete') page.once('dialog', (d) => d.accept())
      await action.click()
      await expect(page.getByRole('alert')).toContainText(
        'could not be changed',
      )
      await expect(card(page, 1)).toHaveValue('Still here')
      expect(await records(page)).toEqual([original])
      if (operation === 'delete') page.once('dialog', (d) => d.accept())
      await action.click()
      await expect(page.getByRole('dialog')).not.toBeVisible()
      const saved = await records(page)
      if (operation === 'put')
        expect(saved[0].prompts[0].text).toBe('Still here')
      else expect(saved).toEqual([])
    },
  )
}

test('stale editors keep drafts, can reload, and cannot overwrite newer cards', async ({
  page,
}) => {
  await create(page)
  await manage(page)
  await card(page, 1).fill('My draft')
  const other = await page.context().newPage()
  await other.goto('/')
  await other.getByRole('button', { name: /My decks/ }).click()
  await manage(other)
  await card(other, 1).fill('Saved elsewhere')
  await other.getByRole('button', { name: 'Save changes' }).click()
  await expect(other.getByRole('dialog')).not.toBeVisible()
  await page.bringToFront()
  await expect(card(page, 1)).toHaveValue('My draft')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByRole('alert')).toContainText('changed in another tab')
  expect((await records(page))[0].prompts[0].text).toBe('Saved elsewhere')
  page.once('dialog', (d) => d.dismiss())
  await page.getByRole('button', { name: 'Reload saved deck' }).click()
  await expect(card(page, 1)).toHaveValue('My draft')
  page.once('dialog', (d) => d.accept())
  await page.getByRole('button', { name: 'Reload saved deck' }).click()
  await expect(card(page, 1)).toHaveValue('Saved elsewhere')
  await expect(
    page.getByRole('button', { name: 'Save changes' }),
  ).toBeDisabled()
  await card(page, 1).fill('Now resolved')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  expect((await records(page))[0]).toMatchObject({
    version: 3,
    prompts: [{ text: 'Now resolved' }, {}, {}],
  })
  await other.close()
})

test('external deletion keeps an open draft and permits recovery only as a new deck', async ({
  page,
}) => {
  await create(page)
  const [original] = await records(page)
  await manage(page)
  await card(page, 1).fill('Recover me')
  const other = await page.context().newPage()
  await other.goto('/')
  await other.getByRole('button', { name: /My decks/ }).click()
  await manage(other)
  other.once('dialog', (d) => d.accept())
  await other.getByRole('button', { name: 'Delete deck', exact: true }).click()
  await expect(other.getByRole('dialog')).not.toBeVisible()
  await page.bringToFront()
  await expect(card(page, 1)).toHaveValue('Recover me')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByRole('alert')).toContainText('deleted in another tab')
  expect(await records(page)).toEqual([])
  await page.getByLabel('Deck name').fill('Recovered copy')
  await page.getByRole('button', { name: 'Save as new deck' }).click()
  await expect(page.locator('.setup-heading h1')).toHaveText('Recovered copy')
  const [copy] = await records(page)
  expect(copy.id).not.toBe(original.id)
  expect(copy.version).toBe(1)
  expect(copy.prompts[0].text).toBe('Recover me')
  // Passive tabs learn about both creation and later changes without reloading.
  await other.bringToFront()
  await expect(
    other.getByRole('button', { name: 'Manage Recovered copy' }),
  ).toBeVisible()
  await manage(other, 'Recovered copy')
  other.once('dialog', (d) => d.accept())
  await other.getByRole('button', { name: 'Delete deck', exact: true }).click()
  await expect(other.getByRole('dialog')).not.toBeVisible()
  await page.bringToFront()
  await expect(page.locator('.home-shell')).toBeVisible()
  await other.close()
})

test('management actions fit short landscape and portrait with enlarged text', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 740, height: 320 })
  await create(page)
  await manage(page)
  await card(page, 3).focus()
  await expect(page.locator('.card-sample .prompt-text')).toHaveCSS(
    'direction',
    'rtl',
  )
  await page.screenshot({ path: info.outputPath('manage-landscape.png') })
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  await card(page, 1).fill('Practice')
  for (const name of ['Save changes', 'Cancel']) {
    await expect(
      page.getByRole('button', { name, exact: true }),
    ).toBeInViewport({ ratio: 1 })
  }
  await page
    .getByRole('button', { name: 'Delete deck', exact: true })
    .scrollIntoViewIfNeeded()
  await expect(
    page.getByRole('button', { name: 'Delete deck', exact: true }),
  ).toBeInViewport({ ratio: 1 })
  await page.screenshot({ path: info.outputPath('manage-large-landscape.png') })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.evaluate(() => {
    document.documentElement.style.fontSize = ''
  })
  await page.getByLabel('Deck name').scrollIntoViewIfNeeded()
  await page.screenshot({ path: info.outputPath('manage-portrait.png') })
  await expect(
    page.getByRole('button', { name: 'Save changes' }),
  ).toBeInViewport({ ratio: 1 })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
})
