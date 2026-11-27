import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { fixturePassword } from '../fixture-data'

async function signIn(page: Page, account: string) {
  await page.goto('/account/sign-in')
  await page.getByLabel('E-mail', { exact: true }).fill(`${account}@example.test`)
  await page.getByLabel('Senha', { exact: true }).fill(fixturePassword)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Minhas inscrições' })).toBeVisible()
}

function dateOffset(days: number) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10)
}

async function createTournament(staff: Page, name: string, existing?: string) {
  await staff.goto('/staff/tournaments/new')
  await staff.getByLabel('Nome', { exact: true }).fill(name)
  await staff.getByLabel('Início', { exact: true }).fill(dateOffset(30))
  await staff.getByLabel('Abertura das inscrições').fill(dateOffset(-2))
  await staff.getByLabel('Encerramento das inscrições').fill(dateOffset(10))
  await staff.getByLabel('Capacidade de participantes').fill('5')
  await staff.getByLabel('Chave Pix').fill('fixture@example.test')
  if (existing) {
    await staff.getByRole('checkbox', { name: new RegExp(existing) }).check()
  } else {
    for (const [name, description, amount] of [
      ['E2E Shared 85', 'Benefícios originais', '100,00'],
      ['E2E First Only', 'Primeiro torneio', '50,00'],
    ]) {
      await staff.getByRole('button', { name: 'Adicionar novo produto' }).click()
      const draft = staff.getByRole('group', { name: `Novo produto ${name.includes('Shared') ? 1 : 2}` })
      await draft.getByLabel('Nome do produto').fill(name)
      await draft.getByLabel('Descrição dos benefícios').fill(description)
      await draft.getByLabel('Preço em BRL').fill(amount)
    }
  }
  await staff.getByRole('button', { name: 'Salvar torneio' }).click()
  await expect(staff).toHaveURL(/\/staff\/tournaments\/\d+$/)
  await expect(staff.getByRole('heading', { name, exact: true })).toBeVisible()
  return Number(new URL(staff.url()).pathname.split('/').pop())
}

async function participant(browser: Browser, contexts: BrowserContext[], account: string, tournamentId: number) {
  const context = await browser.newContext({ baseURL: 'http://localhost:5174' })
  contexts.push(context)
  const page = await context.newPage()
  await signIn(page, account)
  await page.goto(`/tournaments/registration?tournament_id=${tournamentId}`)
  await expect(page.getByRole('form', { name: 'Formulário de inscrição' })).toBeVisible()
  return page
}

async function register(page: Page, account: string, name: string) {
  const form = page.getByRole('form', { name: 'Formulário de inscrição' })
  await form.getByRole('radio', { name: new RegExp(name) }).check()
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
  return registration.locator('strong').innerText()
}

