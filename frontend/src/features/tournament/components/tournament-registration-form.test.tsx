import { acceptanceEvidence } from "@/testing/acceptance-evidence";
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { Session } from '@supabase/supabase-js'
import TournamentRegistrationForm from '@/features/tournament/components/tournament-registration-form'
import type { Tournament } from '@/features/tournament/api/tournaments'

const tournament: Tournament = {
  id: 42,
  name: 'Monomachia Karlbrüder 2027',
  slug: 'monomachia-2027',
  discipline: 'longsword',
  starts_at: '2027-01-17T12:00:00Z',
  location: null,
  registration_fee_amount: null,
  registration_opens_on: '2026-11-01',
  registration_closes_on: '2026-12-31',
  is_registration_closed: false,
  rules_text: null,
  rules_url: 'https://example.test/rules_text',
  ...acceptanceEvidence,
  rules_version: 'draft-rules_text-v1',
  terms_version: 'draft-terms-v1',
  cancellation_policy_text: 'Policy fixture',
  cancellation_policy_url: null,
  equipment_requirements: null,
}

const session = {
  access_token: 'test-access-token',
  user: { id: 'athlete-uuid', email: 'athlete@example.test' },
} as Session

const created = {
  registration_number: 'T42-000001-5',
  registration_status: 'awaiting_payment',
  full_name: 'Ana Teste',
  email: 'athlete@example.test',
  tournament_id: 42,
}

