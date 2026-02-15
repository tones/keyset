import { test, expect } from '@playwright/test'

test.describe('Song Page', () => {
  test.describe.configure({ mode: 'serial' })

  test('displays key sets with piano keyboards', async ({ page }) => {
    await page.goto('/song/4')
    // Should show key set names
    await expect(page.getByText('Verse 1 - C Major')).toBeVisible()
    await expect(page.getByText('Verse 2 - F Major')).toBeVisible()
    await expect(page.getByText('Bridge - G Major')).toBeVisible()
    // Should have piano keyboard containers (one per key set)
    const pianos = page.getByTestId('piano-keyboard')
    await expect(pianos).toHaveCount(3)
  })

  test('page title is the song name', async ({ page }) => {
    await page.goto('/song/4')
    await expect(page).toHaveTitle("Tim's Beautiful Song")
  })

  test('rename song — save with Enter', async ({ page }) => {
    await page.goto('/song/4')
    const heading = page.locator('h1')
    const originalTitle = await heading.textContent()

    // Click to edit
    await heading.click()
    const input = page.locator('input[type="text"]').first()
    await input.fill('Renamed Song')
    await input.press('Enter')

    // Title should update
    await expect(heading).toHaveText('Renamed Song')

    // Reload and verify persistence
    await page.reload()
    await expect(heading).toHaveText('Renamed Song')

    // Restore original title
    await heading.click()
    const restoreInput = page.locator('input[type="text"]').first()
    await restoreInput.fill(originalTitle!)
    await restoreInput.press('Enter')
    await expect(heading).toHaveText(originalTitle!)
  })

  test('rename song — cancel with Escape', async ({ page }) => {
    await page.goto('/song/4')
    const heading = page.locator('h1')
    const originalTitle = await heading.textContent()

    await heading.click()
    const input = page.locator('input[type="text"]').first()
    await input.fill('Should Not Save')
    await input.press('Escape')

    // Title should revert
    await expect(heading).toHaveText(originalTitle!)
  })

  test('reorder key sets via drag-and-drop persists', async ({ page }) => {
    await page.goto('/song/4')

    // Get the initial order of key set names
    const cards = page.locator('.bg-white.rounded-lg.shadow.p-6')
    const firstCardText = await cards.nth(0).locator('h2').textContent()
    const secondCardText = await cards.nth(1).locator('h2').textContent()

    // Drag first card to second position
    const firstCard = cards.nth(0).locator('button[title="Drag to reorder"]')
    const secondCard = cards.nth(1).locator('button[title="Drag to reorder"]')
    await firstCard.dragTo(secondCard)

    // After drag, the order should be swapped
    await expect(cards.nth(0).locator('h2')).toHaveText(secondCardText!)
    await expect(cards.nth(1).locator('h2')).toHaveText(firstCardText!)

    // Reload and verify persistence
    await page.reload()
    await expect(cards.nth(0).locator('h2')).toHaveText(secondCardText!)
    await expect(cards.nth(1).locator('h2')).toHaveText(firstCardText!)

    // Restore original order
    const restoreFirst = cards.nth(0).locator('button[title="Drag to reorder"]')
    const restoreSecond = cards.nth(1).locator('button[title="Drag to reorder"]')
    await restoreFirst.dragTo(restoreSecond)
  })

  test('delete key set with confirmation', async ({ page }) => {
    await page.goto('/song/4')

    // First add a key set we can safely delete
    await page.locator('button[title="Add Key Set"]').click()
    await page.waitForTimeout(500)

    const cards = page.locator('.bg-white.rounded-lg.shadow.p-6')
    const countBefore = await cards.count()

    // Click trash on the last card (the one we just added)
    page.on('dialog', dialog => dialog.accept())
    await cards.last().locator('button[title="Delete Key Set"]').click()

    // Card should be removed
    await expect(cards).toHaveCount(countBefore - 1)

    // Reload and verify persistence
    await page.reload()
    await expect(cards).toHaveCount(countBefore - 1)
  })

  test('delete key set — cancel keeps card', async ({ page }) => {
    await page.goto('/song/4')
    const cards = page.locator('.bg-white.rounded-lg.shadow.p-6')
    const countBefore = await cards.count()

    // Dismiss the confirmation dialog
    page.on('dialog', dialog => dialog.dismiss())
    await cards.first().locator('button[title="Delete Key Set"]').click()

    // Card count should remain the same
    await expect(cards).toHaveCount(countBefore)
  })

  test('add new key set', async ({ page }) => {
    await page.goto('/song/4')
    const cards = page.locator('.bg-white.rounded-lg.shadow.p-6')
    const countBefore = await cards.count()

    await page.locator('button[title="Add Key Set"]').click()
    await expect(cards).toHaveCount(countBefore + 1)

    // Clean up: delete the key set we just added
    page.on('dialog', dialog => dialog.accept())
    await cards.last().locator('button[title="Delete Key Set"]').click()
    await expect(cards).toHaveCount(countBefore)
  })

  test('toggle key on song page persists', async ({ page }) => {
    await page.goto('/song/4')
    const firstPiano = page.getByTestId('piano-keyboard').first()

    // Find a white key that is NOT highlighted (background should be white)
    const whiteKeys = firstPiano.locator('[data-note]')
    const firstKey = whiteKeys.first()
    const noteBefore = await firstKey.getAttribute('data-note')

    // Get initial color
    const colorBefore = await firstKey.evaluate((el) => getComputedStyle(el).backgroundColor)

    // Click to toggle
    await firstKey.click()

    // Color should change
    const colorAfter = await firstKey.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(colorAfter).not.toBe(colorBefore)

    // Reload and verify persistence
    await page.reload()
    const reloadedPiano = page.getByTestId('piano-keyboard').first()
    const reloadedKey = reloadedPiano.locator(`[data-note="${noteBefore}"]`)
    const colorReloaded = await reloadedKey.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(colorReloaded).toBe(colorAfter)

    // Toggle back to restore original state
    await reloadedKey.click()
  })

  test('back link navigates home', async ({ page }) => {
    await page.goto('/song/4')
    await page.getByRole('link', { name: '← Back to Key Sets' }).click()
    await expect(page).toHaveURL('/')
  })
})
