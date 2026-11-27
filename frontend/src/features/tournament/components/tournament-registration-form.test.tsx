vi.mock("@/features/tournament/api/tournament-tags", async (original) => ({ ...await original<typeof import("@/features/tournament/api/tournament-tags")>(), getTags: vi.fn(), getSelection: async () => [] }));
vi.mock("@/lib/supabase-client", () => ({ supabase: { auth: { getSession: vi.fn(async () => ({ data: { session: { access_token: "test-access-token", user: { id: "athlete-uuid" } } }, error: null })) } } }));
import { renderWithQuery as render } from "@/testing/render-with-query";
import { acceptanceEvidence } from "@/testing/acceptance-evidence";
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import type { Session } from '@supabase/supabase-js'
import TournamentRegistrationForm from '@/features/tournament/components/tournament-registration-form'
import type { Tournament } from '@/features/tournament/api/tournaments'
import { getTournamentProducts } from '@/features/tournament/api/tournaments'
import { getTags } from '@/features/tournament/api/tournament-tags'

vi.mock('@/features/tournament/api/tournaments', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/features/tournament/api/tournaments')>(),
  getTournamentProducts: vi.fn(),
}))

const product = { id: 1, product_id: 2, name: 'Inscrição Plena', description: 'Participação', price_id: 3, amount: '100.00', currency: 'BRL' }


const tournament: Tournament = {
  id: 42,
  name: 'Monomachia Karlbrüder 2027',
  slug: 'monomachia-2027',
  discipline: 'longsword',
  starts_at: '2027-01-17T12:00:00Z',
  location: null,
  registration_opens_on: '2026-11-01',
  registration_closes_on: '2026-12-31',
  is_registration_closed: false,
  ...acceptanceEvidence,
  equipment_requirements: null,
}

const session = {
  access_token: 'test-access-token',
  user: { id: 'athlete-uuid', email: 'athlete@example.test' },
} as Session

const policies = {
  rules: { document: { version_id: 17, original_file_name: 'rules-v1.pdf', content_type: 'application/pdf' } },
  cancellation_policy: { document: { version_id: 52, original_file_name: 'cancellation.pdf', content_type: 'image/png' } },
}
const tournamentWithPolicies = {
  ...tournament,
  acceptance_content: {
    pt: { ...tournament.acceptance_content.pt, policies },
    en: { ...tournament.acceptance_content.en, policies },
  },
}

const created = {
  registration_number: 'T42-000001-5',
  registration_status: 'awaiting_payment',
  full_name: 'Ana Teste',
  email: 'athlete@example.test',
  tournament_id: 42,
  product_name: 'Inscrição Plena',
  product_description: 'Benefícios adquiridos',
}

function change(label: RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label, { selector: "input, select, textarea" }), { target: { value } })
}

async function fillRequired({ declarations = true, birthDate = '2000-01-01' }: {
  declarations?: boolean
  birthDate?: string
} = {}) {
  fireEvent.click(await screen.findByRole('radio', { name: /Inscrição Plena/ }))
  change(/Nome completo/, ' Ana Teste ')
  change(/Data de nascimento/, birthDate)
  change(/^Documento/, 'passport')
  change(/Número do documento/, ' AB-123 ')
  change(/^Telefone \*/, '+55 11 0000-0000')
  change(/^País/, ' Brasil ')
  change(/^Cidade/, ' São Carlos ')
  change(/Tempo de prática em HEMA/, '2 anos')
  change(/Torneios anteriores/, '0')
  change(/Contato de emergência/, 'Contato Teste')
  change(/Telefone de emergência/, '+55 11 0000-0001')
  if (declarations) {
    for (const checkbox of screen.getAllByRole('checkbox')) fireEvent.click(checkbox)
  }
}

async function fillRequiredEnglish() {
  fireEvent.click(await screen.findByRole('radio', { name: /Inscrição Plena/ }))
  change(/Full name/, 'Fixture Athlete')
  change(/Date of birth/, '2000-01-01')
  change(/^Identity document/, 'passport')
  change(/Document number/, 'TEST-123')
  change(/^Phone number/, '000000000')
  change(/^Country/, 'Brazil')
  change(/^City/, 'São Paulo')
  change(/HEMA practice duration/, '2 years')
  change(/Previous tournaments/, '0')
  change(/^Emergency contact \*/, 'Fixture Contact')
  change(/Emergency contact phone/, '000000001')
  for (const checkbox of screen.getAllByRole('checkbox')) fireEvent.click(checkbox)
}

