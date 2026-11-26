import { expect, test, type Browser, type BrowserContext, type Page, type TestInfo } from '@playwright/test'
import { fixtureData, fixturePassword } from '../fixture-data'

async function signIn(page: Page, account: string) {
  await page.goto('/account/sign-in')
  await page.getByLabel('E-mail', { exact: true }).fill(`${account}@example.test`)
  await page.getByLabel('Senha', { exact: true }).fill(fixturePassword)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Minhas inscrições' })).toBeVisible()
}

async function participant(browser: Browser, account: string, tournamentId: number) {
  const context = await browser.newContext({ baseURL: 'http://localhost:5174' })
  const page = await context.newPage()
  await signIn(page, account)
  await page.goto(`/tournaments/registration?tournament_id=${tournamentId}`)
  const form = page.getByRole('form', { name: 'Formulário de inscrição' })
  await form.getByRole('radio', { name: /E2E entry.*R\$ 100,00/ }).check()
  await form.getByLabel('Nome completo *', { exact: true }).fill(`Fixture ${account}`)
  await form.getByLabel('Telefone *', { exact: true }).fill('+55 11 9999-0000')
  await form.getByLabel('Documento *', { exact: true }).selectOption('passport')
  await form.getByLabel('Número do documento *').fill(`E2E-${account}`)
  await form.getByLabel('Data de nascimento *').fill('2000-01-01')
  await form.getByLabel('País *').fill('Brasil')
  await form.getByLabel('Cidade *').fill('São Paulo')
  await form.getByLabel('Tempo de prática em HEMA').fill('3 anos')
  await form.getByLabel('Torneios anteriores *').fill('0')
  await form.getByLabel('Contato de emergência *').fill('Fixture Contact')
  await form.getByLabel('Telefone de emergência *').fill('+55 11 9999-0001')
  for (const box of await form.getByRole('checkbox').all()) await box.check()
  await form.getByRole('button', { name: 'Enviar minha inscrição' }).click()
  const registration = page.getByRole('region', { name: 'Sua inscrição' })
  await expect(registration.getByText('Aguardando pagamento')).toBeVisible()
  const number = await registration.locator('strong').innerText()
  await page.getByRole('form', { name: 'Comprovante de pagamento' }).getByLabel('Comprovante de pagamento').setInputFiles({ name: 'proof.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n% synthetic proof\n%%EOF\n') })
  await page.getByRole('button', { name: 'Enviar comprovante' }).click()
  await expect(registration.getByText('Aguardando confirmação do pagamento')).toBeVisible()
  return { context, page, number }
}

async function approve(staff: Page, number: string, outcome: 'confirmed' | 'waitlist') {
  await staff.goto('/staff/payment-reviews')
  await staff.getByRole('row').filter({ hasText: number }).getByRole('button', { name: `Revisar ${number}` }).click()
  await staff.getByLabel('Valor recebido (BRL)').fill('100,00')
  await staff.getByRole('checkbox', { name: 'Conferi o recebimento e o valor do pagamento.' }).check()
  await staff.getByRole('checkbox', { name: 'Conferi os requisitos de participação e a documentação aplicável.' }).check()
  const response = staff.waitForResponse(r => r.request().method() === 'POST' && r.url().includes('/payment-reviews/') && r.url().endsWith('/decisions'))
  await staff.getByRole('button', { name: 'Aprovar pagamento' }).click()
  const saved = await response
  expect(saved.ok()).toBeTruthy()
  expect((await saved.json()).registration_status).toBe(outcome)
}

async function capture(page: Page, testInfo: TestInfo, name: string) {
  const file = testInfo.outputPath(`${name}.png`)
  await page.screenshot({ path: file, fullPage: true })
  await testInfo.attach(name, { path: file, contentType: 'image/png' })
}

