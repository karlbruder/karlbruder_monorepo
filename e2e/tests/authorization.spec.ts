import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { fixtureData, fixturePassword } from '../fixture-data'

// Authorization tokens and presigned URLs stay out of failure traces.
test.use({ trace: 'off' })

const api = 'http://localhost:5174/api'
const sentinel = 'E2E-PRIVATE-SAFETY-SENTINEL'

async function token(request: APIRequestContext, account: string): Promise<string> {
  const response = await request.post('http://localhost:54331/auth/v1/token?grant_type=password', {
    headers: { apikey: 'sb_publishable_e2e' },
    data: { email: `authorization-${account}@example.test`, password: fixturePassword },
  })
  expect(response.status()).toBe(200)
  return (await response.json()).access_token
}

async function signIn(page: Page, account: string) {
  await page.goto('/account/sign-in')
  await signInCurrentPage(page, account)
}

async function signInCurrentPage(page: Page, account: string) {
  await page.getByLabel('E-mail', { exact: true }).fill(`authorization-${account}@example.test`)
  await page.getByLabel('Senha', { exact: true }).fill(fixturePassword)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Minhas inscrições' })).toBeVisible()
}

test('Real roles enforce staff, private-record, and catalog access through the proxy', async ({ request }) => {
  const data = fixtureData().authorization
  const tokens = Object.fromEntries(await Promise.all(['owner', 'other', 'member', 'admin'].map(async name => [name, await token(request, name)])))
  const headers = (name: string) => ({ Authorization: `Bearer ${tokens[name]}` })
  const ownerPath = `${api}/tournaments/${data.owner_tournament_id}/registrations/${data.owner_registration_number}`
  const otherPath = `${api}/tournaments/${data.other_tournament_id}/registrations/${data.other_registration_number}`
  const staffPath = `${api}/staff/tournaments/payment-reviews/${data.owner_registration_number}`
  const get = (path: string, name: string) => request.get(path, { headers: headers(name) })
  const ownerResponse = await get(ownerPath, 'owner')
  expect(ownerResponse.status()).toBe(200)
  const owner = await ownerResponse.json()
  expect(owner).not.toHaveProperty('staff_safety_note')
  expect(JSON.stringify(owner)).not.toContain(sentinel)
  expect((await get(`${ownerPath}/payment`, 'owner')).status()).toBe(200)
  const ownerDownload = await get(`${ownerPath}/payment-proof`, 'owner')
  expect(ownerDownload.status()).toBe(200)
  expect((await request.get((await ownerDownload.json()).download_url)).status()).toBe(200)
  const staffResponse = await get(staffPath, 'admin')
  expect(staffResponse.status()).toBe(200)
  const before = await staffResponse.json()
  expect(before.registration.staff_safety_note).toBe(sentinel)
  expect(before.latest_document_id).toBe(data.document_id)
  expect(before.documents.some((doc: { id: number }) => doc.id === data.document_id)).toBeTruthy()
  const staffDownload = await get(`${staffPath}/documents/${data.document_id}/download-url`, 'admin')
  expect(staffDownload.status()).toBe(200)
  expect((await request.get((await staffDownload.json()).download_url)).status()).toBe(200)

  const decision = { document_id: data.document_id, decision: 'rejected', rejection_reason: 'Synthetic rejection' }
  for (const name of ['guest', 'other', 'member']) {
    const auth = name === 'guest' ? {} : headers(name)
    const status = name === 'guest' ? 401 : 403
    expect((await request.get(staffPath, { headers: auth })).status()).toBe(status)
    expect((await request.post(`${staffPath}/decisions`, { headers: auth, data: decision })).status()).toBe(status)
  }
  const editable = Object.fromEntries(['full_name', 'social_name', 'birth_date', 'identity_document_type', 'identity_document_number', 'email', 'phone', 'city', 'state_or_province', 'country', 'school_or_team_name', 'instructor_name', 'hema_experience_description', 'hema_started_year', 'previous_tournament_count', 'hema_ratings_reference', 'handedness', 'category_or_eligibility_note', 'emergency_contact_name', 'emergency_contact_phone'].map(key => [key, owner[key]]))
  const upload = await request.post(`${otherPath}/payment-proof/upload-url`, { headers: headers('other'), data: { original_file_name: 'other-proof.pdf' } })
  expect(upload.status()).toBe(200)
  const staging = await upload.json()
  expect((await request.put(staging.upload_url, { headers: staging.required_headers, data: Buffer.from('%PDF-1.4\n% synthetic proof\n%%EOF\n') })).status()).toBe(200)
  expect((await get(ownerPath, 'other')).status()).toBe(404)
  expect((await request.put(ownerPath, { headers: headers('other'), data: editable })).status()).toBe(404)
  expect((await get(`${ownerPath}/payment`, 'other')).status()).toBe(404)
  expect((await request.post(`${ownerPath}/payment-proof/upload-url`, { headers: headers('other'), data: { original_file_name: 'other-proof.pdf' } })).status()).toBe(404)
  expect((await request.post(`${ownerPath}/payment-proof`, { headers: headers('other'), data: { storage_key: staging.storage_key, original_file_name: 'other-proof.pdf' } })).status()).toBe(404)
  expect((await get(`${ownerPath}/payment-proof`, 'other')).status()).toBe(404)
  expect(await (await get(staffPath, 'admin')).json()).toEqual(before)
  expect((await get(ownerPath, 'owner')).status()).toBe(200)
  expect((await get(`${ownerPath}/payment-proof`, 'owner')).status()).toBe(200)
  expect((await get(`${staffPath}/documents/${data.document_id}/download-url`, 'admin')).status()).toBe(200)

  for (const name of ['guest', 'other', 'member', 'admin']) {
    const auth = name === 'guest' ? {} : headers(name)
    const catalog = await request.get(`${api}/tournaments`, { headers: auth })
    expect(catalog.status()).toBe(200)
    const listing = JSON.stringify(await catalog.json())
    expect(listing).toContain('E2E Authorization private-owner')
    expect(listing.includes('E2E Authorization internal')).toBe(['member', 'admin'].includes(name))
    expect((await request.get(`${api}/tournaments/${data.owner_tournament_id}`, { headers: auth })).status()).toBe(200)
    expect((await request.get(`${api}/tournaments/${data.internal_tournament_id}`, { headers: auth })).status()).toBe(['member', 'admin'].includes(name) ? 200 : 404)
  }
})

