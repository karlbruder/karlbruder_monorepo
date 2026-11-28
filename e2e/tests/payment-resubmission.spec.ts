import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import { fixtureData, fixturePassword } from '../fixture-data'

test.use({ trace: 'off' })

const proofA = Buffer.from('%PDF-1.4\n% synthetic rejected proof A\n%%EOF\n')
const proofB = Buffer.from('%PDF-1.4\n% synthetic replacement proof B\n%%EOF\n')
const reason = 'O comprovante sintético precisa ser substituído.'

async function signIn(page: Page, email: string) {
  await page.goto('/account/sign-in')
  await page.getByLabel('E-mail', { exact: true }).fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(fixturePassword)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Minhas inscrições' })).toBeVisible()
}

async function openProof(page: Page, context: BrowserContext, name: string, expected: Buffer) {
  const document = page.getByRole('listitem').filter({ has: page.getByText(name, { exact: true }) })
  await document.getByRole('button', { name: 'Abrir documento' }).click()
  const url = await document.getByRole('link', { name: `Consultar documento · ${name}` }).getAttribute('href')
  expect(url).toBeTruthy()
  const response = await context.request.get(url!)
  expect(response.ok()).toBeTruthy()
  expect(await response.body()).toEqual(expected)
}

test('Rejected proof remains available after replacement and approval', async ({ browser }) => {
  test.setTimeout(90000)
  const data = fixtureData().payment_resubmission
  const registrationUrl = `/tournaments/registration?tournament_id=${data.tournament_id}&registration_number=${data.registration_number}`
  const reviewUrl = `/staff/payment-reviews/${encodeURIComponent(data.registration_number)}`
  const ownerContext = await browser.newContext({ baseURL: 'http://localhost:5174' })
  const staffContext = await browser.newContext({ baseURL: 'http://localhost:5174' })
  try {
    const owner = await ownerContext.newPage()
    const staff = await staffContext.newPage()
    await signIn(owner, 'resubmission-owner@example.test')
    await owner.goto(registrationUrl)
    const registration = owner.getByRole('region', { name: 'Sua inscrição' })
    const payment = owner.getByRole('region', { name: 'Pagamento da inscrição' })
    await expect(registration.getByText('Aguardando pagamento', { exact: true })).toBeVisible()
    await owner.getByRole('form', { name: 'Comprovante de pagamento' }).getByLabel('Comprovante de pagamento').setInputFiles({ name: 'proof-a.pdf', mimeType: 'application/pdf', buffer: proofA })
    await owner.getByRole('button', { name: 'Enviar comprovante' }).click()
    await expect(registration.getByText('Aguardando confirmação do pagamento')).toBeVisible()

    await signIn(staff, 'resubmission-staff@example.test')
    await staff.goto('/staff/payment-reviews')
    await staff.getByLabel('Buscar inscrição exata').fill(data.registration_number)
    await staff.getByRole('button', { name: 'Buscar', exact: true }).click()
    const row = staff.getByRole('row').filter({ hasText: data.registration_number })
    await expect(row).toHaveCount(1)
    const detailResponse = staff.waitForResponse(response => response.request().method() === 'GET' && response.url().endsWith(`/payment-reviews/${data.registration_number}`))
    await row.getByRole('button', { name: `Revisar ${data.registration_number}` }).click()
    const initial = await (await detailResponse).json()
    const idA = initial.latest_document_id
    expect(initial.documents.find((doc: { id: number }) => doc.id === idA).original_file_name).toBe('proof-a.pdf')
    const capacity = staff.getByRole('complementary')
    const confirmedCount = capacity.locator('dt').filter({ hasText: /^Confirmados$/ }).locator('xpath=following-sibling::dd[1]')
    const capacityCount = capacity.locator('dt').filter({ hasText: /^Capacidade$/ }).locator('xpath=following-sibling::dd[1]')
    await expect(confirmedCount).toHaveText('0')
    await expect(capacityCount).toHaveText('1')
    await staff.getByLabel('Motivo da recusa').fill(reason)
    const rejectedResponse = staff.waitForResponse(response => response.request().method() === 'POST' && response.url().endsWith('/decisions'))
    await staff.getByRole('button', { name: 'Recusar comprovante e solicitar novo envio' }).click()
    const rejected = await rejectedResponse
    expect(rejected.ok()).toBeTruthy()
    const decision = await rejected.json()
    expect(decision.review).toMatchObject({ document_id: idA, decision: 'rejected', rejection_reason: reason, reviewed_by_user_id: data.staff_id })
    expect(Date.parse(decision.review.reviewed_at)).not.toBeNaN()
    expect(decision.registration_status).toBe('awaiting_payment')
    expect(decision.notification_result).toBe('unavailable')
    await expect(staff.getByRole('status').getByText('A análise foi registrada, mas o e-mail não foi enviado.')).toBeVisible()

    await owner.reload()
    await expect(registration.getByText('Aguardando pagamento', { exact: true })).toBeVisible()
    await expect(registration.getByText('Confirmada', { exact: true })).toHaveCount(0)
    await expect(payment.getByText(reason)).toBeVisible()
    await staff.reload()
    await expect(staff.getByText(reason)).toBeVisible()
    await expect(confirmedCount).toHaveText('0')
    await expect(capacityCount).toHaveText('1')
    await owner.getByRole('form', { name: 'Comprovante de pagamento' }).getByLabel('Comprovante de pagamento').setInputFiles({ name: 'proof-b.pdf', mimeType: 'application/pdf', buffer: proofB })
    await owner.getByRole('button', { name: 'Substituir comprovante', exact: true }).click()
    await expect(registration.getByText('Aguardando confirmação do pagamento')).toBeVisible()
    await staff.goto('/staff/payment-reviews')
    await staff.getByLabel('Buscar inscrição exata').fill(data.registration_number)
    await staff.getByRole('button', { name: 'Buscar', exact: true }).click()
    await expect(row).toHaveCount(1)
    const replacementResponse = staff.waitForResponse(response => response.request().method() === 'GET' && response.url().endsWith(`/payment-reviews/${data.registration_number}`))
    await row.getByRole('button', { name: `Revisar ${data.registration_number}` }).click()
    const replacement = await (await replacementResponse).json()
    const idB = replacement.latest_document_id
    expect(idB).not.toBe(idA)
    expect(replacement.documents.find((doc: { id: number }) => doc.id === idB).original_file_name).toBe('proof-b.pdf')
    expect(replacement.reviews).toContainEqual(expect.objectContaining({ document_id: idA, decision: 'rejected', rejection_reason: reason, reviewed_by_user_id: data.staff_id, reviewed_at: decision.review.reviewed_at }))
    await staff.getByText('Histórico de documentos').click()
    await openProof(staff, staffContext, 'proof-a.pdf', proofA)
    await openProof(staff, staffContext, 'proof-b.pdf', proofB)
    await staff.getByLabel('Valor recebido (BRL)').fill('100,00')
    await staff.getByRole('checkbox', { name: 'Conferi o recebimento e o valor do pagamento.' }).check()
    await staff.getByRole('checkbox', { name: 'Conferi os requisitos de participação e a documentação aplicável.' }).check()
    const approvedResponse = staff.waitForResponse(response => response.request().method() === 'POST' && response.url().endsWith('/decisions'))
    await staff.getByRole('button', { name: 'Aprovar pagamento' }).click()
    const approved = await approvedResponse
    expect(approved.ok()).toBeTruthy()
    expect(await approved.json()).toMatchObject({ review: { document_id: idB, decision: 'approved' }, registration_status: 'confirmed' })
    await expect(confirmedCount).toHaveText('1')
    await staff.reload()
    await expect(confirmedCount).toHaveText('1')
    await staff.getByText('Histórico de documentos').click()
    await openProof(staff, staffContext, 'proof-a.pdf', proofA)
    await openProof(staff, staffContext, 'proof-b.pdf', proofB)

    const ownerRequest = owner.waitForResponse(response => response.request().method() === 'GET' && response.url().includes(`/registrations/${data.registration_number}/payment`))
    await owner.reload()
    const authorization = (await (await ownerRequest).request().allHeaders()).authorization
    expect(authorization).toBeTruthy()
    await expect(registration.getByText('Confirmada', { exact: true })).toBeVisible()
    await expect(payment.getByText(/Último comprovante enviado: proof-b.pdf/)).toBeVisible()
    const download = await ownerContext.request.get(`/api/tournaments/${data.tournament_id}/registrations/${data.registration_number}/payment-proof`, { headers: { authorization } })
    expect(download.ok()).toBeTruthy()
    const stored = await ownerContext.request.get((await download.json()).download_url)
    expect(stored.ok()).toBeTruthy()
    expect(await stored.body()).toEqual(proofB)
  } finally {
    await ownerContext.close()
    await staffContext.close()
  }
})