function submit() {
  fireEvent.submit(screen.getByRole('form', { name: 'Formulário de inscrição' }))
}

function response(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

function pdfFile(name = 'term.pdf') {
  const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])
  const file = new File([bytes], name, { type: 'application/pdf' })
  Object.defineProperty(file, 'arrayBuffer', {
    configurable: true,
    value: () => Promise.resolve(bytes.slice().buffer),
  })
  return file
}

function mockPresignedRegistrationFlow(createStatus = 201, createBody: unknown = created) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (url.includes('/parental-consent-form/upload-url')) {
      return response(200, {
        storage_key: 'tournaments/42/staging/user/parental_consent_form/staged',
        upload_url: 'https://upload.example.test/put',
        expires_in_seconds: 900,
        required_headers: { 'Content-Type': 'application/pdf' },
      })
    }
    if (init?.method === 'PUT') return { ok: true, status: 200 }
    if (url.endsWith('/registrations') && init?.method === 'POST') {
      return response(createStatus, createBody)
    }
    return response(404, { detail: 'unexpected' })
  })
}

function attachParentalConsentForm(file: File) {
  const input = screen.getByLabelText(/Termo de responsabilidade assinado/) as HTMLInputElement
  Object.defineProperty(input, 'files', { configurable: true, value: [file] })
  fireEvent.change(input, { target: { files: [file] } })
}

