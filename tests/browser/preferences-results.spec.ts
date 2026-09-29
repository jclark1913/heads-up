import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

async function settings(page: Page) {
  await page.getByRole('button', { name: 'Game settings', exact: true }).click()
}
async function manual(page: Page, seconds = 60) {
  await settings(page)
  await page
    .getByRole('combobox', { name: /Round length/ })
    .selectOption(String(seconds))
  await page
    .getByRole('checkbox', { name: /Use buttons instead of motion/ })
    .check()
  await page.getByRole('checkbox', { name: /Sound cues/ }).uncheck()
  await page.getByRole('button', { name: 'Close dialog' }).click()
}
async function end(page: Page) {
  await page.getByRole('button', { name: 'Pause round' }).click()
  await page
    .getByRole('button', { name: 'End this round', exact: true })
    .click()
  await page.getByRole('button', { name: 'End round', exact: true }).click()
}
async function start(page: Page) {
  await page.locator('.bank-card.en').click()
  await page.getByRole('button', { name: 'Start round' }).click()
  await page.clock.runFor(3100)
}
test.beforeEach(async ({ page }) => {
  await page.clock.install()
})

for (const seconds of [30, 90]) {
  test(
    seconds +
      '-second setting survives reload and the actual timer expires at that duration',
    async ({ page }) => {
      await page.goto('/')
      await manual(page, seconds)
      await page.reload()
      await settings(page)
      await expect(
        page.getByRole('combobox', { name: /Round length/ }),
      ).toHaveValue(String(seconds))
      await expect(
        page.getByRole('checkbox', { name: /Sound cues/ }),
      ).not.toBeChecked()
      await expect(
        page.getByRole('checkbox', { name: /Use buttons instead of motion/ }),
      ).toBeChecked()
      await page.getByRole('button', { name: 'Close dialog' }).click()
      await page.locator('.bank-card.en').click()
      await expect(page.locator('.setup-heading')).toContainText(
        seconds + ' seconds',
      )
      await page.getByRole('button', { name: 'Start round' }).click()
      await expect(page.locator('.game-bottom')).toContainText(
        seconds + ' seconds of good guesses',
      )
      await page.clock.runFor(3100)
      await expect(page.getByRole('timer')).toHaveAttribute(
        'aria-label',
        seconds + ' seconds remaining',
      )
      await expect(page.locator('.game-stage')).toHaveClass(/playing/)
      await page.clock.fastForward(seconds * 1000)
      await expect(page.locator('.results-shell')).toBeVisible()
      await expect(page.getByText('TIME’S UP', { exact: true })).toBeVisible()
      await expect(
        page.getByText(
          seconds + '-second round · ' + seconds + ' seconds played',
          { exact: true },
        ),
      ).toBeVisible()
      await expect(page.locator('.outcome.unanswered')).toHaveCount(1)
      await page.reload()
      await expect(page.locator('.home-shell')).toBeVisible()
      await page.getByRole('button', { name: 'View latest result' }).click()
      await expect(page.getByText('TIME’S UP', { exact: true })).toBeVisible()
      await expect(page.getByRole('button', { name: /Resume/ })).toHaveCount(0)
    },
  )
}

test('legacy controls migrate once and an explicit new preference wins', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem('heads-up.controls.v1', 'manual'),
  )
  await page.goto('/')
  await settings(page)
  await expect(
    page.getByRole('combobox', { name: /Round length/ }),
  ).toHaveValue('60')
  await expect(
    page.getByRole('checkbox', { name: /Use buttons instead of motion/ }),
  ).toBeChecked()
  await page
    .getByRole('checkbox', { name: /Use buttons instead of motion/ })
    .uncheck()
  await page.getByRole('button', { name: 'Close dialog' }).click()
  await page.reload()
  await settings(page)
  await expect(
    page.getByRole('checkbox', { name: /Use buttons instead of motion/ }),
  ).not.toBeChecked()
})