test('staff manage shared offerings while registrations keep their original terms', async ({ browser }) => {
  test.setTimeout(180000)
  const contexts: BrowserContext[] = []
  try {
    const staffContext = await browser.newContext({ baseURL: 'http://localhost:5174' })
    contexts.push(staffContext)
    const staff = await staffContext.newPage()
    await signIn(staff, 'offering-staff')
    const first = await createTournament(staff, 'E2E Offerings First')
    const second = await createTournament(staff, 'E2E Offerings Second', 'E2E Shared 85')
    await staff.getByRole('button', { name: 'Adicionar produto', exact: true }).click()
    await staff.getByRole('button', { name: 'Adicionar novo produto' }).click()
    const draft = staff.getByRole('group', { name: 'Novo produto 1' })
    await draft.getByLabel('Nome do produto').fill('E2E Second Only')
    await draft.getByLabel('Descrição dos benefícios').fill('Segundo torneio')
    await draft.getByLabel('Preço em BRL').fill('75,00')
    await staff.getByRole('button', { name: 'Adicionar ao torneio' }).click()
    await expect(staff.getByText('Produtos adicionados.')).toBeVisible()

    const a = await participant(browser, contexts, 'offering-a', first)
    await expect(a.getByRole('radio', { name: /E2E First Only/ })).toBeVisible()
    await expect(a.getByRole('radio', { name: /E2E Second Only/ })).toHaveCount(0)
    const oldNumber = await register(a, 'offering-a', 'E2E Shared 85')
    await expect(a.getByRole('region', { name: 'Sua inscrição' })).toContainText('Benefícios originais')
    await expect(a.getByRole('region', { name: 'Pagamento da inscrição' })).toContainText('R$ 100,00')

    await staff.goto(`/staff/tournaments/${first}`)
    const shared = staff.locator('article').filter({ has: staff.getByRole('heading', { name: /E2E Shared 85/ }) })
    await shared.getByRole('button', { name: 'Editar detalhes' }).click()
    await shared.getByLabel('Nome do produto').fill('E2E Shared Revised')
    await shared.getByLabel('Descrição dos benefícios').fill('Benefícios atualizados')
    await shared.getByRole('button', { name: 'Revisar alteração' }).click()
    const review = shared.getByRole('region', { name: 'Confirmar alteração compartilhada' })
    await expect(review).toContainText('E2E Offerings First')
    await expect(review).toContainText('E2E Offerings Second')
    await review.getByRole('button', { name: 'Confirmar alteração' }).click()
    await expect(staff.getByRole('heading', { name: /E2E Shared Revised/ })).toBeVisible()
    const revised = staff.locator('article').filter({ has: staff.getByRole('heading', { name: /E2E Shared Revised/ }) })
    await revised.getByRole('button', { name: 'Alterar preço' }).click()
    await revised.getByLabel('Novo preço em BRL').fill('125,00')
    await revised.getByRole('button', { name: 'Revisar alteração' }).click()
    await expect(revised.getByRole('region', { name: 'Confirmar alteração compartilhada' })).toContainText('E2E Offerings First')
    await expect(revised.getByRole('region', { name: 'Confirmar alteração compartilhada' })).toContainText('E2E Offerings Second')
    await revised.getByRole('button', { name: 'Confirmar alteração' }).click()
    await expect(revised.getByRole('heading', { level: 3 })).toContainText('R$ 125,00')

    const b = await participant(browser, contexts, 'offering-b', second)
    await expect(b.getByRole('radio', { name: /E2E Second Only/ })).toBeVisible()
    await expect(b.getByRole('radio', { name: /E2E First Only/ })).toHaveCount(0)
    await expect(b.getByRole('radio', { name: /E2E Shared Revised.*125,00/ })).toBeVisible()
    await register(b, 'offering-b', 'E2E Shared Revised')
    const c = await participant(browser, contexts, 'offering-c', first)
    await expect(c.getByRole('radio', { name: /E2E Shared Revised.*125,00/ })).toBeVisible()
    await register(c, 'offering-c', 'E2E Shared Revised')
    await a.reload()
    const old = a.getByRole('region', { name: 'Sua inscrição' })
    await expect(old).toContainText('E2E Shared 85')
    await expect(old).toContainText('Benefícios originais')
    await expect(a.getByRole('region', { name: 'Pagamento da inscrição' })).toContainText('R$ 100,00')

    await staff.goto(`/staff/tournaments/${first}/athletes`)
    await expect(staff.getByText(/Inscrições totais: 2/).locator('..')).toContainText('Confirmadas: 0 · Capacidade: 5')
    await expect(staff.getByRole('row').filter({ hasText: oldNumber })).toContainText('E2E Shared 85')
    await expect(staff.getByRole('row').filter({ hasText: 'Fixture offering-c' })).toContainText('E2E Shared Revised')
    const search = staff.getByLabel('Buscar por nome ou número da inscrição')
    await search.fill(oldNumber)
    await expect(staff.getByRole('row').filter({ hasText: oldNumber })).toBeVisible()
    await expect(staff.getByText(/Inscrições totais: 2/)).toBeVisible()
    await search.fill('no match')
    await expect(staff.getByText('Nenhum atleta encontrado para esta busca.')).toBeVisible()
    await expect(staff.getByText(/Inscrições totais: 2/)).toBeVisible()

    await staff.goto(`/staff/tournaments/${second}`)
    const product = staff.locator('article').filter({ has: staff.getByRole('heading', { name: /E2E Shared Revised/ }) })
    await product.getByRole('button', { name: 'Desativar' }).click()
    await expect(product.getByRole('region', { name: 'Confirmar alteração compartilhada' })).toContainText('E2E Offerings First')
    await expect(product.getByRole('region', { name: 'Confirmar alteração compartilhada' })).toContainText('E2E Offerings Second')
    await product.getByRole('button', { name: 'Confirmar alteração' }).click()
    await expect(product.getByRole('heading', { level: 3 })).toContainText('Inativo')
    for (const [account, event] of [['offering-d', first], ['offering-e', second]] as const) {
      const page = await participant(browser, contexts, account, event)
      await expect(page.getByRole('radio', { name: /E2E Shared Revised/ })).toHaveCount(0)
    }
    await a.reload()
    await expect(old).toContainText('E2E Shared 85')
    await expect(old).toContainText('Benefícios originais')
    await expect(a.getByRole('region', { name: 'Pagamento da inscrição' })).toContainText('R$ 100,00')
  } finally {
    await Promise.all(contexts.map(context => context.close()))
  }
})
