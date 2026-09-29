import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

async function openCreator(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Create deck' }).click()
}
async function chooseFile(page: Page, name: string, contents: string | Buffer) {
  await page.getByLabel('Word bank file').setInputFiles({
    name,
    mimeType: 'application/octet-stream',
    buffer:
      typeof contents === 'string' ? Buffer.from(contents, 'utf8') : contents,
  })
  await expect(page.locator('.deck-content')).toHaveAttribute(
    'aria-busy',
    'false',
  )
}
const card = (page: Page, n: number) =>
  page.getByRole('textbox', { name: 'Card ' + n, exact: true })

test('CSV file uses the selected column and survives reload into a complete Arabic-capable round', async ({
  page,
}, info) => {
  await page.clock.install()
  await page.setViewportSize({ width: 844, height: 390 })
  await openCreator(page)
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Import file' }).click()
  await (
    await chooser
  ).setFiles({
    name: 'class.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(
      '\uFEFFid,word\r\n1,"New York, NY"\r\n2,"say ""hello"""\r\n3,قِطَّة\r\n4,"line\r\nbreak"',
      'utf8',
    ),
  })
  await expect(page.getByLabel('Input format')).toHaveValue('csv')
  await expect(page.getByLabel('First row is a header')).not.toBeChecked()
  await page.getByLabel('First row is a header').check()
  await page.getByLabel('Card column').selectOption('1')
  await page.screenshot({ path: info.outputPath('csv-import-landscape.png') })
  await expect(
    page.getByRole('button', { name: 'Preview cards', exact: true }),
  ).toBeInViewport({ ratio: 1 })
  await page.getByRole('button', { name: 'Preview cards', exact: true }).click()
  await expect(card(page, 1)).toHaveValue('New York, NY')
  await expect(card(page, 2)).toHaveValue('say "hello"')
  await expect(card(page, 3)).toHaveValue('قِطَّة')
  await expect(card(page, 4)).toHaveValue('line break')
  await expect(page.locator('.preview-summary')).toContainText(
    '1 entries had line breaks replaced with spaces',
  )
  await card(page, 3).focus()
  await expect(page.locator('.card-sample .prompt-text')).toHaveCSS(
    'direction',
    'rtl',
  )
  await page.getByLabel('Deck name').fill('Imported class')
  await page.getByRole('button', { name: 'Save deck & play' }).click()
  await expect(page.locator('.setup-heading h1')).toHaveText('Imported class')
  await page.reload()
  await page.getByRole('button', { name: /My decks/ }).click()
  await page.locator('.bank-card.custom').click()
  await page.getByRole('button', { name: 'Game settings', exact: true }).click()
  await page
    .getByRole('checkbox', { name: /Use buttons instead of motion/ })
    .check()
  await page.getByRole('button', { name: 'Close dialog' }).click()
  await page.getByRole('button', { name: 'Start round' }).click()
  await page.clock.runFor(3100)
  const words: string[] = []
  for (let i = 0; i < 4; i++) {
    words.push((await page.locator('.game-center .prompt-text').textContent())!)
    await page.getByRole('button', { name: 'Correct', exact: true }).click()
    await page.clock.runFor(350)
  }
  expect(words.sort()).toEqual(
    ['New York, NY', 'say "hello"', 'قِطَّة', 'line break'].sort(),
  )
  await expect(
    page.getByText('ALL CARDS PLAYED', { exact: true }),
  ).toBeVisible()
})

