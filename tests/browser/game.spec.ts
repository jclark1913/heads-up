import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

async function manual(page: Page, arabic = false) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Game settings', exact: true }).click()
  await page
    .getByRole('checkbox', { name: /Use buttons instead of motion/ })
    .check()
  await page.getByRole('button', { name: 'Close dialog' }).click()
  await page.locator(arabic ? '.bank-card.ar' : '.bank-card.en').click()
  await page.getByRole('button', { name: 'Start round' }).click()
  await page.clock.runFor(3100)
  await expect(page.locator('.game-stage')).toHaveClass(/playing/)
}
test.beforeEach(async ({ page }) => {
  await page.clock.install()
})

test('complete a round, preserve results, and replay cleanly', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await manual(page)
  const first = await page.locator('.prompt-text').textContent()
  await page.getByRole('button', { name: 'Correct', exact: true }).click()
  await page.clock.runFor(350)
  expect(await page.locator('.prompt-text').textContent()).not.toBe(first)
  await page.getByRole('button', { name: 'Pass', exact: true }).click()
  await page.clock.runFor(350)
  await page.clock.fastForward(61_000)
  await expect(
    page.getByRole('heading', { name: 'Nice guessing.' }),
  ).toBeVisible()
  await expect(page.locator('.outcome.correct')).toHaveCount(1)
  await expect(page.locator('.outcome.passed')).toHaveCount(1)
  await expect(page.locator('.outcome.unanswered')).toHaveCount(1)
  await page.getByRole('button', { name: 'Play again' }).click()
  await page.getByRole('button', { name: 'Start round' }).click()
  await page.clock.runFor(3100)
  await expect(page.getByRole('timer')).toHaveAttribute(
    'aria-label',
    '60 seconds remaining',
  )
  expect(errors).toEqual([])
})
test('Arabic cards retain RTL and the shared English controls', async ({
  page,
}, testInfo) => {
  await manual(page, true)
  await expect(page.locator('.prompt-text')).toHaveAttribute('lang', 'ar')
  await expect(page.locator('.prompt-text')).toHaveCSS('direction', 'rtl')
  const overflow = await page
    .locator('.prompt-text')
    .evaluate(
      (el) =>
        el.scrollHeight > el.clientHeight + 2 ||
        el.scrollWidth > el.clientWidth + 2,
    )
  expect(overflow).toBe(false)
  await page.screenshot({ path: testInfo.outputPath('arabic-game.png') })
  await page.getByRole('button', { name: 'Pause round' }).click()
  await page
    .getByRole('button', { name: 'End this round', exact: true })
    .click()
  await page.getByRole('button', { name: 'End round', exact: true }).click()
  await expect(page.locator('.outcome.unanswered')).toHaveCount(1)
})
test('motion defaults on and unavailable sensors offer explicit buttons', async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, 'DeviceOrientationEvent', {
      configurable: true,
      value: undefined,
    }),
  )
  await page.goto('/')
  await page.locator('.bank-card.en').click()
  await expect(page.getByRole('button', { name: 'Start round' })).toBeDisabled()
  await expect(
    page.getByRole('button', { name: 'Correct', exact: true }),
  ).toHaveCount(0)
  await page
    .getByRole('button', { name: 'Enable movement', exact: true })
    .click()
  await expect(
    page.getByText(/No usable movement readings arrived/),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start round' })).toBeDisabled()
  await page
    .getByRole('button', { name: 'Enable buttons', exact: true })
    .click()
  await page.getByRole('button', { name: 'Start round' }).click()
  await page.clock.runFor(3100)
  await expect(
    page.getByRole('button', { name: 'Correct', exact: true }),
  ).toBeVisible()
  await page.reload()
  await page.locator('.bank-card.en').click()
  await expect(page.getByText('BUTTONS ARE ON')).toBeVisible()
})
test('home fits the viewport and install assets are available', async ({
  page,
}, testInfo) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: /Good company/ }),
  ).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  await page.screenshot({
    path: testInfo.outputPath('home.png'),
    fullPage: true,
  })
  const manifest = await page.request.get('/manifest.webmanifest')
  expect(manifest.ok()).toBe(true)
  for (const icon of (await manifest.json()).icons as { src: string }[])
    expect((await page.request.get('/' + icon.src)).ok()).toBe(true)
  expect((await page.request.get('/package.json')).status()).toBe(404)
  expect((await page.request.get('/specs/01-product.md')).status()).toBe(404)
})
async function feed(page: Page, beta: number, gamma: number, ms: number) {
  await page.evaluate(
    ({ beta, gamma }) => {
      const trialWindow = window as Window & { trialTimer?: number }
      clearInterval(trialWindow.trialTimer)
      trialWindow.trialTimer = window.setInterval(() => {
        const sample = new Event('deviceorientation')
        Object.defineProperties(sample, {
          beta: { value: beta },
          gamma: { value: gamma },
          timeStamp: { value: performance.now() },
        })
        window.dispatchEvent(sample)
      }, 20)
    },
    { beta, gamma },
  )
  await page.clock.runFor(ms)
}
test('motion path scores held tilts once and waits for neutral', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 844, height: 390 })
  await page.addInitScript(() => {
    Object.defineProperty(window, 'DeviceOrientationEvent', {
      configurable: true,
      value: { requestPermission: () => Promise.resolve('granted') },
    })
    Object.defineProperty(screen, 'orientation', {
      configurable: true,
      value: { angle: 90 },
    })
  })
  await page.goto('/')
  await page.locator('.bank-card.en').click()
  await page
    .getByRole('button', { name: 'Enable movement', exact: true })
    .click()
  await feed(page, 0, 90, 700)
  await expect(
    page.getByRole('button', { name: 'Start round' }),
  ).toBeInViewport({ ratio: 1 })
  await page.screenshot({
    path: testInfo.outputPath('landscape-practice-ready.png'),
  })
  await page.getByRole('button', { name: 'Start round' }).click()
  await page.clock.runFor(3100)
  const first = await page.locator('.prompt-text').textContent()
  await page.screenshot({ path: testInfo.outputPath('landscape-motion.png') })
  await feed(page, 180, 20, 500)
  await expect(page.getByRole('heading', { name: 'Got it!' })).toBeVisible()
  await page.evaluate(() =>
    Object.defineProperty(screen.orientation, 'angle', {
      value: 0,
      configurable: true,
    }),
  )
  await page.setViewportSize({ width: 390, height: 844 })
  await page.clock.runFor(2500)
  await expect(page.locator('.game-stage')).toHaveCSS('width', '844px')
  await expect(page.locator('.game-stage')).toHaveCSS('height', '390px')
  await expect(page.locator('.prompt-text')).toHaveCount(0)
  await page.evaluate(() =>
    Object.defineProperty(screen.orientation, 'angle', {
      value: 90,
      configurable: true,
    }),
  )
  await page.setViewportSize({ width: 844, height: 390 })
  await feed(page, 0, 20, 700)
  await expect(page.getByRole('heading', { name: 'Got it!' })).toBeVisible()
  await feed(page, 0, 90, 700)
  expect(await page.locator('.prompt-text').textContent()).not.toBe(first)
  await feed(page, 0, 20, 500)
  await expect(page.getByRole('heading', { name: 'Next one!' })).toBeVisible()
  await page.getByRole('button', { name: 'Pause round' }).click()
  await page
    .getByRole('button', { name: 'Enable buttons', exact: true })
    .click()
  await page.getByRole('button', { name: 'Resume with countdown' }).click()
  await page.clock.runFor(3100)
  await expect(
    page.getByRole('button', { name: 'Correct', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Pause round' }).click()
  await page
    .getByRole('button', { name: 'End this round', exact: true })
    .click()
  await page.getByRole('button', { name: 'End round', exact: true }).click()
  await expect(page.locator('.outcome.correct')).toHaveCount(1)
  await expect(page.locator('.outcome.passed')).toHaveCount(1)
})

for (const viewport of [
  { width: 844, height: 390 },
  { width: 740, height: 320 },
]) {
  test(`landscape library and setup fit ${viewport.width}x${viewport.height}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport)
    await page.addInitScript(() =>
      Object.defineProperty(window, 'DeviceOrientationEvent', {
        configurable: true,
        value: undefined,
      }),
    )
    const screenFits = async () => {
      expect(
        await page.evaluate(() => ({
          vertical: document.documentElement.scrollHeight <= innerHeight + 1,
          horizontal: document.documentElement.scrollWidth <= innerWidth + 1,
        })),
      ).toEqual({ vertical: true, horizontal: true })
    }
    await page.goto('/')
    await expect(page.locator('.bank-card.en')).toBeInViewport({ ratio: 1 })
    await expect(page.locator('.bank-card.ar')).toBeInViewport({ ratio: 1 })
    await screenFits()
    await page.screenshot({
      path: testInfo.outputPath('landscape-library.png'),
    })

    await page.getByRole('button', { name: 'How to play', exact: true }).click()
    await expect(
      page.getByRole('dialog', { name: 'How to play' }),
    ).toBeVisible()
    await page
      .getByText('Device testing & diagnostics', { exact: true })
      .click()
    await expect(
      page.getByRole('checkbox', { name: /Record a local sensor trace/ }),
    ).toBeVisible()
    await screenFits()
    await page.getByRole('button', { name: 'Close dialog' }).click()
    await expect(
      page.getByRole('button', { name: 'How to play', exact: true }),
    ).toBeFocused()

    await page.locator('.bank-card.en').click()
    await expect(
      page.getByRole('button', { name: 'Start round' }),
    ).toBeInViewport({ ratio: 1 })
    await expect(
      page.getByRole('button', { name: 'Enable movement', exact: true }),
    ).toBeInViewport({ ratio: 1 })
    await screenFits()
    await page.screenshot({ path: testInfo.outputPath('landscape-setup.png') })
    await page
      .getByRole('button', { name: 'Enable movement', exact: true })
      .click()
    await expect(
      page.getByRole('button', { name: 'Start round' }),
    ).toBeDisabled()
    await page
      .getByRole('button', { name: 'Enable buttons', exact: true })
      .click()
    await expect(
      page.getByRole('button', { name: 'Start round' }),
    ).toBeEnabled()

    await page
      .getByRole('button', { name: 'Game settings', exact: true })
      .click()
    await expect(
      page.getByRole('dialog', { name: 'Game settings' }),
    ).toBeVisible()
    await expect(
      page.getByRole('checkbox', { name: /Use buttons instead of motion/ }),
    ).toBeChecked()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Game settings', exact: true }),
    ).toBeFocused()

    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%'
    })
    await expect(
      page.getByRole('button', { name: 'Start round' }),
    ).toBeInViewport({ ratio: 1 })
    await screenFits()
    await page.screenshot({
      path: testInfo.outputPath('landscape-large-text.png'),
    })
    await page.evaluate(() => {
      document.documentElement.style.fontSize = ''
    })
    await page.getByRole('button', { name: /All decks/ }).click()
    await page.locator('.bank-card.ar').click()
    await expect(page.locator('.setup-heading h1')).toHaveCSS(
      'direction',
      'rtl',
    )
    await expect(
      page.getByRole('button', { name: 'Start round' }),
    ).toBeInViewport({ ratio: 1 })
    await screenFits()
    await page.screenshot({
      path: testInfo.outputPath('landscape-arabic-setup.png'),
    })

    await page.getByRole('button', { name: /All decks/ }).click()
    await page.setViewportSize({
      width: viewport.height,
      height: viewport.width,
    })
    await expect(
      page.getByRole('heading', { name: /Good company/ }),
    ).toBeVisible()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true)
  })
}

test('narrow portrait header fits with wider fallback fonts', async ({
  page,
}, testInfo) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: /Good company/ }),
  ).toBeVisible()
  for (const font of ['Arial, sans-serif', 'Verdana, sans-serif']) {
    await page.evaluate((value) => {
      document.documentElement.style.fontFamily = value
    }, font)
    for (const width of [280, 320]) {
      await page.setViewportSize({ width, height: 740 })
      const bounds = await page
        .locator('.home-shell > .site-header')
        .evaluate((header) => {
          const box = header.getBoundingClientRect()
          return {
            viewport: innerWidth,
            page: document.documentElement.scrollWidth,
            right: box.right,
            controls: [
              ...header.querySelectorAll('.screen-tools > button'),
            ].map((button) => {
              const rect = button.getBoundingClientRect()
              return {
                left: rect.left,
                right: rect.right,
                width: rect.width,
                height: rect.height,
              }
            }),
          }
        })
      expect(bounds.page, font + ' at ' + width).toBeLessThanOrEqual(
        bounds.viewport + 1,
      )
      for (const control of bounds.controls) {
        expect(control.left).toBeGreaterThanOrEqual(0)
        expect(control.right).toBeLessThanOrEqual(bounds.right + 1)
        expect(control.width).toBeGreaterThanOrEqual(44)
        expect(control.height).toBeGreaterThanOrEqual(44)
      }
    }
  }
  await page.screenshot({
    path: testInfo.outputPath('narrow-portrait-header.png'),
  })
  await page.getByRole('button', { name: 'Game settings', exact: true }).click()
  await expect(
    page.getByRole('dialog', { name: 'Game settings' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Close dialog' }).click()
})