test('Browser guards and sign-out prevent private data from reaching another session', async ({ browser, request }) => {
  const data = fixtureData().authorization
  const context = await browser.newContext({ baseURL: 'http://localhost:5174' })
  const page = await context.newPage()
  const registrationUrl = `/tournaments/registration?tournament_id=${data.owner_tournament_id}&registration_number=${data.owner_registration_number}`
  try {
    for (const path of ['/staff/payment-reviews', `/staff/payment-reviews/${data.owner_registration_number}`]) {
      await page.goto(path)
      await expect(page).toHaveURL(/\/account\/sign-in/)
      await expect(page.locator('body')).not.toContainText(sentinel)
    }
    for (const account of ['other', 'member']) {
      await signIn(page, account)
      for (const path of ['/staff/payment-reviews', `/staff/payment-reviews/${data.owner_registration_number}`]) {
        await page.goto(path)
        await expect(page.getByRole('alert').first()).toContainText('Acesso restrito à equipe.')
        await expect(page.locator('body')).not.toContainText(sentinel)
        await expect(page.locator('body')).not.toContainText('authorization-private-proof.pdf')
      }
      if (account === 'other') {
        const result = await page.evaluate(async ({ accountId, number }) => {
          const modulePath = '/src/lib/api-client.ts'
          const { apiFetch } = await import(modulePath)
          const options = { authentication: 'required', expectedAccountId: accountId }
          const denied = await apiFetch(`/staff/tournaments/payment-reviews/${number}`, {}, options)
          const me = await apiFetch('/users/me', {}, options)
          return { denied: denied.status, me: me.status, id: (await me.json()).id }
        }, { accountId: data.accounts.other, number: data.owner_registration_number })
        expect(result).toEqual({ denied: 403, me: 200, id: data.accounts.other })
        await page.goto('/registrations')
        await expect(page.locator('body')).toContainText(data.other_registration_number)
      }
      await page.getByRole('button', { name: /conta/i }).first().click()
      await page.getByRole('button', { name: 'Sair', exact: true }).click()
    }
    await signIn(page, 'owner')
    await page.goto(registrationUrl)
    await expect(page.locator('body')).toContainText(data.owner_registration_number)
    await expect(page.locator('body')).toContainText('authorization-private-proof.pdf')
    // Observe the existing query client without exporting application state or storing private data.
    await page.evaluate(async () => {
      const modulePath = '/src/lib/query-client.ts'
      const { createQueryClient } = await import(modulePath)
      const prototype = Object.getPrototypeOf(createQueryClient())
      const originalClear = prototype.clear
      ;(window as any).__cacheAudit = []
      prototype.clear = function () {
        const before = this.getQueryCache().getAll().map((query: any) => query.queryKey)
        originalClear.call(this)
        ;(window as any).__cacheAudit.push({ before, after: this.getQueryCache().getAll().length })
      }
    })
    await page.getByRole('link', { name: 'Minhas inscrições' }).click()
    await expect(page.locator('body')).toContainText(data.owner_registration_number)
    await page.getByRole('button', { name: /conta/i }).first().click()
    await page.getByRole('button', { name: 'Sair', exact: true }).click()
    await expect(page).toHaveURL(/\/account\/sign-in/)
    const audit = await page.evaluate(() => (window as any).__cacheAudit)
    expect(audit).toHaveLength(1)
    expect(audit[0].before).toContainEqual(['personal-registrations', data.accounts.owner])
    expect(audit[0].before).toContainEqual(['tournaments', data.owner_tournament_id, 'registrations', data.owner_registration_number, 'payment', data.accounts.owner])
    expect(audit[0].after).toBe(0)
    await signInCurrentPage(page, 'other')
    await expect(page.locator('body')).toContainText(data.other_registration_number)
    await expect(page.locator('body')).not.toContainText(data.owner_registration_number)
    await page.evaluate(url => {
      history.pushState({}, '', url)
      dispatchEvent(new PopStateEvent('popstate'))
    }, registrationUrl)
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page.locator('body')).not.toContainText(data.owner_registration_number)
    await expect(page.locator('body')).not.toContainText(sentinel)
    await expect(page.locator('body')).not.toContainText('authorization-private-proof.pdf')
    expect(await page.evaluate(() => (window as any).__cacheAudit.length)).toBe(1)
    const otherToken = await token(request, 'other')
    const rows = await (await request.get(`${api}/tournaments/registrations`, { headers: { Authorization: `Bearer ${otherToken}` } })).json()
    expect(rows.map((row: { registration_number: string }) => row.registration_number)).toEqual([data.other_registration_number])
  } finally {
    await context.close()
  }
})
