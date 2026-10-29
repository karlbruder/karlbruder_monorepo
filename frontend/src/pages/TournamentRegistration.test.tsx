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
  modality: 'longsword',
  starts_at: '2027-01-17T12:00:00Z',
  location: null,
  inscription_fee_amount: null,
  registration_opens_on: '2026-11-01',
  registration_closes_on: '2026-12-31',
  new_registrations_closed: false,
}

const signedInSession = {
  access_token: 'test-token',
  user: { email: 'athlete@example.test', user_metadata: {} },
} as Session

function mockTournament(response = tournament) {
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
  vi.stubEnv('VITE_MONOMACHIA_TOURNAMENT_ID', '42')
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
  it('loads configured event facts through the preserved /api path and leaves unknown values unconfirmed', async () => {
    const request = mockTournament()
    renderApp()

    expect(await screen.findByRole('heading', { name: tournament.name })).toBeInTheDocument()
    expect(request).toHaveBeenCalledWith('/api/tournaments/42', expect.objectContaining({ signal: expect.any(AbortSignal) }))
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
  })

  it('does not fetch an arbitrary event when the configured ID is invalid', () => {
    vi.stubEnv('VITE_MONOMACHIA_TOURNAMENT_ID', 'not-an-id')
    const request = mockTournament()
    render(
      <TournamentRegistration
        session={null}
        authReady
        authError={null}
        onSignOut={vi.fn()}
        signInButton={<button>Entrar</button>}
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('A inscrição ainda não está configurada')
    expect(request).not.toHaveBeenCalled()
  })

  it('shows staff closure and an unavailable event without claiming registration is open', async () => {
    mockTournament({ ...tournament, new_registrations_closed: true })
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
    view.unmount()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
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
})
