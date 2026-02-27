import { test, expect } from '@playwright/test'

test.describe('Home Page', () => {
  test.describe.configure({ mode: 'serial' })

  test('page title is "Keysets"', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle('Keysets')
  })

  test('displays "Keysets" heading and lists songs', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toContainText('Keysets')
    const songLinks = page.locator('a[href^="/song/"]')
    await expect(songLinks.first()).toBeVisible()
  })

  test('song cards show chord labels', async ({ page }) => {
    await page.goto('/')
    // Song 4 has key sets — chord IDs should be shown
    await expect(page.getByText('CM').first()).toBeVisible()
  })

  test('song cards show key when set', async ({ page }) => {
    await page.goto('/')
    // Song 4 has songKey "C major" — should display title-cased
    await expect(page.getByText('C Major').first()).toBeVisible()
  })

  test('dark mode toggle adds dark class to html', async ({ page }) => {
    await page.goto('/')
    // Should start in light mode (no dark class)
    await expect(page.locator('html')).not.toHaveClass(/dark/)
    // Click theme toggle
    await page.getByTestId('theme-toggle').click()
    await expect(page.locator('html')).toHaveClass(/dark/)
    // Click again to go back to light
    await page.getByTestId('theme-toggle').click()
    await expect(page.locator('html')).not.toHaveClass(/dark/)
  })

  test('songs with no key sets show placeholder', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('No key sets yet').first()).toBeVisible()
  })

  test('plus button creates a new song and redirects to it', async ({ page }) => {
    await page.goto('/')
    await page.locator('button[title="Add Song"]').click()
    await expect(page).toHaveURL(/\/song\/\d+/)
    await expect(page.locator('h1')).toHaveText('Untitled Song')
    await expect(page).toHaveTitle('Untitled Song')
  })

  test('delete song with confirmation', async ({ page }) => {
    await page.goto('/')
    const songCards = page.locator('a[href^="/song/"]')
    const countBefore = await songCards.count()

    // Accept the confirmation dialog
    page.on('dialog', dialog => dialog.accept())
    await songCards.last().locator('button[title="Delete Song"]').click()

    // Song should be removed
    await expect(songCards).toHaveCount(countBefore - 1)
  })

  test('delete song — cancel keeps song', async ({ page }) => {
    await page.goto('/')
    const songCards = page.locator('a[href^="/song/"]')
    const countBefore = await songCards.count()

    // Dismiss the confirmation dialog
    page.on('dialog', dialog => dialog.dismiss())
    await songCards.first().locator('button[title="Delete Song"]').click()

    // Song count should remain the same
    await expect(songCards).toHaveCount(countBefore)
  })
})
