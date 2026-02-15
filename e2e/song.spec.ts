import { test, expect } from '@playwright/test'

// Helper: click Save if dirty, wait for save to complete
async function clickSave(page: import('@playwright/test').Page) {
  const saveBar = page.getByTestId('save-bar')
  if (!(await saveBar.isVisible())) return
  await page.getByTestId('save-button').click()
  await expect(saveBar).not.toBeVisible({ timeout: 10000 })
}

// Helper: save via Cmd+S keyboard shortcut (works after DnD when button clicks are blocked)
async function keyboardSave(page: import('@playwright/test').Page) {
  const saveBar = page.getByTestId('save-bar')
  if (!(await saveBar.isVisible())) return
  await page.keyboard.press('Meta+s')
  await expect(saveBar).not.toBeVisible({ timeout: 10000 })
}

test.describe('Song Page', () => {
  test.describe.configure({ mode: 'serial' })

  test('displays key sets with piano keyboards and chord labels', async ({ page }) => {
    await page.goto('/song/4')
    // Should have piano keyboard containers (one per key set)
    const pianos = page.getByTestId('piano-keyboard')
    await expect(pianos).toHaveCount(4)
    // Should show chord labels as headings (3 chords + 1 flourish)
    const chordLabels = page.getByTestId('chord-label')
    await expect(chordLabels).toHaveCount(4)
    await expect(chordLabels.nth(0)).toHaveText('CM')
    await expect(chordLabels.nth(1)).toHaveText('FM')
    await expect(chordLabels.nth(2)).toHaveText('GM')
    await expect(chordLabels.nth(3)).toHaveText('Flourish')
    // Each key set with notes should have a play button
    const playButtons = page.locator('button[title="Play Chord"]')
    await expect(playButtons).toHaveCount(4)
  })

  test('save bar appears on change and disappears after save', async ({ page }) => {
    await page.goto('/song/4')
    // No save bar initially
    await expect(page.getByTestId('save-bar')).not.toBeVisible()

    // Make a change — toggle type
    await page.getByTestId('keyset-card').first().getByTestId('type-toggle').click()

    // Save bar should appear
    await expect(page.getByTestId('save-bar')).toBeVisible()

    // Click Save
    await clickSave(page)

    // Restore: toggle back
    await page.getByTestId('keyset-card').first().getByTestId('type-toggle').click()
    await clickSave(page)
  })

  test('reset discards unsaved changes', async ({ page }) => {
    await page.goto('/song/4')
    const firstCard = page.getByTestId('keyset-card').first()
    await expect(firstCard.locator('h2')).toHaveText('CM')

    // Toggle to flourish (unsaved)
    await firstCard.getByTestId('type-toggle').click()
    await expect(firstCard.locator('h2')).toHaveText('Flourish')
    await expect(page.getByTestId('save-bar')).toBeVisible()

    // Click Reset (accept confirmation)
    page.on('dialog', dialog => dialog.accept())
    await page.getByTestId('reset-button').click()

    // Should revert to CM
    await expect(page.getByTestId('keyset-card').first().locator('h2')).toHaveText('CM')
    await expect(page.getByTestId('save-bar')).not.toBeVisible()
  })

  test('flourish toggle switches type and persists', async ({ page }) => {
    await page.goto('/song/4')
    const firstCard = page.getByTestId('keyset-card').first()

    // First card should be a chord (CM)
    await expect(firstCard.locator('h2')).toHaveText('CM')

    // Toggle to flourish and save
    await firstCard.getByTestId('type-toggle').click()
    await expect(firstCard.locator('h2')).toHaveText('Flourish')
    await clickSave(page)

    // Reload and verify persistence
    await page.reload()
    await expect(page.getByTestId('keyset-card').first().locator('h2')).toHaveText('Flourish')

    // Toggle back to chord and save to restore state
    await page.getByTestId('keyset-card').first().getByTestId('type-toggle').click()
    await expect(page.getByTestId('keyset-card').first().locator('h2')).toHaveText('CM')
    await clickSave(page)
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

    // Reload and verify persistence (title saves immediately, not deferred)
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
    const cards = page.locator('[data-testid="keyset-card"]')
    const firstCardText = await cards.nth(0).locator('h2').textContent()
    const secondCardText = await cards.nth(1).locator('h2').textContent()

    // Drag first card past second card using manual mouse steps
    const firstHandle = cards.nth(0).locator('button[title="Drag to reorder"]')
    const secondHandle = cards.nth(1).locator('button[title="Drag to reorder"]')
    const fromBox = (await firstHandle.boundingBox())!
    const toBox = (await secondHandle.boundingBox())!
    await page.mouse.move(fromBox.x + fromBox.width / 2, fromBox.y + fromBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(toBox.x + toBox.width / 2, toBox.y + toBox.height / 2, { steps: 10 })
    await page.mouse.move(toBox.x + toBox.width / 2, toBox.y + toBox.height + 20, { steps: 5 })
    await page.mouse.up()

    // After drag, the order should be swapped
    await expect(cards.nth(0).locator('h2')).toHaveText(secondCardText!)
    await expect(cards.nth(1).locator('h2')).toHaveText(firstCardText!)

    // Save via keyboard shortcut (button clicks don't fire after DnD pointer capture)
    await keyboardSave(page)

    // Reload and verify persistence
    await page.reload()
    await expect(cards.nth(0).locator('h2')).toHaveText(secondCardText!)
    await expect(cards.nth(1).locator('h2')).toHaveText(firstCardText!)

    // Restore original order
    const rFromHandle = cards.nth(0).locator('button[title="Drag to reorder"]')
    const rToHandle = cards.nth(1).locator('button[title="Drag to reorder"]')
    const rFromBox = (await rFromHandle.boundingBox())!
    const rToBox = (await rToHandle.boundingBox())!
    await page.mouse.move(rFromBox.x + rFromBox.width / 2, rFromBox.y + rFromBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(rToBox.x + rToBox.width / 2, rToBox.y + rToBox.height / 2, { steps: 10 })
    await page.mouse.move(rToBox.x + rToBox.width / 2, rToBox.y + rToBox.height + 20, { steps: 5 })
    await page.mouse.up()
    await keyboardSave(page)
  })

  test('delete key set with confirmation', async ({ page }) => {
    await page.goto('/song/4')

    // First add a key set we can safely delete
    await page.locator('button[title="Add Key Set"]').click()

    const cards = page.locator('[data-testid="keyset-card"]')
    const countBefore = await cards.count()

    // Click trash on the last card (the one we just added)
    page.on('dialog', dialog => dialog.accept())
    await cards.last().locator('button[title="Delete Key Set"]').click()

    // Card should be removed
    await expect(cards).toHaveCount(countBefore - 1)

    // Save and reload to verify persistence
    await clickSave(page)
    await page.reload()
    await expect(cards).toHaveCount(countBefore - 1)
  })

  test('delete key set — cancel keeps card', async ({ page }) => {
    await page.goto('/song/4')
    const cards = page.locator('[data-testid="keyset-card"]')
    const countBefore = await cards.count()

    // Dismiss the confirmation dialog
    page.on('dialog', dialog => dialog.dismiss())
    await cards.first().locator('button[title="Delete Key Set"]').click()

    // Card count should remain the same
    await expect(cards).toHaveCount(countBefore)
  })

  test('add new key set', async ({ page }) => {
    await page.goto('/song/4')
    const cards = page.locator('[data-testid="keyset-card"]')
    const countBefore = await cards.count()

    await page.locator('button[title="Add Key Set"]').click()
    await expect(cards).toHaveCount(countBefore + 1)

    // Clean up: delete the key set we just added (accept confirm)
    page.on('dialog', dialog => dialog.accept())
    await cards.last().locator('button[title="Delete Key Set"]').click()
    await expect(cards).toHaveCount(countBefore)
  })

  test('duplicate key set creates a copy below', async ({ page }) => {
    await page.goto('/song/4')
    const cards = page.locator('[data-testid="keyset-card"]')
    const countBefore = await cards.count()
    const firstLabel = await cards.nth(0).locator('h2').textContent()

    // Duplicate the first key set
    await cards.nth(0).locator('button[title="Duplicate Key Set"]').click()
    await expect(cards).toHaveCount(countBefore + 1)

    // The copy should appear right after the original with the same chord label
    await expect(cards.nth(1).locator('h2')).toHaveText(firstLabel!)

    // Clean up: delete the duplicate (accept confirm)
    page.on('dialog', dialog => dialog.accept())
    await cards.nth(1).locator('button[title="Delete Key Set"]').click()
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

    // Save and reload to verify persistence
    await clickSave(page)
    await page.reload()
    const reloadedPiano = page.getByTestId('piano-keyboard').first()
    const reloadedKey = reloadedPiano.locator(`[data-note="${noteBefore}"]`)
    const colorReloaded = await reloadedKey.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(colorReloaded).toBe(colorAfter)

    // Toggle back to restore original state and save
    await reloadedKey.click()
    await clickSave(page)
  })

  test('color picker selects blue and persists', async ({ page }) => {
    await page.goto('/song/4')
    const firstCard = page.getByTestId('keyset-card').first()

    // Open color popover and select blue
    await firstCard.getByTestId('color-toggle').click()
    await firstCard.locator('button[title="Blue"]').click()

    // Find an unhighlighted white key and click it
    const piano = firstCard.getByTestId('piano-keyboard')
    const testKey = piano.locator('[data-note="62"]') // D4, not in C major chord
    await testKey.click()

    // Key should be blue (rgb(59, 130, 246) = #3b82f6)
    const color = await testKey.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(color).toBe('rgb(59, 130, 246)')

    // Save and reload to verify persistence
    await clickSave(page)
    await page.reload()
    const reloadedKey = page.getByTestId('keyset-card').first().getByTestId('piano-keyboard').locator('[data-note="62"]')
    const reloadedColor = await reloadedKey.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(reloadedColor).toBe('rgb(59, 130, 246)')

    // Clean up: open popover, select blue, click to remove, save
    await page.getByTestId('keyset-card').first().getByTestId('color-toggle').click()
    await page.getByTestId('keyset-card').first().locator('button[title="Blue"]').click()
    await reloadedKey.click()
    await clickSave(page)
  })

  test('transpose popover shifts notes and persists', async ({ page }) => {
    // Use song 1 (Autumn Leaves) — not modified by prior tests
    // Key set 1 has notes [57, 60, 64, 69] (Am)
    await page.goto('/song/1')
    const firstCard = page.getByTestId('keyset-card').first()
    const piano = firstCard.getByTestId('piano-keyboard')

    // Verify initial note is present
    const noteBefore = await piano.locator('[data-note="57"]').evaluate(
      (el) => getComputedStyle(el).backgroundColor
    )
    expect(noteBefore).not.toBe('rgb(255, 255, 255)')

    // Open transpose popover and click octave up
    await firstCard.getByTestId('transpose-button').click()
    await firstCard.locator('button[title="Octave Up"]').click()

    // Original note 57 should no longer be highlighted (white key = white bg)
    await expect(piano.locator('[data-note="57"]')).toHaveCSS('background-color', 'rgb(255, 255, 255)')

    // Save and reload to verify persistence
    await clickSave(page)
    await page.reload()
    const reloadedPiano = page.getByTestId('keyset-card').first().getByTestId('piano-keyboard')
    await expect(reloadedPiano.locator('[data-note="57"]')).toHaveCSS('background-color', 'rgb(255, 255, 255)')

    // Shift back down to restore original state and save
    await page.getByTestId('keyset-card').first().getByTestId('transpose-button').click()
    await page.getByTestId('keyset-card').first().locator('button[title="Octave Down"]').click()

    // Note 57 should be highlighted again
    const noteAfter = await reloadedPiano.locator('[data-note="57"]').evaluate(
      (el) => getComputedStyle(el).backgroundColor
    )
    expect(noteAfter).not.toBe('rgb(255, 255, 255)')
    await clickSave(page)
  })

  test('Analyze Song button is visible', async ({ page }) => {
    // Song 2 has no cached analysis, so button says "Analyze with ..."
    await page.goto('/song/2')
    await expect(page.getByRole('button', { name: /Analyze with/ })).toBeVisible()
  })

  test('cached analysis displays on page load with timestamp', async ({ page }) => {
    // Song 4 (Tim's Beautiful Song) has a seeded analysis
    await page.goto('/song/4')
    await expect(page.getByText('C major triad')).toBeVisible()
    await expect(page.getByText('Analysis generated on')).toBeVisible()
    // Button should say "Re-analyze" since analysis already exists
    await expect(page.getByRole('button', { name: /Re-analyze with/ })).toBeVisible()
  })

  test('delete analysis with confirmation', async ({ page }) => {
    // Song 4 has a seeded analysis
    await page.goto('/song/4')
    await expect(page.getByText('C major triad')).toBeVisible()

    // Accept the confirmation dialog
    page.on('dialog', dialog => dialog.accept())
    await page.locator('button[title="Delete Analysis"]').click()

    // Analysis should be removed, button should revert
    await expect(page.getByText('C major triad')).not.toBeVisible()
    await expect(page.getByRole('button', { name: /Analyze with/ })).toBeVisible()

    // Reload and verify persistence
    await page.reload()
    await expect(page.getByText('C major triad')).not.toBeVisible()
    await expect(page.getByRole('button', { name: /Analyze with/ })).toBeVisible()
  })

  test('delete analysis — cancel keeps it', async ({ page }) => {
    // Song 3 (Fly Me to the Moon) has a seeded analysis
    await page.goto('/song/3')
    await expect(page.getByText('A minor 7')).toBeVisible()

    // Dismiss the confirmation dialog
    page.on('dialog', dialog => dialog.dismiss())
    await page.locator('button[title="Delete Analysis"]').click()

    // Analysis should still be visible
    await expect(page.getByText('A minor 7')).toBeVisible()
    await expect(page.getByRole('button', { name: /Re-analyze with/ })).toBeVisible()
  })

  test('YouTube link is visible when set', async ({ page }) => {
    await page.goto('/song/4')
    const link = page.getByRole('link', { name: 'YouTube' })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
  })

  test('Add YouTube link placeholder shown when no URL', async ({ page }) => {
    await page.goto('/song/2')
    await expect(page.getByText('Add YouTube link')).toBeVisible()
  })

  test('back link navigates home', async ({ page }) => {
    await page.goto('/song/4')
    await page.getByRole('link', { name: '‹ Keysets' }).click()
    await expect(page).toHaveURL('/')
  })

  test('common tone lines appear between keysets sharing notes', async ({ page }) => {
    await page.goto('/song/4')
    // Song 4 keysets: [60,64,67,72], [65,69,72,77], [67,71,74,79], [60,62,64,65,67]
    // Keysets 1↔2 share 72, keysets 3↔4 share 67
    const svgs = page.locator('svg line[stroke="#eab308"]')
    await expect(svgs).toHaveCount(2) // one line between 1↔2, one between 3↔4
  })

  test('no common tone lines between keysets with no shared notes', async ({ page }) => {
    await page.goto('/song/4')
    // Keysets 2↔3 share nothing — only 2 SVG lines total (1↔2 and 3↔4)
    const svgs = page.locator('svg line[stroke="#eab308"]')
    await expect(svgs).toHaveCount(2)
  })

  test('common tones toggle hides and shows lines', async ({ page }) => {
    await page.goto('/song/4')
    const lines = page.locator('svg line[stroke="#eab308"]')
    await expect(lines).toHaveCount(2)

    // Toggle off
    await page.getByText('Guides').click()
    await expect(lines).toHaveCount(0)

    // Toggle back on
    await page.getByText('Guides').click()
    await expect(lines).toHaveCount(2)
  })

  test('toggling common tones does not shift keyset card positions', async ({ page }) => {
    await page.goto('/song/4')
    const firstCard = page.getByTestId('keyset-card').first()
    const boxBefore = await firstCard.boundingBox()

    // Toggle off
    await page.getByText('Guides').click()
    const boxAfter = await firstCard.boundingBox()

    expect(boxBefore!.y).toBe(boxAfter!.y)
    expect(boxBefore!.height).toBe(boxAfter!.height)
  })

  test('common tone guide lines touch both upper and lower keyboards symmetrically', async ({ page }) => {
    await page.goto('/song/4')
    // Get the first two piano keyboards (keysets 1 and 2 share note 72)
    const pianos = page.getByTestId('piano-keyboard')
    const upperPiano = pianos.nth(0)
    const lowerPiano = pianos.nth(1)
    const upperBox = await upperPiano.boundingBox()
    const lowerBox = await lowerPiano.boundingBox()

    // Get the SVG that contains the yellow guide lines (has line elements with yellow stroke)
    const guideSvg = page.locator('svg:has(line[stroke="#eab308"])').first()
    const svgBox = await guideSvg.boundingBox()

    // How far the SVG overlaps into the upper keyboard (negative = overlap)
    const overlapAbove = (upperBox!.y + upperBox!.height) - svgBox!.y
    // How far the SVG overlaps into the lower keyboard (negative = overlap)
    const overlapBelow = (svgBox!.y + svgBox!.height) - lowerBox!.y

    // Both overlaps should be positive (lines extend into the keyboards)
    // and roughly symmetric — allow up to 20px difference
    expect(overlapAbove).toBeGreaterThan(0)
    expect(overlapBelow).toBeGreaterThan(0)
    expect(Math.abs(overlapAbove - overlapBelow)).toBeLessThan(20)
  })

  test('save bar appearing does not shift header position', async ({ page }) => {
    await page.goto('/song/4')
    // Get the album art position (first element of the header area)
    const headerCard = page.locator('img[alt=""]').first()
    const boxBefore = await headerCard.boundingBox()

    // Make a change to trigger the save bar
    const firstPiano = page.getByTestId('piano-keyboard').first()
    const pianoBox = await firstPiano.boundingBox()!
    await firstPiano.click({ position: { x: 10, y: pianoBox!.height * 0.8 } })

    // Verify save bar is now visible
    await expect(page.getByTestId('save-bar')).toBeVisible()

    const boxAfter = await headerCard.boundingBox()
    expect(boxBefore!.y).toBe(boxAfter!.y)
    expect(boxBefore!.height).toBe(boxAfter!.height)
  })
})
