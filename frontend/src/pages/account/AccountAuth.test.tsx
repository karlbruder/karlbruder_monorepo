import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { AuthRetryableFetchError, AuthWeakPasswordError } from '@supabase/supabase-js'
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

let authStateListener: ((event: AuthChangeEvent, session: Session | null) => void) | undefined

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
  vi.mocked(supabase.auth.signUp).mockResolvedValue({
    data: { user: { id: 'new-user' } as Session['user'], session: null },
    error: null,
  })
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
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'ValidPass1!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar minha conta' }))

    await waitFor(() => expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'new@example.test',
      password: 'ValidPass1!',
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
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'ValidPass1!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'athlete@example.test',
      password: 'ValidPass1!',
    }))
    expect(await screen.findByText(/Você está conectado como athlete@example.test/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Inscrição pessoal' })).toBeInTheDocument()
  })

  it('shows WF-03 unavailable when sign-in receives a retryable network error from Supabase', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: null, session: null },
      error: new AuthRetryableFetchError('Failed to fetch', 0),
    } as Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>)

    render(
      <MemoryRouter initialEntries={[accountRoutes.signIn]}>
        <App />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'athlete@example.test' } })
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'ValidPass1!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Serviço temporariamente indisponível')).toBeInTheDocument()
  })

  it('shows the mapped expired-link message when recovery opens with otp_expired and no session', async () => {
    window.history.replaceState(
      {},
      '',
      `${accountRoutes.newPassword}#error=access_denied&error_code=otp_expired`,
    )

    render(
      <MemoryRouter initialEntries={[accountRoutes.newPassword]}>
        <App />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Este link expirou ou já foi usado. Solicite um novo link.',
    )
    expect(screen.getByRole('link', { name: 'Esqueci minha senha' })).toHaveAttribute('href', accountRoutes.recover)
  })

  it('shows Google initiation errors on the account sign-in screen', async () => {
    vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
      data: { provider: 'google', url: null },
      error: new Error('offline'),
    } as Awaited<ReturnType<typeof supabase.auth.signInWithOAuth>>)

    render(
      <MemoryRouter initialEntries={[accountRoutes.signIn]}>
        <App />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Continuar com Google' }))

    await waitFor(() => expect(supabase.auth.signInWithOAuth).toHaveBeenCalled())
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível entrar com Google')
  })

  it('carries returnTo in the recovery email redirect when recover opened with a destination', async () => {
    render(
      <MemoryRouter
        initialEntries={[
          `${accountRoutes.recover}?returnTo=${encodeURIComponent('/tournaments/registration?source=landing')}`,
        ]}
      >
        <App />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'athlete@example.test' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar link de recuperação' }))

    await waitFor(() => expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalled())
    const redirectTo = vi.mocked(supabase.auth.resetPasswordForEmail).mock.calls[0][1]?.redirectTo ?? ''
    expect(redirectTo).toContain('returnTo=')
    expect(redirectTo).toContain(encodeURIComponent('/tournaments/registration?source=landing'))
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
      redirectTo: `${window.location.origin}${accountRoutes.newPassword}?returnTo=${encodeURIComponent(accountRoutes.signIn)}`,
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

    fireEvent.change(await screen.findByLabelText('Nova senha'), { target: { value: 'ValidPass1!' } })
    fireEvent.change(screen.getByLabelText('Repita a nova senha'), { target: { value: 'ValidPass1!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar senha' }))

    await waitFor(() => expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'ValidPass1!' }))
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

    fireEvent.change(await screen.findByLabelText('Nova senha'), { target: { value: 'ValidPass1!' } })
    fireEvent.change(screen.getByLabelText('Repita a nova senha'), { target: { value: 'ValidPass1!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar senha' }))

    await waitFor(() => expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'ValidPass1!' }))
    expect(await screen.findByRole('link', { name: 'Alterar senha' })).toBeInTheDocument()
  })

  it('keeps the signed-in session when updateUser fails on the change-password screen', async () => {
    vi.mocked(supabase.auth.updateUser).mockResolvedValue({
      data: { user: null },
      error: new AuthWeakPasswordError('Password should contain at least one character of each', 422, ['characters']),
    } as Awaited<ReturnType<typeof supabase.auth.updateUser>>)

    render(
      <MemoryRouter initialEntries={[accountRoutes.password]}>
        <App />
      </MemoryRouter>,
    )

    fireEvent.change(await screen.findByLabelText('Nova senha'), { target: { value: 'weak' } })
    fireEvent.change(screen.getByLabelText('Repita a nova senha'), { target: { value: 'weak' } })
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar senha' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Use uma senha com pelo menos 8 caracteres, com letras maiúsculas e minúsculas, números e símbolos.',
    )
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'weak' })
    expect(screen.getByText('Você já está autenticada.')).toBeInTheDocument()
    expect(supabase.auth.signOut).not.toHaveBeenCalled()
  })
})

describe('Session route guard', () => {
  it('shows session loading on home and does not redirect before auth restoration finishes', () => {
    vi.mocked(supabase.auth.getSession).mockImplementation(() => new Promise(() => {}))

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByText('Carregando sua sessão...')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Boas-vindas de volta.' })).not.toBeInTheDocument()
  })

  it('sends a guest from home to sign-in after session restoration finishes', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Boas-vindas de volta.' })).toBeInTheDocument()
    expect(screen.queryByText('Sua sessão expirou')).not.toBeInTheDocument()
  })

  it('shows the expired-session notice when sign-in opens with sessionExpired=1', async () => {
    render(
      <MemoryRouter initialEntries={[`${accountRoutes.signIn}?returnTo=%2F&sessionExpired=1`]}>
        <App />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Sua sessão expirou')).toBeInTheDocument()
  })

  it('sends a guest from the change-password route to sign-in without the expired-session notice', async () => {
    render(
      <MemoryRouter initialEntries={[accountRoutes.password]}>
        <App />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Boas-vindas de volta.' })).toBeInTheDocument()
    expect(screen.queryByText('Sua sessão expirou')).not.toBeInTheDocument()
  })

  it('shows the signed-in home at slash when a session exists', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: signedInSession }, error: null })

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('link', { name: 'Alterar senha' })).toBeInTheDocument()
    expect(screen.getByText('athlete@example.test')).toBeInTheDocument()
  })

  it('still renders sign-in without a session when opened directly', async () => {
    render(
      <MemoryRouter initialEntries={[accountRoutes.signIn]}>
        <App />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Boas-vindas de volta.' })).toBeInTheDocument()
  })
})
