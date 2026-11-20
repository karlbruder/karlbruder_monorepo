import { expect, test } from '@playwright/test'
import { fixtureData, fixturePassword } from '../fixture-data'

test.describe('Tournament registration', () => {
  test('Guest signs in and registers for the selected tournament', async ({ page }) => {
    const { registration_tournament_id: tournamentId } = fixtureData()

    await page.goto(`/tournaments/registration?tournament_id=${tournamentId}`)
    await expect(page.getByRole('heading', { name: 'E2E Registration' })).toBeVisible()
    await page.getByRole('link', { name: 'Entrar com e-mail' }).click()

    await page.getByLabel('E-mail', { exact: true }).fill('participant@example.test')
    await page.getByLabel('Senha', { exact: true }).fill(fixturePassword)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/tournaments/registration\\?tournament_id=${tournamentId}$`))
    await expect(page.getByRole('form', { name: 'Formulário de inscrição' })).toBeVisible()

    const form = page.getByRole('form', { name: 'Formulário de inscrição' })
    const entry = form.getByRole('radio', { name: /E2E entry.*R\$ 100,00/ })
    await expect(entry).toBeVisible()
    await entry.check()
    await form.getByLabel('Nome completo *', { exact: true }).fill('Fixture Participant')
    await form.getByLabel('Telefone *', { exact: true }).fill('+55 11 9999-0000')
    await form.getByLabel('Documento *', { exact: true }).selectOption('passport')
    await form.getByLabel('Número do documento *').fill('E2E-PARTICIPANT')
    await form.getByLabel('Data de nascimento *').fill('2000-01-01')
    await form.getByLabel('País *').fill('Brasil')
    await form.getByLabel('Cidade *').fill('São Paulo')
    await form.getByLabel('Tempo de prática em HEMA').fill('3 anos')
    await form.getByLabel('Torneios anteriores *').fill('0')
    await form.getByLabel('Contato de emergência *').fill('Fixture Contact')
    await form.getByLabel('Telefone de emergência *').fill('+55 11 9999-0001')
    const declarations = form.getByRole('checkbox')
    await expect(declarations).toHaveCount(7)
    for (const checkbox of await declarations.all()) await checkbox.check()
    await form.getByRole('button', { name: 'Enviar minha inscrição' }).click()

    const registration = page.getByRole('region', { name: 'Sua inscrição' })
    await expect(registration.getByText('Aguardando pagamento')).toBeVisible()
    const number = await registration.locator('strong').innerText()
    expect(number).toMatch(/^T\d+-\d+-\d+$/)
    await expect(page.getByText('O envio da inscrição não confirma uma vaga.')).toBeVisible()

    await page.getByRole('link', { name: 'Minhas inscrições' }).click()
    const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'E2E Registration' }) })
    await expect(card.getByText(number)).toBeVisible()
    await expect(card.getByText('Aguardando pagamento')).toBeVisible()
  })
})
