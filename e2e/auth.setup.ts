import { test as setup, expect } from '@playwright/test'

const AUTH_FILE = 'e2e/.auth/session.json'

setup('authenticate', async ({ page }) => {
  await page.goto('/login')
  await page.locator('input[name="password"]').fill('test-password')
  await page.locator('button[type="submit"]').click()
  await expect(page).toHaveURL('/')
  await page.context().storageState({ path: AUTH_FILE })
})
