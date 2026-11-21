import { expect, test, type Page } from '@playwright/test'
import { fixtureData, fixturePassword } from '../fixture-data'

async function signIn(page: Page, email: string) {
  await page.goto('/account/sign-in')
  await page.getByLabel('E-mail', { exact: true }).fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(fixturePassword)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Minhas inscrições' })).toBeVisible()
}

test.describe('Payment review', () => {
  test('Owner submits proof and staff confirms the available seat', async ({ browser }) => {
    test.setTimeout(90000)
    const data = fixtureData()
    const registrationUrl = `http://localhost:5174/tournaments/registration?tournament_id=${data.payment_tournament_id}&registration_number=${data.payment_registration_number}`
    const ownerContext = await browser.newContext({ baseURL: 'http://localhost:5174' })
    const staffContext = await browser.newContext({ baseURL: 'http://localhost:5174' })
    const owner = await ownerContext.newPage()
    const staff = await staffContext.newPage()

    try {
      await signIn(owner, 'owner@example.test')
      await owner.goto(registrationUrl)
      const registration = owner.getByRole('region', { name: 'Sua inscrição' })
      await expect(registration.getByText(data.payment_registration_number)).toBeVisible()
      await expect(registration.getByText('Aguardando pagamento', { exact: true })).toBeVisible()
      const payment = owner.getByRole('region', { name: 'Pagamento da inscrição' })
      await expect(payment.getByText('fixture@example.test')).toBeVisible()
      await expect(payment.getByText('R$ 100,00')).toBeVisible()

      await owner.getByRole('form', { name: 'Comprovante de pagamento' }).getByLabel('Comprovante de pagamento').setInputFiles({
        name: 'proof.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4\n% synthetic proof\n%%EOF\n'),
      })
      await owner.getByRole('button', { name: 'Enviar comprovante' }).click()
      await expect(registration.getByText('Aguardando confirmação do pagamento')).toBeVisible()
      await expect(payment.getByRole('status')).toContainText('Nenhuma vaga foi reservada')
      await owner.reload()
      await expect(registration.getByText('Aguardando confirmação do pagamento')).toBeVisible()
      await expect(payment.getByText('proof.pdf')).toBeVisible()
      await expect(registration.getByText('Confirmada', { exact: true })).toHaveCount(0)

      await signIn(staff, 'staff@example.test')
      await staff.goto('http://localhost:5174/staff/payment-reviews')
      const row = staff.getByRole('row').filter({ hasText: data.payment_registration_number })
      await expect(row).toContainText('E2E Payment')
      await row.getByRole('button', { name: `Revisar ${data.payment_registration_number}` }).click()
      await expect(staff.getByRole('heading', { name: 'Conferir pagamento e participação' })).toBeVisible()
      const capacity = staff.getByRole('complementary')
      const confirmedCount = capacity.locator('dt').filter({ hasText: /^Confirmados$/ }).locator('xpath=following-sibling::dd[1]')
      const capacityCount = capacity.locator('dt').filter({ hasText: /^Capacidade$/ }).locator('xpath=following-sibling::dd[1]')
      await expect(confirmedCount).toHaveText('0')
      await expect(capacityCount).toHaveText('1')
      await staff.getByRole('button', { name: 'Abrir documento' }).click()
      const proof = staff.getByRole('link', { name: /Consultar documento · proof.pdf/ })
      await expect(proof).toBeVisible()
      const proofUrl = await proof.getAttribute('href')
      expect(proofUrl).toBeTruthy()
      const downloaded = await staffContext.request.get(proofUrl!)
      expect(downloaded.ok()).toBeTruthy()
      expect((await downloaded.body()).subarray(0, 5).toString()).toBe('%PDF-')

      await staff.getByLabel('Valor recebido (BRL)').fill('100,00')
      await staff.getByRole('checkbox', { name: 'Conferi o recebimento e o valor do pagamento.' }).check()
      await staff.getByRole('checkbox', { name: 'Conferi os requisitos de participação e a documentação aplicável.' }).check()
      const responsePromise = staff.waitForResponse(response =>
        response.request().method() === 'POST' && response.url().includes('/payment-reviews/') && response.url().endsWith('/decisions'),
      )
      await staff.getByRole('button', { name: 'Aprovar pagamento' }).click()
      const response = await responsePromise
      expect(response.ok()).toBeTruthy()
      const decision = await response.json()
      expect(decision.review.decision).toBe('approved')
      expect(decision.review.reviewed_by_user_id).toBe(data.staff_id)
      expect(Date.parse(decision.review.reviewed_at)).not.toBeNaN()
      expect(decision.registration_status).toBe('confirmed')
      await expect(staff.getByRole('status').getByText('Participação confirmada.')).toBeVisible()
      await expect(confirmedCount).toHaveText('1')
      await expect(capacityCount).toHaveText('1')

      await owner.reload()
      await expect(registration.getByText('Confirmada', { exact: true })).toBeVisible()
      await expect(registration.getByRole('status')).toContainText('Sua participação está confirmada')
    } finally {
      await ownerContext.close()
      await staffContext.close()
    }
  })
})
