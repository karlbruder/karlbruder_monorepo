import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { Session } from '@supabase/supabase-js'
import SignupForm from './SignupForm'
import type { Tournament } from '../lib/tournaments'

const tournament: Tournament = {
  id: 42,
  name: 'Monomachia Karlbrüder 2027',
  modality: 'longsword',
  starts_at: '2027-01-17T12:00:00Z',
  location: null,
  inscription_fee_amount: null,
  registration_opens_on: '2026-11-01',
  registration_closes_on: '2026-12-31',
  new_registrations_closed: false,
  regulation: 'https://example.test/regulation',
  regulation_version: 'draft-regulation-v1',
  terms_version: 'draft-terms-v1',
  cancellation_policy: 'Policy fixture',
  equipment_requirements: null,
}

const session = {
  access_token: 'test-access-token',
  user: { id: 'athlete-uuid', email: 'athlete@example.test' },
} as Session

const created = {
  inscription_number: 'T42-000001-5',
  status: 'awaiting_payment',
  full_name: 'Ana Teste',
  email: 'athlete@example.test',
  tournament_id: 42,
}

function change(label: RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

function fillRequired({ declarations = true, image = 'no' }: { declarations?: boolean; image?: 'yes' | 'no' | null } = {}) {
  change(/Nome completo/, ' Ana Teste ')
  change(/Data de nascimento/, '2000-01-01')
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

function submit() {
  fireEvent.submit(screen.getByRole('form', { name: 'Formulário de inscrição' }))
}

function response(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
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

describe('WF-04 self-registration and REG-007 result', () => {
  it('posts exactly the #20 participant fields with the Supabase token and independent image refusal', async () => {
    const request = vi.fn().mockResolvedValue(response(201, created))
    vi.stubGlobal('fetch', request)
    render(<SignupForm tournament={tournament} session={session} />)
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
    expect(url).toBe('/api/tournaments/42/signups')
    expect(options.method).toBe('POST')
    expect(options.headers).toEqual({ Authorization: 'Bearer test-access-token', 'Content-Type': 'application/json' })
    expect(JSON.parse(options.body)).toEqual({
      full_name: 'Ana Teste', social_name: 'Ana', birth_date: '2000-01-01',
      document_type: 'passport', document_id: 'AB-123', email: 'athlete@example.test',
      phone: '+55 11 0000-0000', city: 'São Carlos', state: 'SP', country: 'Brasil',
      school_name: 'Escola Teste', responsible_instructor_name: 'Instrutor Teste',
      hema_practice_duration: '2 anos', hema_practice_start_year: null,
      prior_tournaments_count: 0, hema_ratings_ref: 'profile-123', handedness: 'left',
      special_category_note: 'Categoria iniciante', emergency_contact_name: 'Contato Teste',
      emergency_contact_phone: '+55 11 0000-0001',
      declares_truthful_information: true, declares_required_equipment: true,
      declares_physically_fit: true, accepts_regulation: true, accepts_data_processing: true,
      acknowledges_inherent_risks: true, accepts_cancellation_policy: true,
      image_use_authorized: false,
    })
    expect(await screen.findByText(created.inscription_number)).toBeInTheDocument()
    expect(screen.getByText('Aguardando pagamento')).toBeInTheDocument()
    expect(screen.getByText(/vaga ainda não está confirmada nem reservada/)).toBeInTheDocument()
  })

  it('requires every declaration and an explicit image choice before sending', () => {
    const request = vi.fn()
    vi.stubGlobal('fetch', request)
    render(<SignupForm tournament={tournament} session={session} />)
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
    render(<SignupForm tournament={tournament} session={session} />)
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
    const payload = JSON.parse(request.mock.calls[0][1].body)
    expect(payload.hema_practice_duration).toBeNull()
    expect(payload.hema_practice_start_year).toBe(2022)
    expect(payload.image_use_authorized).toBe(true)
  })

  it('sends only once while a request is pending', async () => {
    let finish: ((value: ReturnType<typeof response>) => void) | undefined
    const request = vi.fn().mockImplementation(() => new Promise(resolve => { finish = resolve }))
    vi.stubGlobal('fetch', request)
    render(<SignupForm tournament={tournament} session={session} />)
    fillRequired()
    submit()
    submit()
    expect(request).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Enviando inscrição...' })).toBeDisabled()
    finish?.(response(201, created))
    expect(await screen.findByText(created.inscription_number)).toBeInTheDocument()
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
    render(<SignupForm tournament={tournament} session={session} />)
    fillRequired()
    submit()
    expect(await screen.findByRole('alert')).toHaveTextContent(expected)
    expect(screen.getByLabelText(/Nome completo/)).toHaveValue(' Ana Teste ')
    expect(screen.getByRole('form', { name: 'Formulário de inscrição' })).toBeInTheDocument()
  })

  it('handles a network failure without claiming success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('connection failed')))
    render(<SignupForm tournament={tournament} session={session} />)
    fillRequired()
    submit()
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível enviar a inscrição agora.')
    expect(screen.queryByText(created.inscription_number)).not.toBeInTheDocument()
  })
})