test('JSON title and invalid entries remain editable without coercion', async ({
  page,
}, info) => {
  await openCreator(page)
  await chooseFile(
    page,
    'lesson.json',
    JSON.stringify({
      title: 'الدرس الأول',
      words: ['قِطَّة', 12, { word: 'dog' }, 'New\nYork', '<b>cat</b>'],
    }),
  )
  await page.getByRole('button', { name: 'Preview cards', exact: true }).click()
  await expect(page.getByLabel('Deck name')).toHaveValue('الدرس الأول')
  await expect(card(page, 2)).toHaveValue('')
  await expect(card(page, 2)).toHaveAttribute('aria-invalid', 'true')
  await expect(
    page.getByRole('button', { name: 'Save deck & play' }),
  ).toBeDisabled()
  await card(page, 2).fill('dog')
  await page.getByRole('button', { name: 'Remove card 3' }).click()
  await expect(card(page, 3)).toHaveValue('New York')
  await expect(card(page, 4)).toHaveValue('<b>cat</b>')
  await card(page, 4).focus()
  await expect(page.locator('.card-sample b')).toHaveCount(0)
  await page.screenshot({ path: info.outputPath('json-corrections.png') })
  await page.getByRole('button', { name: 'Save deck & play' }).click()
  await expect(page.locator('.setup-heading h1')).toHaveText('الدرس الأول')
})

test('TXT files use explicit delimiters and bad replacement files preserve the source', async ({
  page,
}) => {
  await openCreator(page)
  await chooseFile(page, 'lesson.TXT', '\uFEFFقِطَّة، New York, dog\r\ncat')
  await expect(page.getByLabel('Separate cards by')).toHaveValue('lines')
  await page.getByRole('button', { name: 'Preview cards', exact: true }).click()
  await expect(card(page, 1)).toHaveValue('قِطَّة، New York, dog')
  await page.getByRole('button', { name: 'Back to text' }).click()
  const source = await page.getByLabel('Paste your words').inputValue()
  for (const [name, buffer, message] of [
    ['bad.txt', Buffer.from([0xc3, 0x28]), 'UTF-8'],
    ['large.txt', Buffer.alloc(1024 * 1024 + 1, 97), '1 MiB'],
    ['wrong.pdf', Buffer.from('cat'), '.txt, .csv, or .json'],
  ] as const) {
    await chooseFile(page, name, buffer)
    await expect(page.getByRole('alert')).toContainText(message)
    await expect(page.getByLabel('Paste your words')).toHaveValue(source)
  }
  await page.getByLabel('Word bank file').setInputFiles([])
  await expect(page.getByLabel('Paste your words')).toHaveValue(source)
  await page.getByLabel('Separate cards by').selectOption('commas')
  await page.getByRole('button', { name: 'Preview cards', exact: true }).click()
  await expect(card(page, 1)).toHaveValue('قِطَّة')
  await expect(card(page, 2)).toHaveValue('New York')
  await expect(page.locator('.draft-cards li')).toHaveCount(4)
})