function change(label: RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

function fillRequired({ declarations = true, image = 'no', birthDate = '2000-01-01' }: {
  declarations?: boolean
  image?: 'yes' | 'no' | null
  birthDate?: string
} = {}) {
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
  if (image) fireEvent.click(screen.getByRole('radio', { name: image === 'no' ? /Não autorizo/ : /^Autorizo/ }))
}

function fillRequiredEnglish() {
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
  fireEvent.click(screen.getByRole('radio', { name: /I do not authorize/ }))
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
})

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('Athlete submits their own registration and sees the result', () => {
  it('shows English draft controls and submits the same API values with image refusal', async () => {
    const request = vi.fn().mockResolvedValue(response(201, created))
    vi.stubGlobal('fetch', request)
    render(<TournamentRegistrationForm tournament={tournament} session={session} language="en" />)
    expect(screen.getByText(/not ready for real registrations/)).toBeInTheDocument()
    expect(screen.getAllByRole('checkbox')).toHaveLength(7)
    fillRequiredEnglish()
    fireEvent.submit(screen.getByRole('form', { name: 'Registration form' }))
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1))
    const [, options] = request.mock.calls[0]
    const payload = JSON.parse(options.body as string)
    expect(payload.acceptance_token).toBe(acceptanceEvidence.acceptance_tokens.en)
    expect(payload.acceptance_language).toBe("en")
    expect(payload.authorizes_image_use).toBe(false)
    expect(payload.accepts_rules).toBe(true)
    expect(payload.accepts_data_processing).toBe(true)
    expect(payload.full_name).toBe('Fixture Athlete')
    expect(payload.identity_document_type).toBe('passport')
    expect(await screen.findByText('T42-000001-5')).toBeInTheDocument()
    expect(screen.getByText('Awaiting payment')).toBeInTheDocument()
    expect(screen.getByText(/not yet confirmed or reserved/)).toBeInTheDocument()
  })

  it('shows English validation without sending or preaccepting declarations', () => {
    const request = vi.fn()
    vi.stubGlobal('fetch', request)
    render(<TournamentRegistrationForm tournament={tournament} session={session} language="en" />)
    fireEvent.submit(screen.getByRole('form', { name: 'Registration form' }))
    expect(request).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('Review the highlighted fields')
    expect(screen.getAllByText('This declaration is required.')).toHaveLength(7)
    expect(screen.getByText('Choose whether to authorize image use.')).toBeInTheDocument()
  })

  it.each([
    [400, 'Registration is closed', 'Registration is closed.'],
    [400, 'Registration terms are not configured', 'Tournament terms have not been configured'],
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
    render(<TournamentRegistrationForm tournament={tournament} session={session} language="en" />)
    fillRequiredEnglish()
    fireEvent.submit(screen.getByRole('form', { name: 'Registration form' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(expected)
    expect(screen.getByRole('textbox', { name: /Full name/ })).toHaveValue('Fixture Athlete')
  })
  it('posts only the fields the athlete fills, with the account token, and image refusal stays a separate choice', async () => {
    const request = vi.fn().mockResolvedValue(response(201, created))
    vi.stubGlobal('fetch', request)
    render(<TournamentRegistrationForm tournament={tournament} session={session} />)
    fillRequired()
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
    expect(url).toBe('/api/tournaments/42/registrations')
    expect(options.method).toBe('POST')
    expect(options.headers).toEqual({
      Authorization: 'Bearer test-access-token',
      'Content-Type': 'application/json',
    })
    expect(JSON.parse(options.body as string)).toEqual({
      acceptance_token: acceptanceEvidence.acceptance_tokens.pt,
      acceptance_language: 'pt',
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
      authorizes_image_use: false,
    })
    expect(await screen.findByText(created.registration_number)).toBeInTheDocument()
    expect(screen.getByText('Aguardando pagamento')).toBeInTheDocument()
    expect(screen.getByText(/vaga ainda não está confirmada nem reservada/)).toBeInTheDocument()
  })

  it('requires every declaration and an explicit image choice before sending', () => {
    const request = vi.fn()
    vi.stubGlobal('fetch', request)
    render(<TournamentRegistrationForm tournament={tournament} session={session} />)
    fillRequired({ declarations: false, image: null })
    submit()
    expect(request).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('Revise os campos indicados')
    expect(screen.getAllByText('Esta declaração é obrigatória.')).toHaveLength(7)
    expect(screen.getByText('Escolha autorizar ou não autorizar.')).toBeInTheDocument()
    expect(screen.getByLabelText(/Nome completo/)).toHaveValue(' Ana Teste ')
  })

  it('accepts start year instead of duration, while requiring a nonnegative tournament count', async () => {
    const request = vi.fn().mockResolvedValue(response(201, created))
    vi.stubGlobal('fetch', request)
    render(<TournamentRegistrationForm tournament={tournament} session={session} />)
    fillRequired({ image: 'yes' })
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
    expect(payload.authorizes_image_use).toBe(true)
  })

  it('sends only once while a request is pending', async () => {
    let finish: ((value: ReturnType<typeof response>) => void) | undefined
    const request = vi.fn().mockImplementation(() => new Promise(resolve => { finish = resolve }))
    vi.stubGlobal('fetch', request)
    render(<TournamentRegistrationForm tournament={tournament} session={session} />)
    fillRequired()
    submit()
    submit()
    expect(request).toHaveBeenCalledTimes(1)
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
    render(<TournamentRegistrationForm tournament={tournament} session={session} />)
    fillRequired()
    submit()
    expect(await screen.findByRole('alert')).toHaveTextContent(expected)
    expect(screen.getByLabelText(/Nome completo/)).toHaveValue(' Ana Teste ')
    expect(screen.getByRole('form', { name: 'Formulário de inscrição' })).toBeInTheDocument()
  })

  it('handles a network failure without claiming success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('connection failed')))
    render(<TournamentRegistrationForm tournament={tournament} session={session} />)
    fillRequired()
    submit()
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível enviar a inscrição agora.')
    expect(screen.queryByText(created.registration_number)).not.toBeInTheDocument()
  })

  it('does not show the parental consent form field for an adult birth date', () => {
    vi.stubGlobal('fetch', vi.fn())
    render(<TournamentRegistrationForm tournament={tournament} session={session} />)
    fillRequired()
    expect(screen.queryByLabelText(/Termo de responsabilidade assinado/)).not.toBeInTheDocument()
  })

  it('shows the parental consent form field for a minor and blocks submit without a file', () => {
    const request = vi.fn()
    vi.stubGlobal('fetch', request)
    render(<TournamentRegistrationForm tournament={tournament} session={session} />)
    fillRequired({ birthDate: '2010-06-01' })
    expect(screen.getByLabelText(/Termo de responsabilidade assinado/)).toBeInTheDocument()
    submit()
    expect(request).not.toHaveBeenCalled()
    expect(screen.getByText(/Envie o termo de responsabilidade assinado/)).toBeInTheDocument()
  })

  it('presigns, uploads, and creates registration with storage key fields for a minor', async () => {
    const request = mockPresignedRegistrationFlow()
    vi.stubGlobal('fetch', request)
    render(<TournamentRegistrationForm tournament={tournament} session={session} />)
    fillRequired({ birthDate: '2010-06-01' })
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
    render(<TournamentRegistrationForm tournament={tournament} session={session} />)
    fillRequired({ birthDate: '2010-06-01' })
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
    render(<TournamentRegistrationForm tournament={tournament} session={session} />)
    fillRequired({ birthDate: '2010-06-01' })
    attachParentalConsentForm(pdfFile())
    submit()
    expect(await screen.findByRole('alert')).toHaveTextContent(/servidor recusou o termo de responsabilidade/)
    expect(screen.getByRole('form', { name: 'Formulário de inscrição' })).toBeInTheDocument()
  })

  it.each(['pt', 'en'] as const)('renders separate policy text and URL in %s without turning text into a link', (language) => {
    render(<TournamentRegistrationForm tournament={{ ...tournament, rules_text: 'Fixture rules text', rules_url: 'https://example.test/rules', cancellation_policy_text: null, cancellation_policy_url: null, cancellation_policy_archive_url: null }} session={session} language={language} />)
    expect(screen.getByText('Fixture rules text')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Consultar regulamento|View tournament rules/ })).toHaveAttribute('href', acceptanceEvidence.rules_archive_url)
    expect(screen.getByText(/conteúdo ainda não configurado|content has not been configured/i)).toBeInTheDocument()
  })

  it('renders URL-like policy text as text when no policy URL is configured', () => {
    render(<TournamentRegistrationForm tournament={{ ...tournament, rules_text: 'https://example.test/plain-text', rules_url: null, rules_archive_url: null }} session={session} />)
    expect(screen.getByText('https://example.test/plain-text')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Consultar regulamento/ })).not.toBeInTheDocument()
  })


  it('labels the minor document as a parental consent form in English', () => {
    render(<TournamentRegistrationForm tournament={tournament} session={session} language="en" />)
    fireEvent.change(screen.getByLabelText(/Date of birth/), { target: { value: '2010-06-01' } })
    expect(screen.getByLabelText(/Signed parental consent form/)).toBeInTheDocument()
  })

})


