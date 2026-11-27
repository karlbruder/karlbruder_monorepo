import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testIgnore: '**/seed.spec.ts',
  retries: 0,
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: { baseURL: 'http://localhost:5174', trace: 'retain-on-failure', ...devices['Desktop Chrome'] },
})