test('paused time and resume countdown are excluded and duration is locked during a round', async ({
  page,
}) => {
  await page.goto('/')
  await manual(page, 30)
  await start(page)
  await page.clock.runFor(2000)
  await page.getByRole('button', { name: 'Pause round' }).click()
  await page.getByText('Sound & controls', { exact: true }).click()
  await expect(
    page.getByRole('combobox', { name: /Round length/ }),
  ).toBeDisabled()
  const paused = await page.locator('.paused-time').textContent()
  await expect(page.locator('.paused-time')).toContainText('28 seconds left')
  await page.clock.runFor(60_000)
  await expect(page.locator('.paused-time')).toHaveText(paused!)
  await page.getByRole('button', { name: 'Resume with countdown' }).click()
  await page.clock.runFor(4000)
  await end(page)
  await expect(
    page.getByText('ROUND ENDED EARLY', { exact: true }),
  ).toBeVisible()
  await expect(page.locator('.result-details').first()).toContainText(
    '30-second round',
  )
  await expect(page.locator('.result-details').first()).toContainText(
    'Incomplete',
  )
  const result = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('heads-up.latest-result.v1')!),
  )
  expect(result.elapsedActiveMs).toBeGreaterThanOrEqual(2800)
  expect(result.elapsedActiveMs).toBeLessThan(5000)
  expect(
    Date.parse(result.finishedAt) -
      Date.parse(result.startedAt) -
      result.elapsedActiveMs,
  ).toBeGreaterThanOrEqual(63_000)
})

test('the latest Arabic recap survives editing and deleting its source deck', async ({
  page,
}) => {
  await page.goto('/')
  await manual(page, 30)
  await page.getByRole('button', { name: 'Create deck' }).click()
  await page.getByLabel('Paste your words').fill('قِطَّة\nNew York')
  await page.getByRole('button', { name: 'Preview cards', exact: true }).click()
  await page.getByLabel('Deck name').fill('Original lesson')
  await page.getByRole('button', { name: 'Save deck & play' }).click()
  await page.getByRole('button', { name: 'Start round' }).click()
  await page.clock.runFor(3100)
  const words: string[] = []
  for (const answer of ['Correct', 'Pass']) {
    words.push((await page.locator('.game-center .prompt-text').textContent())!)
    await page.getByRole('button', { name: answer, exact: true }).click()
    await page.clock.runFor(350)
  }
  await expect(
    page.getByText('ALL CARDS PLAYED', { exact: true }),
  ).toBeVisible()
  const original = await page.evaluate(() =>
    localStorage.getItem('heads-up.latest-result.v1'),
  )
  await page.getByRole('button', { name: 'Change deck' }).click()
  await page.getByRole('button', { name: 'Manage Original lesson' }).click()
  await page.getByLabel('Deck name').fill('Revised lesson')
  await page
    .getByRole('textbox', { name: 'Card 1', exact: true })
    .fill('Replacement')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await page.getByRole('button', { name: 'View latest result' }).click()
  await expect(page.locator('.results-list .section-heading')).toContainText(
    'Original lesson',
  )
  await expect(page.locator('.results-list li > span:first-child')).toHaveText(
    words,
  )
  await expect(
    page.getByText('This deck has changed. Play again uses its current cards.'),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Play again' }).click()
  await expect(page.locator('.setup-heading h1')).toHaveText('Revised lesson')
  await page.getByRole('button', { name: /All decks/ }).click()
  await page.getByRole('button', { name: 'Manage Revised lesson' }).click()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Delete deck', exact: true }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(page.locator('.bank-card.custom')).toHaveCount(0)
  await page.reload()
  await page.getByRole('button', { name: 'View latest result' }).click()
  await expect(
    page.getByText('The source deck is unavailable. Your round is still here.'),
  ).toBeVisible()
  await expect(page.locator('.results-list li > span:first-child')).toHaveText(
    words,
  )
  await expect(
    page
      .locator('.results-list li > span:first-child')
      .filter({ hasText: 'قِطَّة' }),
  ).toHaveCSS('direction', 'rtl')
  await expect(page.getByRole('button', { name: 'Play again' })).toHaveCount(0)
  expect(
    await page.evaluate(() =>
      localStorage.getItem('heads-up.latest-result.v1'),
    ),
  ).toBe(original)
  await page.getByRole('button', { name: 'Back to decks' }).click()
  await expect(page.locator('.home-shell')).toBeVisible()
})

test('a live round cannot replace the previous saved result on reload', async ({
  page,
}) => {
  await page.goto('/')
  await manual(page)
  await start(page)
  await end(page)
  const original = await page.evaluate(() =>
    localStorage.getItem('heads-up.latest-result.v1'),
  )
  await page.getByRole('button', { name: 'Play again' }).click()
  await page.getByRole('button', { name: 'Start round' }).click()
  await page.clock.runFor(3500)
  await page.getByRole('button', { name: 'Correct', exact: true }).click()
  await page.reload()
  await expect(page.locator('.home-shell')).toBeVisible()
  expect(
    await page.evaluate(() =>
      localStorage.getItem('heads-up.latest-result.v1'),
    ),
  ).toBe(original)
  await page.getByRole('button', { name: 'View latest result' }).click()
  await expect(page.locator('.outcome.correct')).toHaveCount(0)
})

test('corrupt preferences and results recover safely without clearing storage', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem('heads-up.preferences.v1', '{"schemaVersion":99}')
    localStorage.setItem('heads-up.latest-result.v1', 'null')
  })
  await page.goto('/')
  await expect(page.getByRole('status')).toContainText(
    'saved result could not be read',
  )
  await expect(
    page.getByRole('button', { name: 'View latest result' }),
  ).toHaveCount(0)
  await settings(page)
  await expect(
    page.getByRole('combobox', { name: /Round length/ }),
  ).toHaveValue('60')
  await expect(
    page.getByRole('checkbox', { name: /Use buttons instead of motion/ }),
  ).not.toBeChecked()
  await expect(page.getByRole('checkbox', { name: /Sound cues/ })).toBeChecked()
  await expect(page.getByRole('dialog').getByRole('status')).toContainText(
    'Using the defaults',
  )
  expect(
    await page.evaluate(() =>
      localStorage.getItem('heads-up.latest-result.v1'),
    ),
  ).toBe('null')
})