it('refreshes changed terms, preserves personal fields and requires new choices before resubmission', async () => {
  const updated = {
    ...tournament,
    acceptance_tokens: { ...tournament.acceptance_tokens, pt: 'c'.repeat(64) },
    acceptance_content: {
      ...tournament.acceptance_content,
      pt: { declarations: { ...tournament.acceptance_content.pt.declarations, accepts_rules: 'Updated rules choice' } },
    },
    rules_text: 'Updated official rules',
  }
  const request = vi.fn()
    .mockResolvedValueOnce(response(409, { detail: 'Registration terms changed; refresh before accepting' }))
    .mockResolvedValueOnce(response(200, updated))
    .mockResolvedValueOnce(response(201, created))
  vi.stubGlobal('fetch', request)
  render(<TournamentRegistrationForm tournament={tournament} session={session} />)
  fillRequired()
  submit()
  expect(await screen.findByText('Updated official rules')).toBeInTheDocument()
  expect(await screen.findByRole('alert')).toHaveTextContent(/Os termos mudaram/)
  expect(screen.getByLabelText(/Nome completo/)).toHaveValue(' Ana Teste ')
  expect(screen.getByLabelText(/Updated rules choice/)).toBeInTheDocument()
  expect(screen.getAllByRole('checkbox').every(input => !(input as HTMLInputElement).checked)).toBe(true)
  expect(screen.getAllByRole('radio').every(input => !(input as HTMLInputElement).checked)).toBe(true)
  for (const checkbox of screen.getAllByRole('checkbox')) fireEvent.click(checkbox)
  fireEvent.click(screen.getByRole('radio', { name: /Não autorizo/ }))
  submit()
  expect(await screen.findByText(created.registration_number)).toBeInTheDocument()
  expect(JSON.parse(request.mock.calls[2][1].body).acceptance_token).toBe('c'.repeat(64))
  expect(request.mock.calls[1][0]).toBe('/api/tournaments/42')
})
