import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import { fixtureData, fixturePassword } from '../fixture-data'

const proof = Buffer.from('%PDF-1.4\n% cancellation refund synthetic proof\n%%EOF\n')

async function signIn(page: Page, account: string) {
  await page.goto('/account/sign-in')
  await page.getByLabel('E-mail', { exact: true }).fill(`${account}@example.test`)
  await page.getByLabel('Senha', { exact: true }).fill(fixturePassword)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Minhas inscrições' })).toBeVisible()
}

function registrationUrl(id: number, number: string) {
  return `/tournaments/registration?tournament_id=${id}&registration_number=${number}`
}

async function seats(page: Page, id: number, count: number) {
  await page.goto(`/staff/tournaments/${id}/waitlist`)
  await expect(page.getByText('Participantes confirmados', { exact: true }).locator('..')).toContainText(`${count} / 1`)
}

function refundDeadline(obligatedAt: string) {
  const localDate = new Date(Date.parse(obligatedAt) - 3 * 60 * 60 * 1000)
  localDate.setUTCHours(0, 0, 0, 0)
  let remaining = 10
  while (remaining > 0) {
    localDate.setUTCDate(localDate.getUTCDate() + 1)
    if (localDate.getUTCDay() !== 0 && localDate.getUTCDay() !== 6) remaining--
  }
  return localDate.toISOString().slice(0, 10)
}

async function pendingRefund(page: Page, id: number, number: string) {
  const response = page.waitForResponse(r => r.request().method() === 'GET' && r.url().endsWith(`/registrations/${number}/refund`))
  await page.goto(registrationUrl(id, number))
  const refund = await (await response).json()
  expect(refund.refund_status).toBe('awaiting_refund')
  expect(refund.amount_owed).toBe('123.45')
  expect(refund.due_on).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  expect(refund.completed_at).toBeNull()
  await expect(page.getByRole('region', { name: 'Sua inscrição' }).getByText('Cancelada', { exact: true })).toBeVisible()
  await expect(page.getByText('Aguardando reembolso', { exact: true })).toBeVisible()
  await expect(page.getByText('Reembolso concluído', { exact: true })).toHaveCount(0)
  await expect(page.getByText('R$ 123,45')).toBeVisible()
  const deadline = new Intl.DateTimeFormat('pt', { dateStyle: 'medium', timeZone: 'UTC' })
    .format(new Date(`${refund.due_on}T00:00:00Z`))
  await expect(page.getByText('Prazo do reembolso', { exact: true }).locator('xpath=following-sibling::dd')).toHaveText(deadline)
  return refund
}

async function replacement(page: Page, id: number) {
  await page.goto(`/tournaments/registration?tournament_id=${id}`)
  const form = page.getByRole('form', { name: 'Formulário de inscrição' })
  await form.getByRole('radio', { name: /E2E entry.*R\$ 100,00/ }).check()
  await form.getByLabel('Nome completo *', { exact: true }).fill('Fixture replacement')
  await form.getByLabel('Telefone *', { exact: true }).fill('+55 11 9999-0000')
  await form.getByLabel('Documento *', { exact: true }).selectOption('passport')
  await form.getByLabel('Número do documento *').fill('E2E-cancellation-owner')
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
  return registration.locator('strong').innerText()
}

