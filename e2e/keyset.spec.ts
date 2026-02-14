import { test, expect, type Locator } from '@playwright/test'

// Helper to count keys by their computed background color
async function countKeysByColor(piano: Locator, color: string) {
  const allKeys = piano.locator('div[title]')
  const count = await allKeys.count()
  let matched = 0
  for (let i = 0; i < count; i++) {
    const bg = await allKeys.nth(i).evaluate((el: HTMLElement) => getComputedStyle(el).backgroundColor)
    if (bg === color) matched++
  }
  return matched
}

async function getFirstKeyByColor(piano: Locator, color: string) {
  const allKeys = piano.locator('div[title]')
  const count = await allKeys.count()
  for (let i = 0; i < count; i++) {
    const bg = await allKeys.nth(i).evaluate((el: HTMLElement) => getComputedStyle(el).backgroundColor)
    if (bg === color) return allKeys.nth(i)
  }
  return null
}

const RED = 'rgb(239, 68, 68)'
const WHITE = 'rgb(255, 255, 255)'

test.describe('Keyset Page', () => {
  test.describe.configure({ mode: 'serial' })

  test('displays piano keyboard with highlighted notes', async ({ page }) => {
    await page.goto('/keyset/7')
    const piano = page.getByTestId('piano-keyboard')
    await expect(piano).toBeVisible()
    const redCount = await countKeysByColor(piano, RED)
    expect(redCount).toBeGreaterThan(0)
  })

  test('page title is the keyset name', async ({ page }) => {
    await page.goto('/keyset/7')
    await expect(page).toHaveTitle('Verse 1 - C Major')
  })

  test('rename keyset', async ({ page }) => {
    await page.goto('/keyset/7')
    const heading = page.locator('h1')
    const originalName = await heading.textContent()

    await heading.click()
    const input = page.locator('input[type="text"]').first()
    await input.fill('Renamed Key Set')
    await input.press('Enter')

    await expect(heading).toHaveText('Renamed Key Set')

    // Reload and verify persistence
    await page.reload()
    await expect(heading).toHaveText('Renamed Key Set')

    // Restore original name
    await heading.click()
    const restoreInput = page.locator('input[type="text"]').first()
    await restoreInput.fill(originalName!)
    await restoreInput.press('Enter')
    await expect(heading).toHaveText(originalName!)
  })

  test('toggle key on — clicking unhighlighted key highlights it', async ({ page }) => {
    await page.goto('/keyset/7')
    const piano = page.getByTestId('piano-keyboard')

    const key = await getFirstKeyByColor(piano, WHITE)
    expect(key).not.toBeNull()
    await key!.click()

    // After clicking, it should be highlighted (red)
    await expect(key!).toHaveCSS('background-color', RED)
  })

  test('toggle key off — clicking highlighted key removes highlight', async ({ page }) => {
    await page.goto('/keyset/7')
    const piano = page.getByTestId('piano-keyboard')

    const key = await getFirstKeyByColor(piano, RED)
    expect(key).not.toBeNull()
    await key!.click()

    // After clicking, it should no longer be red
    await expect(key!).toHaveCSS('background-color', WHITE)
  })

  test('save persists key changes', async ({ page }) => {
    await page.goto('/keyset/7')
    const piano = page.getByTestId('piano-keyboard')

    const highlightedBefore = await countKeysByColor(piano, RED)

    // Toggle an unhighlighted key on
    const key = await getFirstKeyByColor(piano, WHITE)
    await key!.click()

    // Click Save
    await page.getByRole('button', { name: 'Save' }).click()
    await page.waitForTimeout(500)

    // Reload and verify the new key count
    await page.reload()
    const highlightedAfter = await countKeysByColor(page.getByTestId('piano-keyboard'), RED)
    expect(highlightedAfter).toBe(highlightedBefore + 1)

    // Clean up: toggle one off and save to restore original count
    const keyToRemove = await getFirstKeyByColor(page.getByTestId('piano-keyboard'), RED)
    await keyToRemove!.click()
    await page.getByRole('button', { name: 'Save' }).click()
    await page.waitForTimeout(500)
  })

  test('unsaved changes indicator appears', async ({ page }) => {
    await page.goto('/keyset/7')
    const piano = page.getByTestId('piano-keyboard')

    // No unsaved indicator initially
    await expect(page.getByText('Unsaved changes')).not.toBeVisible()

    // Save button should be disabled
    const saveButton = page.getByRole('button', { name: 'Save' })
    await expect(saveButton).toBeDisabled()

    // Toggle a key
    const key = await getFirstKeyByColor(piano, WHITE)
    await key!.click()

    // Unsaved indicator should appear and Save should be enabled
    await expect(page.getByText('Unsaved changes')).toBeVisible()
    await expect(saveButton).toBeEnabled()
  })

  test('navigating away loses unsaved changes', async ({ page }) => {
    await page.goto('/keyset/7')
    const piano = page.getByTestId('piano-keyboard')

    const highlightedBefore = await countKeysByColor(piano, RED)

    // Toggle a key without saving
    const key = await getFirstKeyByColor(piano, WHITE)
    await key!.click()

    // Navigate away
    await page.getByRole('link', { name: /← Back to/ }).click()
    await expect(page).toHaveURL(/\/song\//)

    // Navigate back
    await page.goBack()

    // Highlighted count should be the same as before (change was lost)
    const highlightedAfter = await countKeysByColor(page.getByTestId('piano-keyboard'), RED)
    expect(highlightedAfter).toBe(highlightedBefore)
  })

  test('back link navigates to song page', async ({ page }) => {
    await page.goto('/keyset/7')
    await page.getByRole('link', { name: /← Back to/ }).click()
    await expect(page).toHaveURL(/\/song\/\d+/)
  })
})