test('storage failures retain session settings and results with an honest notice', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Quota', 'QuotaExceededError')
    }
  })
  await page.goto('/')
  await manual(page, 30)
  await start(page)
  await end(page)
  await expect(page.getByRole('status')).toContainText(
    'could not be saved on this device',
  )
  await expect(page.locator('.result-details').first()).toContainText(
    '30-second round',
  )
  await page.getByRole('button', { name: 'Change deck' }).click()
  await page.getByRole('button', { name: 'View latest result' }).click()
  await expect(page.locator('.results-shell')).toBeVisible()
  await page.reload()
  await expect(
    page.getByRole('button', { name: 'View latest result' }),
  ).toHaveCount(0)
})

test('settings and the latest-result entry remain usable on short landscape and large text', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 740, height: 320 })
  await page.goto('/')
  await manual(page, 90)
  await start(page)
  await end(page)
  await page.getByRole('button', { name: 'Change deck' }).click()
  await expect(
    page.getByRole('button', { name: 'View latest result' }),
  ).toBeInViewport({ ratio: 1 })
  await page.screenshot({ path: info.outputPath('home-latest-result.png') })
  await settings(page)
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  const duration = page.getByRole('combobox', { name: /Round length/ })
  await duration.selectOption('30')
  await expect(duration).toHaveValue('30')
  await expect(duration).toBeInViewport({ ratio: 1 })
  await page.screenshot({
    path: info.outputPath('settings-large-landscape.png'),
  })
  await page.getByRole('button', { name: 'Close dialog' }).click()
  await page.evaluate(() => {
    document.documentElement.style.fontSize = ''
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'View latest result' }).click()
  await expect(page.locator('.result-details').first()).toContainText(
    '90-second round',
  )
  await page.screenshot({
    path: info.outputPath('saved-result-portrait.png'),
    fullPage: true,
  })
})
