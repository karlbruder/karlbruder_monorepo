import { expect, test } from '@playwright/test'

test('frontend proxies database health to the API', async ({ page }) => {
  const response = await page.goto('/api/health/db')
  expect(response?.ok()).toBeTruthy()
})

test('participant and staff can sign in and reach the API', async ({ page }) => {
  await page.goto('/')
  for (const [account, role] of [['participant', 'regular_user'], ['staff', 'admin']]) {
    const result = await page.evaluate(async ({ account }) => {
      const signIn = await fetch('http://localhost:54331/auth/v1/token?grant_type=password', {
        method: 'POST',
        headers: { 'content-type': 'application/json', apikey: 'sb_publishable_e2e', 'x-supabase-api-version': '2024-01-01' },
        body: JSON.stringify({ email: `${account}@example.test`, password: 'E2e-fixture-password-2026!' }),
      })
      if (!signIn.ok) return { status: signIn.status, user: null }
      const { access_token } = await signIn.json()
      const me = await fetch('/api/users/me', { headers: { authorization: `Bearer ${access_token}` } })
      return { status: me.status, user: await me.json() }
    }, { account })
    expect(result.status).toBe(200)
    expect(result.user.app_metadata.karlbruder_role).toBe(role)
  }
})