beforeEach(() => {
  vi.stubEnv('VITE_API_BASE_URL', '/api')
  vi.mocked(getTournamentProducts).mockResolvedValue([product])
  vi.mocked(getTags).mockResolvedValue([])
})

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('Athlete submits their own registration and sees the result', () => {
  it('includes the selected tournament tags in the registration request', async () => {
    vi.mocked(getTags).mockResolvedValue([{ id: 3, tournament_id: 42, name: 'Mystai', eligibility_description: 'Primeira competição' }])
    const request = mockPresignedRegistrationFlow()
    vi.stubGlobal('fetch', request)
    render(<TournamentRegistrationForm tournament={tournament} user={session.user} />)
    await screen.findByRole('checkbox', { name: /Mystai Primeira competição/ })
    await fillRequired()
    submit()
    await waitFor(() => expect(request).toHaveBeenCalled())
    const registration = request.mock.calls.find(([url, init]) => String(url).endsWith('/registrations') && init?.method === 'POST')
    expect(JSON.parse(String(registration?.[1]?.body)).tag_ids).toEqual([3])
  })
  it('renders the server-provided English declaration and submits its token without an image choice', async () => {
    const request = vi.fn().mockResolvedValue(response(201, created))
    vi.stubGlobal('fetch', request)
    render(<TournamentRegistrationForm tournament={tournament} user={session.user} language="en" />)
    expect(screen.getByRole('checkbox', { name: 'Sample rules declaration *' })).toBeInTheDocument()
    expect(screen.getAllByRole('checkbox')).toHaveLength(7)
    expect(screen.getAllByRole("checkbox").map(checkbox => checkbox.getAttribute("name"))).toEqual([
      "accepts_rules", "accepts_cancellation_policy", "accepts_data_processing",
      "declares_truthful_information", "acknowledges_inherent_risks",
      "declares_has_required_equipment", "declares_physically_fit",
    ])
    await fillRequiredEnglish()
    fireEvent.submit(screen.getByRole('form', { name: 'Registration form' }))
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1))
    const [, options] = request.mock.calls[0]
    const payload = JSON.parse(options.body as string)
    expect(payload.acceptance_token).toBe(acceptanceEvidence.acceptance_tokens.en)
    expect(payload.acceptance_language).toBe("en")
    expect(payload).not.toHaveProperty("authorizes_image_use")
    expect(screen.queryByRole("radio", { name: /authorize.*image/i })).not.toBeInTheDocument()
    expect(payload.accepts_rules).toBe(true)
    expect(payload.accepts_data_processing).toBe(true)
    expect(payload.full_name).toBe('Fixture Athlete')
    expect(payload.identity_document_type).toBe('passport')
    expect(await screen.findByText('T42-000001-5')).toBeInTheDocument()
    expect(screen.getByText('Benefícios adquiridos')).toBeInTheDocument()
    expect(screen.getByText('Awaiting payment')).toBeInTheDocument()
    expect(screen.getByText(/not yet confirmed or reserved/)).toBeInTheDocument()
  })

  it('shows English validation without sending or preaccepting declarations', () => {
    const request = vi.fn()
    vi.stubGlobal('fetch', request)
    render(<TournamentRegistrationForm tournament={tournament} user={session.user} language="en" />)
    fireEvent.submit(screen.getByRole('form', { name: 'Registration form' }))
    expect(request).not.toHaveBeenCalled()
    expect(screen.getByText('Review the highlighted fields before submitting.')).toBeInTheDocument()
    expect(screen.getByText('Select an available registration type.')).toBeInTheDocument()
    expect(screen.getAllByText('This declaration is required.')).toHaveLength(7)
  })

  it.each([
    [400, 'Registration is closed', 'Registration is closed.'],
    [400, 'Registration email must match account email', 'The registration email must match'],
    [400, 'Other reason', 'We could not accept the registration'],
    [409, 'Registration already exists', 'An active registration already exists'],
    [409, 'Other conflict', 'We could not create the registration because of a conflict'],
    [422, null, 'The server rejected'],
    [401, null, 'Your session expired.'],
    [503, null, 'We could not submit the registration now.'],
  ])('shows HTTP %i in English and retains entered fields', async (status, detail, expected) => {
    const request = vi.fn().mockResolvedValue(response(status, { detail }))
    vi.stubGlobal('fetch', request)
    render(<TournamentRegistrationForm tournament={tournament} user={session.user} language="en" />)
    await fillRequiredEnglish()
    fireEvent.submit(screen.getByRole('form', { name: 'Registration form' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(expected)
    expect(screen.getByRole('textbox', { name: /Full name/ })).toHaveValue('Fixture Athlete')
  })
  it('posts only the fields the athlete fills, with the account token', async () => {
    const request = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).endsWith('/products')) return response(200, [{ id: 1, product_id: 2, name: 'Inscrição Plena', description: 'Participação', price_id: 3, amount: '100.00', currency: 'BRL' }])
      return response(init?.method === 'POST' ? 201 : 404, created)
    })
    vi.stubGlobal('fetch', request)
    render(<TournamentRegistrationForm tournament={tournament} user={session.user} />)
    await fillRequired()
    change(/Nome social/, ' Ana ')
    change(/Estado \/ província/, 'SP')
    change(/Escola \/ equipe/, ' Escola Teste ')
    change(/Instrutor responsável/, ' Instrutor Teste ')
    change(/Referência HEMA Ratings/, ' profile-123 ')
    change(/Lateralidade/, 'left')
    change(/Categoria \/ caso especial/, ' Categoria iniciante ')
    submit()

    await waitFor(() => expect(request).toHaveBeenCalledTimes(1))
    const [url, options] = request.mock.calls[0]
    if (!options) throw new Error('Missing registration request options')
    expect(url).toBe('/api/tournaments/42/registrations')
    expect(options.method).toBe('POST')
    expect((options.headers as Headers).get('Authorization')).toBe('Bearer test-access-token')
    expect((options.headers as Headers).get('Content-Type')).toBe('application/json')
    expect(JSON.parse(options.body as string)).toEqual({
      tag_ids: [],
      acceptance_token: acceptanceEvidence.acceptance_tokens.pt,
      acceptance_language: 'pt',
      tournament_product_id: 1, price_id: 3,
      full_name: 'Ana Teste', social_name: 'Ana', birth_date: '2000-01-01',
      identity_document_type: 'passport', identity_document_number: 'AB-123', email: 'athlete@example.test',
      phone: '+55 11 0000-0000', city: 'São Carlos', state_or_province: 'SP', country: 'Brasil',
      school_or_team_name: 'Escola Teste', instructor_name: 'Instrutor Teste',
      hema_experience_description: '2 anos', hema_started_year: null,
      previous_tournament_count: 0, hema_ratings_reference: 'profile-123', handedness: 'left',
      category_or_eligibility_note: 'Categoria iniciante', emergency_contact_name: 'Contato Teste',
      emergency_contact_phone: '+55 11 0000-0001',
      declares_truthful_information: true, declares_has_required_equipment: true,
      declares_physically_fit: true, accepts_rules: true, accepts_data_processing: true,
      acknowledges_inherent_risks: true, accepts_cancellation_policy: true,
    })
    expect(await screen.findByText(created.registration_number)).toBeInTheDocument()
    expect(screen.getByText('Aguardando pagamento')).toBeInTheDocument()
    expect(screen.getByText(/vaga ainda não está confirmada nem reservada/)).toBeInTheDocument()
  })

  it('refreshes a stale price while preserving the form and consent file until the athlete selects again', async () => {
    vi.mocked(getTournamentProducts).mockResolvedValueOnce([product]).mockResolvedValueOnce([{ ...product, price_id: 9, amount: '125.00' }])
    let submissions = 0
    const request = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.includes('/parental-consent-form/upload-url')) return response(200, { storage_key: 'staged', upload_url: 'https://upload.example.test/put', expires_in_seconds: 900, required_headers: {} })
      if (init?.method === 'PUT') return response(200, {})
      if (url.endsWith('/registrations') && init?.method === 'POST') return ++submissions === 1 ? response(400, { detail: 'Registration option is unavailable' }) : response(201, created)
      return response(404, {})
    })
    vi.stubGlobal('fetch', request)
    render(<TournamentRegistrationForm tournament={tournament} user={session.user} />)
    await fillRequired({ birthDate: '2010-06-01' })
    const file = pdfFile()
    attachParentalConsentForm(file)
    submit()
    expect(await screen.findByText(/Confira os valores atualizados/)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('radio', { name: /125,00/ })).not.toBeChecked())
    expect(screen.getByLabelText(/Nome completo/)).toHaveValue(' Ana Teste ')
    expect((screen.getByLabelText(/Termo de responsabilidade assinado/) as HTMLInputElement).files?.[0]).toBe(file)
    submit()
    expect(submissions).toBe(1)
    fireEvent.click(screen.getByRole('radio', { name: /125,00/ }))
    submit()
    expect(await screen.findByText(created.registration_number)).toBeInTheDocument()
    const posts = request.mock.calls.filter(([url, init]) => String(url).endsWith('/registrations') && init?.method === 'POST')
    expect(JSON.parse(String(posts[1][1]?.body)).price_id).toBe(9)
  })

  it('retries loading changed options without restoring the stale selection', async () => {
    vi.mocked(getTournamentProducts).mockResolvedValueOnce([product]).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([])
    vi.stubGlobal('fetch', mockPresignedRegistrationFlow(400, { detail: 'Registration option is unavailable' }))
    render(<TournamentRegistrationForm tournament={tournament} user={session.user} />)
    await fillRequired()
    submit()
    expect(await screen.findByText(/Não foi possível carregar as opções/)).toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: /Inscrição Plena/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByText('Nenhum tipo de inscrição está disponível ainda.')).toBeInTheDocument()
    expect(screen.getByLabelText(/Nome completo/)).toHaveValue(' Ana Teste ')
  })

  it('displays an unpriced option without allowing it to be selected', async () => {
    vi.mocked(getTournamentProducts).mockResolvedValue([
      { id: 1, product_id: 2, name: 'Inscrição Plus', description: 'Pacote', price_id: null, amount: null, currency: null },
    ])
    render(<TournamentRegistrationForm tournament={tournament} user={session.user} />)
    const option = await screen.findByRole('radio', { name: /Inscrição Plus/ })
    expect(option).toBeDisabled()
    expect(option).toHaveAccessibleName(/Valor ainda não disponível/)
  })

  it('requires every declaration before sending', async () => {
    const request = vi.fn()
    vi.stubGlobal('fetch', request)
    render(<TournamentRegistrationForm tournament={tournament} user={session.user} />)
    await fillRequired({ declarations: false })
    submit()
    expect(request).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('Revise os campos indicados')
    expect(screen.getAllByText('Esta declaração é obrigatória.')).toHaveLength(7)
    expect(screen.getByLabelText(/Nome completo/)).toHaveValue(' Ana Teste ')
  })

  it('accepts start year instead of duration, while requiring a nonnegative tournament count', async () => {
    const request = vi.fn().mockResolvedValue(response(201, created))
    vi.stubGlobal('fetch', request)
    render(<TournamentRegistrationForm tournament={tournament} user={session.user} />)
    await fillRequired()
    change(/Tempo de prática em HEMA/, '')
    change(/Torneios anteriores/, '-1')
    submit()
    expect(request).not.toHaveBeenCalled()
    expect(screen.getByText('Informe o tempo de prática ou o ano de início.')).toBeInTheDocument()
    expect(screen.getByText('Informe zero ou um número inteiro positivo.')).toBeInTheDocument()

    change(/Ano de início em HEMA/, '2022')
    change(/Torneios anteriores/, '0')
    submit()
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1))
    const [, options] = request.mock.calls[0]
    const payload = JSON.parse(options.body as string)
    expect(payload.hema_experience_description).toBeNull()
    expect(payload.hema_started_year).toBe(2022)
  })

  it('sends only once while a request is pending', async () => {
    let finish: ((value: ReturnType<typeof response>) => void) | undefined
    const request = vi.fn().mockImplementation(() => new Promise(resolve => { finish = resolve }))
    vi.stubGlobal('fetch', request)
    render(<TournamentRegistrationForm tournament={tournament} user={session.user} />)
    await fillRequired()
    submit()
    submit()
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('button', { name: 'Enviando inscrição...' })).toBeDisabled()
    finish?.(response(201, created))
    expect(await screen.findByText(created.registration_number)).toBeInTheDocument()
  })

  it.each([
    [400, 'Registration is closed', 'As inscrições estão encerradas.'],
    [409, 'Registration already exists', 'Já existe uma inscrição ativa'],
    [422, null, 'O servidor recusou um ou mais campos'],
    [401, null, 'Sua sessão expirou.'],
    [503, null, 'Não foi possível enviar a inscrição agora.'],
  ])('shows HTTP %i clearly and keeps the entered fields', async (status, detail, expected) => {
    const request = vi.fn().mockResolvedValue(response(status, { detail }))
    vi.stubGlobal('fetch', request)
    render(<TournamentRegistrationForm tournament={tournament} user={session.user} />)
    await fillRequired()
    submit()
    expect(await screen.findByRole('alert')).toHaveTextContent(expected)
    expect(screen.getByLabelText(/Nome completo/)).toHaveValue(' Ana Teste ')
    expect(screen.getByRole('form', { name: 'Formulário de inscrição' })).toBeInTheDocument()
  })

  it('handles a network failure without claiming success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('connection failed')))
    render(<TournamentRegistrationForm tournament={tournament} user={session.user} />)
    await fillRequired()
    submit()
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível enviar a inscrição agora.')
    expect(screen.queryByText(created.registration_number)).not.toBeInTheDocument()
  })

  it('does not show the parental consent form field for an adult birth date', async () => {
    vi.stubGlobal('fetch', vi.fn())
    render(<TournamentRegistrationForm tournament={tournament} user={session.user} />)
    await fillRequired()
    expect(screen.queryByLabelText(/Termo de responsabilidade assinado/)).not.toBeInTheDocument()
  })

  it('shows the parental consent form field for a minor and blocks submit without a file', async () => {
    const request = vi.fn()
    vi.stubGlobal('fetch', request)
    render(<TournamentRegistrationForm tournament={tournament} user={session.user} />)
    await fillRequired({ birthDate: '2010-06-01' })
    expect(screen.getByLabelText(/Termo de responsabilidade assinado/)).toBeInTheDocument()
    submit()
    expect(request).not.toHaveBeenCalled()
    expect(screen.getByText(/Envie o termo de responsabilidade assinado/)).toBeInTheDocument()
  })

  it('presigns, uploads, and creates registration with storage key fields for a minor', async () => {
    const request = mockPresignedRegistrationFlow()
    vi.stubGlobal('fetch', request)
    render(<TournamentRegistrationForm tournament={tournament} user={session.user} />)
    await fillRequired({ birthDate: '2010-06-01' })
    attachParentalConsentForm(pdfFile())
    submit()
    await waitFor(() => expect(request).toHaveBeenCalledTimes(3))
    const createCall = request.mock.calls.find(
      ([url, options]) => String(url).endsWith('/registrations') && options?.method === 'POST',
    )
    expect(createCall).toBeDefined()
    const payload = JSON.parse(createCall![1]!.body as string)
    expect(payload.parental_consent_form_storage_key).toContain('parental_consent_form')
    expect(payload.parental_consent_form_original_file_name).toBe('term.pdf')
    expect(await screen.findByText(created.registration_number)).toBeInTheDocument()
  })

  it('rejects a disallowed file type before calling the API', async () => {
    const request = vi.fn()
    vi.stubGlobal('fetch', request)
    render(<TournamentRegistrationForm tournament={tournament} user={session.user} />)
    await fillRequired({ birthDate: '2010-06-01' })
    const bytes = new Uint8Array([0x3c, 0x68, 0x74, 0x6d, 0x6c])
    const htmlAsPdf = new File([bytes], 'term.pdf', { type: 'application/pdf' })
    Object.defineProperty(htmlAsPdf, 'arrayBuffer', {
      configurable: true,
      value: () => Promise.resolve(bytes.slice().buffer),
    })
    attachParentalConsentForm(htmlAsPdf)
    submit()
    await waitFor(() => expect(screen.getByText(/PDF, JPEG ou PNG/)).toBeInTheDocument())
    expect(request).not.toHaveBeenCalled()
  })

  it('maps a backend parental consent form type rejection after upload', async () => {
    const request = mockPresignedRegistrationFlow(415, { detail: 'Parental consent form file type is not allowed' })
    vi.stubGlobal('fetch', request)
    render(<TournamentRegistrationForm tournament={tournament} user={session.user} />)
    await fillRequired({ birthDate: '2010-06-01' })
    attachParentalConsentForm(pdfFile())
    submit()
    expect(await screen.findByRole('alert')).toHaveTextContent(/servidor recusou o termo de responsabilidade/)
    expect(screen.getByRole('form', { name: 'Formulário de inscrição' })).toBeInTheDocument()
  })

  it.each(['pt', 'en'] as const)('shows the document card and one missing policy in %s', (language) => {
    const partial = { ...tournamentWithPolicies, acceptance_content: {
      ...tournamentWithPolicies.acceptance_content,
      [language]: { ...tournamentWithPolicies.acceptance_content[language], policies: { ...policies, cancellation_policy: { document: null } } },
    } }
    render(<TournamentRegistrationForm tournament={partial} user={session.user} language={language} />)
    const card = screen.getByRole('region', { name: /Documentos do torneio|Tournament documents/ })
    expect(within(card).getByRole('button', { name: /rules-v1.pdf/ })).toBeInTheDocument()
    expect(within(card).getAllByText(/conteúdo ainda não disponível|content is not yet available/i)).toHaveLength(1)
    const safety = screen.getByRole('region', { name: /Segurança e participação|Safety and participation/ })
    expect(card.nextElementSibling).toBe(safety)
    expect(within(safety).queryByRole('button', { name: /Política de cancelamento|Cancellation policy/ })).not.toBeInTheDocument()
  })

  it('omits the document card and its placeholders when neither policy is available', () => {
    const legacy = { ...tournament, rules_text: 'Legacy rules text', rules_url: 'https://example.test/legacy' }
    render(<TournamentRegistrationForm tournament={legacy} user={session.user} />)
    expect(screen.queryByRole('region', { name: 'Documentos do torneio' })).not.toBeInTheDocument()
    expect(screen.queryByText(/conteúdo ainda não disponível|Legacy rules text/)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Política de Privacidade/ })).toHaveAttribute('target', '_blank')
  })

  it('labels the minor document as a parental consent form in English', () => {
    render(<TournamentRegistrationForm tournament={tournament} user={session.user} language="en" />)
    fireEvent.change(screen.getByLabelText(/Date of birth/), { target: { value: '2010-06-01' } })
    expect(screen.getByLabelText(/Signed parental consent form/)).toBeInTheDocument()
  })

})