test('staff selects a waitlisted participant after a seat is released and cancels another without a refund', async ({ browser }, testInfo) => {
  test.setTimeout(180000)
  const id = fixtureData().waitlist_tournament_id
  const contexts: BrowserContext[] = []
  try {
    const a = await participant(browser, 'waitlist-a', id); contexts.push(a.context)
    const b = await participant(browser, 'waitlist-b', id); contexts.push(b.context)
    const c = await participant(browser, 'waitlist-c', id); contexts.push(c.context)
    const staffContext = await browser.newContext({ baseURL: 'http://localhost:5174' }); contexts.push(staffContext)
    const staff = await staffContext.newPage()
    await signIn(staff, 'staff')
    await approve(staff, a.number, 'confirmed')
    await approve(staff, b.number, 'waitlist')
    await approve(staff, c.number, 'waitlist')
    await b.page.reload()
    await expect(b.page.getByRole('region', { name: 'Sua inscrição' }).getByText('Lista de espera')).toBeVisible()
    await staff.goto(`/staff/tournaments/${id}/waitlist`)
    const bRow = staff.getByRole('row').filter({ hasText: b.number })
    const cRow = staff.getByRole('row').filter({ hasText: c.number })
    await expect(bRow.getByRole('button', { name: 'Confirmar participação' })).toBeDisabled()
    await capture(staff, testInfo, 'waitlist-full')
    await cRow.getByRole('button', { name: 'Cancelar inscrição' }).click()
    const noRefund = staff.waitForResponse(r => r.request().method() === 'GET' && r.url().endsWith(`/registrations/${c.number}/refund`))
    await staff.getByRole('button', { name: 'Confirmar cancelamento' }).click()
    expect(await (await noRefund).json()).toBeNull()
    await expect(staff.getByRole('status')).toContainText('sem reembolso pendente')
    await expect(cRow).toHaveCount(0)
    await staff.goto(`/staff/tournaments/${id}/athletes/${a.number}`)
    await staff.getByRole('button', { name: 'Cancelar participação' }).click()
    await staff.getByRole('button', { name: 'Confirmar cancelamento' }).click()
    await expect(staff.getByText('Inscrição cancelada.', { exact: true })).toBeVisible()
    await staff.goto(`/staff/tournaments/${id}/waitlist`)
    await expect(bRow).toBeVisible()
    await expect(bRow.getByRole('button', { name: 'Confirmar participação' })).toBeEnabled()
    await capture(staff, testInfo, 'waitlist-seat-available')
    await bRow.getByRole('button', { name: 'Confirmar participação' }).click()
    const decision = staff.waitForResponse(r => r.request().method() === 'POST' && r.url().endsWith(`/registrations/${b.number}/confirm`))
    await staff.getByRole('heading', { name: 'Confirmar participação?' }).locator('..').getByRole('button', { name: 'Confirmar participação' }).click()
    expect((await decision).ok()).toBeTruthy()
    await expect(staff.getByRole('status')).toContainText('participação confirmada')
    await expect(bRow).toHaveCount(0)
    await b.page.reload()
    await expect(b.page.getByRole('region', { name: 'Sua inscrição' }).getByText('Confirmada', { exact: true })).toBeVisible()
  } finally { await Promise.all(contexts.map(context => context.close())) }
})

test('staff cancellation of a waitlisted registration exposes an awaiting refund', async ({ browser }, testInfo) => {
  test.setTimeout(150000)
  const id = fixtureData().waitlist_refund_tournament_id
  const contexts: BrowserContext[] = []
  try {
    const a = await participant(browser, 'refund-a', id); contexts.push(a.context)
    const b = await participant(browser, 'refund-b', id); contexts.push(b.context)
    const staffContext = await browser.newContext({ baseURL: 'http://localhost:5174' }); contexts.push(staffContext)
    const staff = await staffContext.newPage()
    await signIn(staff, 'staff')
    await approve(staff, a.number, 'confirmed')
    await approve(staff, b.number, 'waitlist')
    await staff.goto(`/staff/tournaments/${id}/waitlist`)
    await staff.getByRole('row').filter({ hasText: b.number }).getByRole('button', { name: 'Cancelar inscrição' }).click()
    const refundResponse = staff.waitForResponse(r => r.request().method() === 'GET' && r.url().endsWith(`/registrations/${b.number}/refund`))
    await staff.getByRole('button', { name: 'Confirmar cancelamento' }).click()
    const refundRecord = await (await refundResponse).json()
    expect(refundRecord.refund_status).toBe('awaiting_refund')
    expect(refundRecord.amount_owed).toBe('100.00')
    expect(refundRecord.completed_at).toBeNull()
    await expect(staff.getByRole('status')).toContainText('reembolso aguardando processamento')
    await capture(staff, testInfo, 'waitlist-refund-awaiting')
    await staff.getByRole('link', { name: 'Abrir fila de reembolsos' }).click()
    await expect(staff).toHaveURL(/\/staff\/refunds$/)
    const refund = staff.getByRole('row').filter({ hasText: b.number })
    await expect(refund).toContainText('R$ 100,00')
    await expect(refund.getByRole('button', { name: `Registrar reembolso realizado ${b.number}` })).toBeVisible()
  } finally { await Promise.all(contexts.map(context => context.close())) }
})