test('owner cancels, registers again, and staff completes the old refund', async ({ browser }) => {
  test.setTimeout(180000)
  const { tournamentId: id, registrationNumber: number } = fixtureData().cancellationRefunds.owner
  const contexts: BrowserContext[] = []
  try {
    const ownerContext = await browser.newContext({ baseURL: 'http://localhost:5174' }); contexts.push(ownerContext)
    const staffContext = await browser.newContext({ baseURL: 'http://localhost:5174' }); contexts.push(staffContext)
    const owner = await ownerContext.newPage(); const staff = await staffContext.newPage()
    await signIn(owner, 'cancellation-owner'); await signIn(staff, 'cancellation-admin')
    await seats(staff, id, 1)
    await owner.goto(registrationUrl(id, number))
    await owner.getByRole('button', { name: 'Cancelar participação' }).click()
    await owner.getByRole('button', { name: 'Confirmar cancelamento' }).click()
    await expect(owner.getByText('Aguardando reembolso', { exact: true })).toBeVisible()
    const pending = await pendingRefund(owner, id, number)
    await seats(staff, id, 0)
    const newNumber = await replacement(owner, id)
    expect(newNumber).not.toBe(number)
    expect((await pendingRefund(owner, id, number)).due_on).toBe(pending.due_on)
    await owner.goto(registrationUrl(id, newNumber))
    await owner.getByRole('form', { name: 'Comprovante de pagamento' }).getByLabel('Comprovante de pagamento').setInputFiles({ name: 'replacement.pdf', mimeType: 'application/pdf', buffer: proof })
    await owner.getByRole('button', { name: 'Enviar comprovante' }).click()
    await staff.goto('/staff/payment-reviews')
    await staff.getByRole('row').filter({ hasText: newNumber }).getByRole('button', { name: `Revisar ${newNumber}` }).click()
    await staff.getByLabel('Valor recebido (BRL)').fill('100,00')
    await staff.getByRole('checkbox', { name: 'Conferi o recebimento e o valor do pagamento.' }).check()
    await staff.getByRole('checkbox', { name: 'Conferi os requisitos de participação e a documentação aplicável.' }).check()
    const approval = staff.waitForResponse(r => r.request().method() === 'POST' && r.url().endsWith('/decisions'))
    await staff.getByRole('button', { name: 'Aprovar pagamento' }).click()
    expect((await (await approval).json()).registration_status).toBe('confirmed')
    await seats(staff, id, 1)
    await staff.goto('/staff/refunds')
    await staff.getByLabel('Buscar inscrição exata').fill(number)
    const queueResponse = staff.waitForResponse(r => r.request().method() === 'GET' && r.url().includes('/staff/tournaments/refunds?') && r.url().includes(encodeURIComponent(number)))
    await staff.getByRole('button', { name: 'Buscar', exact: true }).click()
    const queue = await (await queueResponse).json()
    expect(queue.items).toHaveLength(1)
    expect(queue.items[0].registration_number).toBe(number)
    expect(pending.due_on).toBe(refundDeadline(queue.items[0].obligated_at))
    const row = staff.getByRole('row').filter({ hasText: number })
    await expect(row).toHaveCount(1)
    await expect(row).toContainText('R$ 123,45')
    await row.getByRole('button', { name: `Registrar reembolso realizado ${number}` }).click()
    await staff.getByRole('link', { name: 'Ver evidência de pagamento' }).click()
    await staff.getByRole('button', { name: 'Abrir documento' }).click()
    const link = staff.getByRole('link', { name: /Consultar documento · cancellation-proof.pdf/ })
    const href = await link.getAttribute('href')
    expect(href).toBeTruthy()
    const download = await staffContext.request.get(href!)
    expect(download.ok()).toBeTruthy()
    expect(await download.body()).toEqual(proof)
    await staff.goto('/staff/refunds')
    await staff.getByLabel('Buscar inscrição exata').fill(number)
    await staff.getByRole('button', { name: 'Buscar', exact: true }).click()
    await row.getByRole('button', { name: `Registrar reembolso realizado ${number}` }).click()
    // Wait until a whole second after cancellation is available in the fixed UTC-03 input.
    const eligibleAt = Math.ceil(Date.parse(queue.items[0].obligated_at) / 1000) * 1000
    await staff.waitForTimeout(Math.max(0, eligibleAt - Date.now()) + 50)
    const localTime = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 19)
    await staff.getByLabel('Transferência realizada em (UTC−03:00)').fill(localTime)
    await staff.getByRole('checkbox', { name: 'Confirmei a transferência do valor integral.' }).check()
    const completion = staff.waitForResponse(r => r.request().method() === 'POST' && r.url().endsWith(`/registrations/${number}/refund/complete`))
    await staff.getByRole('button', { name: 'Registrar devolução concluída' }).click()
    const saved = await completion
    expect(saved.ok()).toBeTruthy()
    expect((await saved.json()).notification_result).toBe('unavailable')
    await expect(staff.getByRole('status')).toContainText('O e-mail de confirmação não foi enviado')
    await staff.reload()
    await staff.getByLabel('Buscar inscrição exata').fill(number)
    const filteredQueue = staff.waitForResponse(r => r.request().method() === 'GET' && r.url().includes('/staff/tournaments/refunds?') && new URL(r.url()).searchParams.get('registration_number') === number)
    await staff.getByRole('button', { name: 'Buscar', exact: true }).click()
    const filtered = await filteredQueue
    expect(filtered.ok()).toBeTruthy()
    expect((await filtered.json()).items).toEqual([])
    await expect(staff.getByText('Nenhum reembolso pendente.', { exact: true })).toBeVisible()
    await expect(staff.getByRole('row').filter({ hasText: number })).toHaveCount(0)
    const refundResponse = owner.waitForResponse(r => r.request().method() === 'GET' && r.url().endsWith(`/registrations/${number}/refund`))
    await owner.goto(registrationUrl(id, number))
    const completed = await (await refundResponse).json()
    expect(completed.refund_status).toBe('completed')
    expect(completed.amount_owed).toBe('123.45')
    expect(Date.parse(completed.completed_at)).toBe(Date.parse(`${localTime}-03:00`))
    await expect(owner.getByText('Reembolso concluído', { exact: true })).toBeVisible()
    await expect(owner.getByRole('region', { name: 'Sua inscrição' }).getByText('Cancelada', { exact: true })).toBeVisible()
    await owner.goto(registrationUrl(id, newNumber))
    await expect(owner.getByRole('region', { name: 'Sua inscrição' }).getByText('Confirmada', { exact: true })).toBeVisible()
    await seats(staff, id, 1)
  } finally { await Promise.all(contexts.map(context => context.close())) }
})

