import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import App from '../App'
import TournamentRegistration from './TournamentRegistration'
import { supabase } from '../../supabaseClient'

vi.mock('../../supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
    },
  },
}))

const tournament = {
  id: 42,
  name: 'Monomachia Karlbrüder 2027',
  slug: 'monomachia-2027',
  modality: 'longsword',
  starts_at: '2027-01-17T12:00:00Z',
  location: null,
  inscription_fee_amount: null,
  registration_opens_on: '2026-11-01',
  registration_closes_on: '2026-12-31',
  new_registrations_closed: false,
  regulation: 'https://example.test/rules',
  regulation_version: 'draft-regulation-v1',
  terms_version: 'draft-terms-v1',
  cancellation_policy: 'Policy fixture',
  equipment_requirements: null,
}

const signedInSession = {
  access_token: 'test-token',
  user: { id: 'athlete-uuid', email: 'athlete@example.test', user_metadata: {} },
} as Session

function mockTournament(response: unknown = [tournament]) {
  const request = vi.fn().mockResolvedValue({ ok: true, json: async () => response })
  vi.stubGlobal('fetch', request)
  return request
}

function renderApp() {
  return render(
    <MemoryRouter initialEntries={['/tournaments/registration']}>
      <App />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.stubEnv('VITE_API_BASE_URL', '/api')
  vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null })
  vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  } as unknown as ReturnType<typeof supabase.auth.onAuthStateChange>)
  vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({ data: { provider: 'google', url: 'https://example.test/oauth' }, error: null })
  mockTournament()
})

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('Monomachia registration entry', () => {
  it('loads the exact slug match through /api and leaves unknown event facts unconfirmed', async () => {
    const request = mockTournament()
    renderApp()

    expect(await screen.findByRole('heading', { name: tournament.name })).toBeInTheDocument()
    expect(request).toHaveBeenCalledWith('/api/tournaments?slug=monomachia-2027', expect.objectContaining({ signal: expect.any(AbortSignal) }))
    expect(screen.getByText('Espada longa (longsword)')).toBeInTheDocument()
    expect(screen.getByText(/17 de janeiro de 2027/)).toBeInTheDocument()
    expect(screen.getAllByText('A confirmar')).toHaveLength(2)
    expect(screen.getByText(/inclusive \(GMT-3\)/)).toBeInTheDocument()
    expect(screen.getByText(/não confirma uma vaga/)).toBeInTheDocument()
  })

  it('waits for session restoration before offering sign-in', async () => {
    let finish: ((value: { data: { session: null }; error: null }) => void) | undefined
    vi.mocked(supabase.auth.getSession).mockImplementation(() => new Promise(resolve => { finish = resolve }))
    renderApp()
    expect(await screen.findByRole('heading', { name: tournament.name })).toBeInTheDocument()
    expect(screen.getByText('Carregando sua sessão...')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Entrar com Google' })).not.toBeInTheDocument()

    finish?.({ data: { session: null }, error: null })
    expect(await screen.findByRole('button', { name: 'Entrar com Google' })).toBeInTheDocument()
    expect(screen.queryByRole('form', { name: 'Formulário de inscrição' })).not.toBeInTheDocument()
  })

  it('returns Google sign-in to the registration route with its query string', async () => {
    window.history.pushState({}, '', '/tournaments/registration?source=landing')
    renderApp()
    fireEvent.click(await screen.findByRole('button', { name: 'Entrar com Google' }))
    await waitFor(() => expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/tournaments/registration?source=landing` },
    }))
  })

  it('shows the signed-in athlete on the same route after restoration', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: signedInSession }, error: null })
    renderApp()
    expect(await screen.findByText(/Você está conectado como athlete@example.test/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Entrar com Google' })).not.toBeInTheDocument()
    expect(screen.getByRole('form', { name: 'Formulário de inscrição' })).toBeInTheDocument()
  })

  it('shows an unavailable state for an empty filtered list, without choosing another event', async () => {
    const request = mockTournament([])
    render(
      <TournamentRegistration
        session={null}
        authReady
        authError={null}
        onSignOut={vi.fn()}
        signInButton={<button>Entrar</button>}
      />,
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('Este torneio não está disponível.')
    expect(request).toHaveBeenCalledWith('/api/tournaments?slug=monomachia-2027', expect.anything())
    expect(screen.queryByRole('form', { name: 'Formulário de inscrição' })).not.toBeInTheDocument()
  })

  it('shows staff closure and an unavailable event without claiming registration is open', async () => {
    mockTournament([{ ...tournament, new_registrations_closed: true }])
    const view = render(
      <TournamentRegistration
        session={signedInSession}
        authReady
        authError={null}
        onSignOut={vi.fn()}
        signInButton={<button>Entrar</button>}
      />,
    )
    expect(await screen.findByText('Novas inscrições encerradas pela organização.')).toBeInTheDocument()
    expect(screen.queryByRole('form', { name: 'Formulário de inscrição' })).not.toBeInTheDocument()
    view.unmount()
    mockTournament([])
    render(
      <TournamentRegistration
        session={null}
        authReady
        authError={null}
        onSignOut={vi.fn()}
        signInButton={<button>Entrar</button>}
      />,
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('Este torneio não está disponível.')
  })

  it('distinguishes an unauthorized API response from a missing event', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }))
    render(
      <TournamentRegistration
        session={null}
        authReady
        authError={null}
        onSignOut={vi.fn()}
        signInButton={<button>Entrar</button>}
      />,
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('O acesso aos dados do torneio foi recusado.')
  })

  it.each([
    ['a non-list response', { id: 42 }],
    ['multiple matches', [tournament, { ...tournament, id: 43 }]],
    ['a mismatched slug', [{ ...tournament, slug: 'another-event' }]],
    ['an unsafe ID', [{ ...tournament, id: Number.MAX_SAFE_INTEGER + 1 }]],
    ['missing event fields', [{ id: 42, slug: 'monomachia-2027' }]],
  ])('fails closed on %s', async (_case, body) => {
    mockTournament(body)
    renderApp()
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar os dados do torneio.')
    expect(screen.queryByRole('form', { name: 'Formulário de inscrição' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
  })

  it('offers retry after a network error and loads the event on retry', async () => {
    const request = vi.fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ ok: true, json: async () => [tournament] })
    vi.stubGlobal('fetch', request)
    renderApp()
    expect(await screen.findByRole('alert')).toHaveTextContent('Tente novamente.')
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByRole('heading', { name: tournament.name })).toBeInTheDocument()
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('posts the signup to the ID returned by the slug lookup', async () => {
    const resolvedTournament = { ...tournament, id: 73 }
    const request = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [resolvedTournament] })
      .mockResolvedValueOnce({
        ok: true, status: 201,
        json: async () => ({
          inscription_number: 'T73-000001-1', status: 'awaiting_payment',
          full_name: 'Fixture Athlete', email: 'athlete@example.test', tournament_id: 73,
        }),
      })
    vi.stubGlobal('fetch', request)
    render(
      <TournamentRegistration
        session={signedInSession} authReady authError={null}
        onSignOut={vi.fn()} signInButton={<button>Entrar</button>}
      />,
    )
    const form = await screen.findByRole('form', { name: 'Formulário de inscrição' })
    const fill = (label: RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } })
    fill(/Nome completo/, 'Fixture Athlete')
    fill(/Data de nascimento/, '2000-01-01')
    fill(/^Documento/, 'passport')
    fill(/Número do documento/, 'TEST-123')
    fill(/^Telefone \*/, '000000000')
    fill(/^País/, 'Brasil')
    fill(/^Cidade/, 'São Paulo')
    fill(/Tempo de prática em HEMA/, '2 anos')
    fill(/Torneios anteriores/, '0')
    fill(/Contato de emergência/, 'Fixture Contact')
    fill(/Telefone de emergência/, '000000001')
    for (const checkbox of screen.getAllByRole('checkbox')) fireEvent.click(checkbox)
    fireEvent.click(screen.getByRole('radio', { name: /Não autorizo/ }))
    fireEvent.submit(form)

    await waitFor(() => expect(request).toHaveBeenCalledTimes(2))
    expect(request.mock.calls[0][0]).toBe('/api/tournaments?slug=monomachia-2027')
    expect(request.mock.calls[1][0]).toBe('/api/tournaments/73/signups')
    expect(request.mock.calls[1][1].headers.Authorization).toBe('Bearer test-token')
    expect(await screen.findByText('T73-000001-1')).toBeInTheDocument()
  })
})
