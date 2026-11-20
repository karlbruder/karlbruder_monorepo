import { test } from '@playwright/test'

test('agent exploration starts at the application', async ({ page }) => {
  await page.goto('/')
})
