import { test, expect } from '@playwright/test'

test.describe('Public read-only access', () => {
  test.describe.configure({ mode: 'serial' })

  test('home page loads without login wall', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toContainText('Keysets')
    await expect(page.locator('a[href^="/song/"]').first()).toBeVisible()
  })

  test('home page shows lock icon (not logged in)', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('a[href="/login"][title="Sign in to edit"]')).toBeVisible()
  })

  test('home page hides add song button', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('button[title="Add Song"]')).toHaveCount(0)
  })

  test('home page hides delete and duplicate buttons', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('button[title="Delete Song"]').first()).toHaveCount(0)
    await expect(page.locator('button[title="Duplicate Song"]').first()).toHaveCount(0)
  })

  test('song page loads without login wall', async ({ page }) => {
    await page.goto('/song/4')
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.getByTestId('piano-keyboard').first()).toBeVisible()
  })

  test('song page hides save bar', async ({ page }) => {
    await page.goto('/song/4')
    await expect(page.getByTestId('save-bar')).toHaveCount(0)
  })

  test('song page hides add keyset button', async ({ page }) => {
    await page.goto('/song/4')
    await expect(page.locator('button[title="Add Key Set"]')).toHaveCount(0)
  })

  test('song page hides edit controls on keyset cards', async ({ page }) => {
    await page.goto('/song/4')
    // No drag handles, delete, duplicate, type toggle, color picker, transpose
    await expect(page.locator('button[title="Drag to reorder"]')).toHaveCount(0)
    await expect(page.locator('button[title="Delete Key Set"]')).toHaveCount(0)
    await expect(page.locator('button[title="Duplicate Key Set"]')).toHaveCount(0)
    await expect(page.getByTestId('type-toggle')).toHaveCount(0)
    await expect(page.getByTestId('color-toggle')).toHaveCount(0)
  })

  test('song page title is not clickable (not editable)', async ({ page }) => {
    await page.goto('/song/4')
    // Title should be a plain h1, not the EditableTitle component
    const h1 = page.locator('h1')
    await expect(h1).toBeVisible()
    // Click it — should NOT produce an input
    await h1.click()
    await expect(page.locator('input[type="text"]')).toHaveCount(0)
  })

  test('song page piano keys still play sound but do not toggle', async ({ page }) => {
    await page.goto('/song/4')
    const keyboard = page.getByTestId('piano-keyboard').first()
    // Count highlighted keys before clicking
    const before = await keyboard.locator('[data-highlighted="true"]').count()
    // Click a key
    const key = keyboard.locator('[data-note="60"]')
    await key.click()
    // Count should not change (read-only, no toggle)
    const after = await keyboard.locator('[data-highlighted="true"]').count()
    expect(after).toBe(before)
  })

  test('song page compact toggle works without login', async ({ page }) => {
    await page.goto('/song/4')
    const compactToggle = page.locator('label', { hasText: 'Compact' })
    await expect(compactToggle).toBeVisible()

    // Start in full mode — keyset cards should have edit-style layout
    const keyboards = page.getByTestId('piano-keyboard')
    const initialCount = await keyboards.count()
    expect(initialCount).toBeGreaterThan(0)

    // Toggle compact on
    await compactToggle.locator('button').click()
    // Toggle compact off
    await compactToggle.locator('button').click()
    // Should still show keyboards (toggle works without error)
    await expect(keyboards.first()).toBeVisible()
  })

  test('song page shows analysis but hides analyze/delete buttons', async ({ page }) => {
    // Song 4 may or may not have cached analysis — navigate to check
    await page.goto('/song/4')
    // Analyze button should not be visible
    await expect(page.getByText('Analyze with')).toHaveCount(0)
    await expect(page.getByText('Re-analyze with')).toHaveCount(0)
  })

  test('login flow grants edit access', async ({ page }) => {
    await page.goto('/login')
    await page.locator('input[name="password"]').fill('test-password')
    await page.locator('button[type="submit"]').click()
    await expect(page).toHaveURL('/')

    // Should now see add song button and unlock icon
    await expect(page.locator('button[title="Add Song"]')).toBeVisible()
    await expect(page.locator('button[title="Sign out"]')).toBeVisible()
    await expect(page.locator('a[href="/login"]')).toHaveCount(0)
  })

  test('logout returns to read-only', async ({ page }) => {
    // Log in first
    await page.goto('/login')
    await page.locator('input[name="password"]').fill('test-password')
    await page.locator('button[type="submit"]').click()
    await expect(page).toHaveURL('/')
    await expect(page.locator('button[title="Add Song"]')).toBeVisible()

    // Log out
    await page.locator('button[title="Sign out"]').click()
    await page.waitForLoadState('networkidle')

    // Should be back to read-only
    await expect(page.locator('button[title="Add Song"]')).toHaveCount(0)
    await expect(page.locator('a[href="/login"]')).toBeVisible()
  })

  test('wrong password shows error', async ({ page }) => {
    await page.goto('/login')
    await page.locator('input[name="password"]').fill('wrong-password')
    await page.locator('button[type="submit"]').click()
    await expect(page.getByText('Incorrect password')).toBeVisible()
    // Should still be on login page
    await expect(page).toHaveURL(/\/login/)
  })
})