it('retries a failed policy file request and opens the exact version without changing form values', async () => {
  const downloadUrl = 'blob:http://localhost/rules-17'
  const firstSignedRules = 'https://files.example.test/rules?signature=first'
  const retrySignedRules = 'https://files.example.test/rules?signature=retry'
  const inlineSignedRules = 'https://files.example.test/rules?signature=inline'
  const signedCancellation = 'https://files.example.test/cancellation?signature=cancel'
  const rulesFile = new Blob(['rules'], { type: 'application/pdf' })
  const cancellationFile = new Blob(['cancellation'], { type: 'image/png' })
  const createObjectURL = vi.fn(() => downloadUrl)
  vi.stubGlobal('URL', class extends URL { static createObjectURL = createObjectURL })
  const request = vi.fn()
    .mockResolvedValueOnce(response(200, { download_url: firstSignedRules }))
    .mockResolvedValueOnce(response(503, {}))
    .mockResolvedValueOnce(response(200, { download_url: retrySignedRules }))
    .mockResolvedValueOnce({ ok: true, blob: async () => rulesFile })
    .mockResolvedValueOnce(response(200, { download_url: inlineSignedRules }))
    .mockResolvedValueOnce({ ok: true, blob: async () => rulesFile })
    .mockResolvedValueOnce(response(200, { download_url: signedCancellation }))
    .mockResolvedValueOnce({ ok: true, blob: async () => cancellationFile })
  const tab = { opener: window, closed: false, location: { replace: vi.fn() }, close: vi.fn() }
  vi.stubGlobal('open', vi.fn(() => tab))
  vi.stubGlobal('fetch', request)
  render(<TournamentRegistrationForm tournament={tournamentWithPolicies} user={session.user} language="en" />)
  const rules = screen.getByRole('button', { name: /Tournament rules · rules-v1.pdf/ })
  const cancellation = screen.getByRole('button', { name: /Cancellation policy · cancellation.pdf/ })
  expect(cancellation).toHaveTextContent('PNG')
  const inline = screen.getByRole('button', { name: 'Tournament rules (opens in a new tab)' })
  const declaration = within(inline.closest('.registration-choice')!).getByRole('checkbox')
  fireEvent.change(screen.getByLabelText(/Full name/), { target: { value: 'Draft name' } })
  expect(request).not.toHaveBeenCalled()

  fireEvent.click(rules)
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not open the document. Please try again.')
  expect(tab.close).toHaveBeenCalledOnce()
  expect(tab.location.replace).not.toHaveBeenCalled()
  expect(tab.opener).toBeNull()
  fireEvent.click(rules)
  await waitFor(() => expect(tab.location.replace).toHaveBeenCalledWith(downloadUrl))
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  fireEvent.click(inline)
  await waitFor(() => expect(tab.location.replace).toHaveBeenCalledTimes(2))
  expect(declaration).not.toBeChecked()
  expect(screen.getByLabelText(/Full name/)).toHaveValue('Draft name')
  fireEvent.click(cancellation)
  await waitFor(() => expect(tab.location.replace).toHaveBeenCalledTimes(3))
  expect(createObjectURL.mock.calls).toEqual([[rulesFile], [rulesFile], [cancellationFile]])
  const authorization = expect.objectContaining({ headers: expect.any(Headers) })
  const storageRequest = expect.objectContaining({ credentials: 'omit' })
  expect(request.mock.calls).toEqual([
    ['/api/tournaments/42/policy-documents/rules/17/download-url', authorization],
    [firstSignedRules, storageRequest],
    ['/api/tournaments/42/policy-documents/rules/17/download-url', authorization],
    [retrySignedRules, storageRequest],
    ['/api/tournaments/42/policy-documents/rules/17/download-url', authorization],
    [inlineSignedRules, storageRequest],
    ['/api/tournaments/42/policy-documents/cancellation_policy/52/download-url', authorization],
    [signedCancellation, storageRequest],
  ])
})