test('malformed structured input is never retried as text and the same file can be retried', async ({
  page,
}) => {
  await openCreator(page)
  await chooseFile(page, 'lesson.json', '{"words":')
  await page.getByRole('button', { name: 'Preview cards', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('JSON could not be read')
  await expect(page.getByLabel('Input format')).toHaveValue('json')
  await chooseFile(page, 'lesson.json', '{"cards":["cat"]}')
  await page.getByRole('button', { name: 'Preview cards', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('JSON list of strings')
  await chooseFile(page, 'lesson.json', '["cat"]')
  await page.getByRole('button', { name: 'Preview cards', exact: true }).click()
  await expect(card(page, 1)).toHaveValue('cat')
  await page.getByRole('button', { name: 'Back to text' }).click()
  await chooseFile(page, 'lesson.csv', 'word\n"broken')
  await page.getByRole('button', { name: 'Preview cards', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('CSV could not be read')
  await expect(page.getByLabel('Input format')).toHaveValue('csv')
  await chooseFile(page, 'lesson.csv', 'word\ncat')
  await page.getByLabel('First row is a header').check()
  await page.getByRole('button', { name: 'Preview cards', exact: true }).click()
  await expect(card(page, 1)).toHaveValue('cat')
})

test('replacing a file does not discard preview corrections without confirmation', async ({
  page,
}) => {
  await openCreator(page)
  await chooseFile(page, 'old.txt', 'cat\ndog')
  await page.getByRole('button', { name: 'Preview cards', exact: true }).click()
  await card(page, 1).fill('Edited cat')
  await page.getByLabel('Deck name').fill('My title')
  await page.getByRole('button', { name: 'Back to text' }).click()
  await chooseFile(page, 'new.json', '{"title":"New title","words":["قِطَّة"]}')
  page.once('dialog', (dialog) => dialog.dismiss())
  await page.getByRole('button', { name: 'Preview cards', exact: true }).click()
  await expect(card(page, 1)).toHaveValue('Edited cat')
  await page.getByRole('button', { name: 'Back to text' }).click()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Preview cards', exact: true }).click()
  await expect(card(page, 1)).toHaveValue('قِطَّة')
  await expect(page.getByLabel('Deck name')).toHaveValue('My title')
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Close deck creator' }).click()
  await page.getByRole('button', { name: /My decks/ }).click()
  await expect(page.locator('.bank-card.custom')).toHaveCount(0)
})

test('a file finishing after cancellation cannot overwrite a newly opened draft', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const read = File.prototype.arrayBuffer
    File.prototype.arrayBuffer = function () {
      if (this.name !== 'slow.json') return read.call(this)
      return new Promise<ArrayBuffer>((resolve) => {
        window.addEventListener(
          'finish-file-read',
          () => {
            void read.call(this).then(resolve)
          },
          { once: true },
        )
      })
    }
  })
  await openCreator(page)
  await page.getByLabel('Word bank file').setInputFiles({
    name: 'slow.json',
    mimeType: 'application/json',
    buffer: Buffer.from('["old"]'),
  })
  await expect(page.getByText('Reading file…')).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Preview cards', exact: true }),
  ).toBeDisabled()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await page.getByRole('button', { name: 'Create deck' }).click()
  await page.getByLabel('Paste your words').fill('New draft')
  await page.evaluate(() => window.dispatchEvent(new Event('finish-file-read')))
  await page.getByRole('button', { name: 'Preview cards', exact: true }).click()
  await expect(card(page, 1)).toHaveValue('New draft')
  await page.getByRole('button', { name: 'Back to text' }).click()
  await expect(page.getByLabel('Paste your words')).toHaveValue('New draft')
  await expect(page.getByLabel('Input format')).toHaveValue('text')
})

test('pasted CSV/JSON and enlarged short-landscape import controls stay usable', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 740, height: 320 })
  await openCreator(page)
  await page
    .getByLabel('Paste your words')
    .fill('id;word\n1;New York\n2;قِطَّة')
  await page.getByLabel('Input format').selectOption('csv')
  await page.getByLabel('CSV separator').selectOption(';')
  await page.getByLabel('First row is a header').check()
  await page.getByLabel('Card column').selectOption('1')
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  await page.getByLabel('Card column').scrollIntoViewIfNeeded()
  await expect(
    page.getByRole('button', { name: 'Preview cards', exact: true }),
  ).toBeInViewport({ ratio: 1 })
  await page.screenshot({ path: info.outputPath('csv-large-text.png') })
  await page.getByRole('button', { name: 'Preview cards', exact: true }).click()
  await expect(card(page, 1)).toHaveValue('New York')
  await page.getByRole('button', { name: 'Back to text' }).click()
  await page.getByLabel('Paste your words').fill('["New York", "قِطَّة"]')
  await page.getByLabel('Input format').selectOption('json')
  await page.getByRole('button', { name: 'Preview cards', exact: true }).click()
  await expect(card(page, 2)).toHaveValue('قِطَّة')
  await page.evaluate(() => {
    document.documentElement.style.fontSize = ''
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Back to text' }).click()
  await page
    .getByRole('button', { name: 'Import file' })
    .scrollIntoViewIfNeeded()
  expect(
    await page
      .locator('.deck-dialog')
      .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
  ).toBe(true)
  await page.screenshot({ path: info.outputPath('import-portrait.png') })
})
