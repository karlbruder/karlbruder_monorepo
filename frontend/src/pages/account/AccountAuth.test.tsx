import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import App from '../../App'
import { supabase } from '../../../supabaseClient'
import { accountRoutes } from '../../accountRoutes'

vi.mock('../../../supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    },
  },
}))

const signedInSession = {
  access_token: 'test-token',
  user: { id: 'athlete-uuid', email: 'athlete@example.test', user_metadata: {} },
} as Session

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

let authStateListener: ((event: string, session: Session | null) => void) | undefined

beforeEach(() => {
  window.history.replaceState({}, '', '/')
  window.localStorage.clear()
  vi.stubEnv('VITE_API_BASE_URL', '/api')
  authStateListener = undefined
  vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null })
  vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback) => {
    authStateListener = callback
    return {
      data: { subscription: { unsubscribe: vi.fn() } },
    } as unknown as ReturnType<typeof supabase.auth.onAuthStateChange>
  })
  vi.mocked(supabase.auth.signUp).mockResolvedValue({ data: { user: { id: 'new-user' }, session: null }, error: null })
  vi.mocked(supabase.auth.signInWithPassword).mockImplementation(async () => {
    authStateListener?.('SIGNED_IN', signedInSession)
    return { data: { session: signedInSession, user: signedInSession.user }, error: null }
  })
  vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({ data: {}, error: null })
})

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('Account email auth flows', () => {
  it('shows PT and EN on sign-in while signed out and switches visible copy to English', async () => {
    render(
      <MemoryRouter initialEntries={[accountRoutes.signIn]}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByRole('group', { name: 'Language / Idioma' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Boas-vindas de volta.' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'English' }))

    expect(await screen.findByRole('heading', { name: 'Welcome back.' })).toBeInTheDocument()
  })

  it('calls signUp from sign-up and shows the check-your-email screen', async () => {
    render(
      <MemoryRouter initialEntries={[accountRoutes.signUp]}>
        <App />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'new@example.test' } })
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'secret-pass' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar minha conta' }))

    await waitFor(() => expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'new@example.test',
      password: 'secret-pass',
      options: { emailRedirectTo: `${window.location.origin}${accountRoutes.signIn}` },
    }))
    expect(await screen.findByText('Enviamos as instruções de verificação')).toBeInTheDocument()
    expect(screen.getByText('new@example.test')).toBeInTheDocument()
  })

  it('calls signInWithPassword from registration and returns to that route and query string', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ items: [tournament], total: 1, limit: 2, offset: 0 }),
    }))
    render(
      <MemoryRouter initialEntries={['/tournaments/registration?source=landing']}>
        <App />
      </MemoryRouter>,
    )

    fireEvent.click(await screen.findByRole('link', { name: 'Entrar com e-mail' }))
    expect(screen.getByRole('heading', { name: 'Boas-vindas de volta.' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'athlete@example.test' } })
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'secret-pass' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'athlete@example.test',
      password: 'secret-pass',
    }))
    expect(await screen.findByText(/Você está conectado como athlete@example.test/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Inscrição pessoal' })).toBeInTheDocument()
  })

  it('calls resetPasswordForEmail from the recovery screen', async () => {
    render(
      <MemoryRouter initialEntries={[accountRoutes.recover]}>
        <App />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'athlete@example.test' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar link de recuperação' }))

    await waitFor(() => expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('athlete@example.test', {
      redirectTo: `${window.location.origin}${accountRoutes.newPassword}`,
    }))
    expect(await screen.findByText('Enviamos as instruções de verificação')).toBeInTheDocument()
  })

  it('shows an expired recovery session on the new-password screen without a session', async () => {
    render(
      <MemoryRouter initialEntries={[accountRoutes.newPassword]}>
        <App />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Sua sessão expirou')).toBeInTheDocument()
    expect(supabase.auth.updateUser).not.toHaveBeenCalled()
  })
})

describe('Account password updates', () => {
  beforeEach(() => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: signedInSession }, error: null })
    vi.mocked(supabase.auth.updateUser).mockResolvedValue({ data: { user: signedInSession.user }, error: null })
  })

  it('calls updateUser from the signed-in change-password screen and keeps the session on success', async () => {
    render(
      <MemoryRouter initialEntries={[accountRoutes.password]}>
        <App />
      </MemoryRouter>,
    )

    fireEvent.change(await screen.findByLabelText('Nova senha'), { target: { value: 'next-secret' } })
    fireEvent.change(screen.getByLabelText('Repita a nova senha'), { target: { value: 'next-secret' } })
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar senha' }))

    await waitFor(() => expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'next-secret' }))
    expect(await screen.findByText('athlete@example.test')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Alterar senha' })).toBeInTheDocument()
    expect(supabase.auth.signOut).not.toHaveBeenCalled()
  })

  it('calls updateUser from the recovery new-password screen when a session exists', async () => {
    render(
      <MemoryRouter initialEntries={[accountRoutes.newPassword]}>
        <App />
      </MemoryRouter>,
    )

    fireEvent.change(await screen.findByLabelText('Nova senha'), { target: { value: 'recovered-secret' } })
    fireEvent.change(screen.getByLabelText('Repita a nova senha'), { target: { value: 'recovered-secret' } })
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar senha' }))

    await waitFor(() => expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'recovered-secret' }))
    expect(await screen.findByRole('heading', { name: 'Boas-vindas de volta.' })).toBeInTheDocument()
  })

  it('keeps the signed-in session when updateUser fails on the change-password screen', async () => {
    vi.mocked(supabase.auth.updateUser).mockResolvedValue({
      data: { user: signedInSession.user },
      error: { message: 'Password policy rejected', name: 'AuthError', status: 422 },
    } as Awaited<ReturnType<typeof supabase.auth.updateUser>>)

    render(
      <MemoryRouter initialEntries={[accountRoutes.password]}>
        <App />
      </MemoryRouter>,
    )

    fireEvent.change(await screen.findByLabelText('Nova senha'), { target: { value: 'weak' } })
    fireEvent.change(screen.getByLabelText('Repita a nova senha'), { target: { value: 'weak' } })
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar senha' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Password policy rejected')
    expect(screen.getByText('Você já está autenticada.')).toBeInTheDocument()
    expect(supabase.auth.signOut).not.toHaveBeenCalled()
  })
})