it('keeps the policy control pending until the file body arrives and reports an interrupted download', async () => {
  let interrupt!: (error: Error) => void
  const pendingFile = new Promise<Blob>((_, reject) => { interrupt = reject })
  const tab = { opener: window, location: { replace: vi.fn() }, close: vi.fn() }
  vi.stubGlobal('open', vi.fn(() => tab))
  vi.stubGlobal('fetch', vi.fn()
    .mockResolvedValueOnce(response(200, { download_url: 'https://files.example.test/rules' }))
    .mockResolvedValueOnce({ ok: true, blob: () => pendingFile }))
  render(<TournamentRegistrationForm tournament={tournamentWithPolicies} user={session.user} language="en" />)
  const rules = screen.getByRole('button', { name: /Tournament rules · rules-v1.pdf/ })

  fireEvent.click(rules)
  expect(await screen.findByText('Opening document…')).toBeVisible()
  expect(rules).toHaveAttribute('aria-disabled', 'true')
  expect(tab.location.replace).not.toHaveBeenCalled()
  interrupt(new TypeError('download interrupted'))
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not open the document. Please try again.')
  expect(rules).toHaveAttribute('aria-disabled', 'false')
  expect(tab.close).toHaveBeenCalledOnce()
})

it('opens a custom document from its tile without adding a declaration', async () => {
  const guide = { id: 23, title: "Competitor's Guide", original_file_name: 'guide.pdf', content_type: 'application/pdf' }
  const signedUrl = 'https://files.example.test/guide'
  const objectUrl = 'blob:http://localhost/guide'
  const request = vi.fn()
    .mockResolvedValueOnce(response(200, { download_url: signedUrl }))
    .mockResolvedValueOnce({ ok: true, blob: async () => new Blob(['guide'], { type: 'application/pdf' }) })
  const tab = { opener: window, closed: false, location: { replace: vi.fn() }, close: vi.fn() }
  vi.stubGlobal('URL', class extends URL { static createObjectURL = vi.fn(() => objectUrl) })
  vi.stubGlobal('fetch', request)
  vi.stubGlobal('open', vi.fn(() => tab))
  render(<TournamentRegistrationForm tournament={tournament} user={session.user} language="en" additionalDocuments={[guide]} />)
  const card = screen.getByRole('region', { name: 'Tournament documents' })
  expect(card.nextElementSibling).toContainElement(screen.getByRole('heading', { name: /Safety and participation/ }))
  expect(screen.queryByRole('checkbox', { name: /Competitor's Guide/ })).not.toBeInTheDocument()
  fireEvent.click(within(card).getByRole('button', { name: /Competitor's Guide · guide.pdf/ }))
  await waitFor(() => expect(tab.location.replace).toHaveBeenCalledWith(objectUrl))
  expect(request).toHaveBeenNthCalledWith(1, '/api/tournaments/42/documents/23/download-url', expect.objectContaining({
    headers: expect.any(Headers),
  }))
  expect((request.mock.calls[0][1].headers as Headers).get('Authorization')).toBe('Bearer test-access-token')
  expect(request).toHaveBeenNthCalledWith(2, signedUrl, expect.objectContaining({ credentials: 'omit' }))
})

it('refreshes a replaced policy, preserves personal fields and requires new choices before resubmission', async () => {
  const updated = {
    ...tournamentWithPolicies,
    acceptance_tokens: { ...tournament.acceptance_tokens, pt: 'c'.repeat(64) },
    acceptance_content: {
      ...tournamentWithPolicies.acceptance_content,
      pt: {
        ...tournamentWithPolicies.acceptance_content.pt,
        policies: { ...policies, rules: { document: { version_id: 18, original_file_name: 'rules-v2.pdf', content_type: 'application/pdf' } } },
      },
    },
  }
  const request = vi.fn()
    .mockResolvedValueOnce(response(409, { detail: 'Registration terms changed; refresh before accepting' }))
    .mockResolvedValueOnce(response(200, updated))
    .mockResolvedValueOnce(response(201, created))
  vi.stubGlobal('fetch', request)
  render(<TournamentRegistrationForm tournament={tournamentWithPolicies} user={session.user} />)
  expect(screen.getByRole('button', { name: /rules-v1.pdf/ })).toBeInTheDocument()
  await fillRequired()
  submit()
  expect(await screen.findByRole('button', { name: /rules-v2.pdf/ })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /rules-v1.pdf/ })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: /cancellation.pdf/ })).toBeInTheDocument()
  expect(await screen.findByRole('alert')).toHaveTextContent(/Os termos mudaram/)
  expect(screen.getByLabelText(/Nome completo/)).toHaveValue(' Ana Teste ')
  expect(screen.getAllByRole('checkbox').every(input => !(input as HTMLInputElement).checked)).toBe(true)
  submit()
  expect(request).toHaveBeenCalledTimes(2)
  for (const checkbox of screen.getAllByRole('checkbox')) fireEvent.click(checkbox)
  submit()
  expect(await screen.findByText(created.registration_number)).toBeInTheDocument()
  expect(JSON.parse(request.mock.calls[2][1].body).acceptance_token).toBe('c'.repeat(64))
  expect(request.mock.calls[1][0]).toBe('/api/tournaments/42')
})