test('staff cancellation releases the confirmed seat and creates the owner refund', async ({ browser }) => {
  const { tournamentId: id, registrationNumber: number } = fixtureData().cancellationRefunds.staffCancellation
  const contexts: BrowserContext[] = []
  try {
    const ownerContext = await browser.newContext({ baseURL: 'http://localhost:5174' }); contexts.push(ownerContext)
    const staffContext = await browser.newContext({ baseURL: 'http://localhost:5174' }); contexts.push(staffContext)
    const owner = await ownerContext.newPage(); const staff = await staffContext.newPage()
    await signIn(owner, 'cancellation-staff-owner'); await signIn(staff, 'cancellation-admin')
    await seats(staff, id, 1)
    await staff.goto(`/staff/tournaments/${id}/athletes/${number}`)
    await staff.getByRole('button', { name: 'Cancelar participação' }).click()
    await staff.getByRole('button', { name: 'Confirmar cancelamento' }).click()
    await expect(staff.getByText('Inscrição cancelada.', { exact: true })).toBeVisible()
    const pending = await pendingRefund(owner, id, number)
    await seats(staff, id, 0)
    const queueResponse = staff.waitForResponse(r => r.request().method() === 'GET' && r.url().includes('/staff/tournaments/refunds?'))
    await staff.goto('/staff/refunds')
    const queue = await (await queueResponse).json()
    const refund = queue.items.find((item: { registration_number: string }) => item.registration_number === number)
    expect(refund).toBeTruthy()
    expect(pending.due_on).toBe(refundDeadline(refund.obligated_at))
  } finally { await Promise.all(contexts.map(context => context.close())) }
})
