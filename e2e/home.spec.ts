import { test, expect } from '@playwright/test'

test.describe('Home Page', () => {
  test('page title is "Key Sets"', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle('Key Sets')
  })

  test('displays "Key Sets" heading and lists songs', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toHaveText('Key Sets')
    const viewLinks = page.getByRole('link', { name: 'View →' })
    await expect(viewLinks.first()).toBeVisible()
  })

  test('song cards show key set names', async ({ page }) => {
    await page.goto('/')
    // Song 4 has key sets with names
    await expect(page.getByText('Verse 1 - C Major')).toBeVisible()
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
})
