import { acceptanceEvidence } from "@/testing/acceptance-evidence";
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import AppRouter from '@/app/router'
import AppProvider from '@/app/provider'
import { supabase } from '@/lib/supabase-client'

vi.mock('@/lib/supabase-client', () => ({
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

const tournament = {
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
  rules_url: 'https://example.test/rules',
  ...acceptanceEvidence,
  rules_version: 'draft-rules_text-v1',
  terms_version: 'draft-terms-v1',
  cancellation_policy_text: 'Policy fixture',
  cancellation_policy_url: null,
  equipment_requirements: null,
}

const signedInSession = {
  access_token: 'test-token',
  user: { id: 'athlete-uuid', email: 'athlete@example.test', user_metadata: {} },
} as Session

const monomachiaListUrl = '/api/tournaments?name=Monomachia&starts_from=2027-01-01&starts_to=2027-12-31&limit=2'

function catalogBody(response: unknown) {
  if (response && typeof response === 'object' && 'items' in response) return response
  if (response === null) return { items: [], total: 0, limit: 2, offset: 0 }
  return { items: [response], total: 1, limit: 2, offset: 0 }
}

function mockTournament(response: unknown = tournament) {
  const request = vi.fn(async (url: string) => {
    if (url === '/api/tournaments/42/registrations') {
      return { ok: true, status: 200, json: async () => [] }
    }
    return {
      ok: true,
      status: 200,
      json: async () => catalogBody(response),
    }
  })
  vi.stubGlobal('fetch', request)
  return request
}

function App() {
  return <AppProvider><AppRouter /></AppProvider>
}

function renderApp() {
  const entry = `${window.location.pathname}${window.location.search}` || '/tournaments/registration'
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <App />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  window.history.replaceState({}, '', '/tournaments/registration')
  window.localStorage.clear()
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
  it('uses the URL language before the saved preference, localizes facts, and keeps OAuth on that route', async () => {
    window.localStorage.setItem('registrationLanguage', 'pt')
    window.history.replaceState({}, '', '/tournaments/registration?source=landing&lang=en')
    mockTournament({ ...tournament, registration_fee_amount: '125.50' })
    renderApp()

    expect(await screen.findByRole('heading', { name: tournament.name })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Personal registration' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'English' }).closest('[lang]')).toHaveAttribute('lang', 'en-US')
    expect(screen.getByText(/January 17, 2027/)).toBeInTheDocument()
    expect(screen.getByText(/R\$125\.50/)).toBeInTheDocument()
    expect(window.localStorage.getItem('registrationLanguage')).toBe('en')
    fireEvent.click(screen.getByRole('button', { name: 'Sign in with Google' }))
    await waitFor(() => expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/tournaments/registration?source=landing&lang=en` },
    }))
  })

  it('falls back from an invalid URL language to the saved preference and preserves other query parameters on switch', async () => {
    window.localStorage.setItem('registrationLanguage', 'en')
    window.history.replaceState({}, '', '/tournaments/registration?source=landing&lang=fr')
    renderApp()
    expect(await screen.findByRole('heading', { name: 'Personal registration' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Português' }))
    expect(screen.getByRole('heading', { name: 'Inscrição pessoal' })).toBeInTheDocument()
    expect(window.location.search).toBe('?source=landing&lang=pt')
    expect(window.localStorage.getItem('registrationLanguage')).toBe('pt')
  })

  it('defaults to Portuguese for an invalid language with no saved preference and retains a switch after remount', async () => {
    window.history.replaceState({}, '', '/tournaments/registration?lang=invalid')
    const view = renderApp()
    expect(await screen.findByRole('heading', { name: 'Inscrição pessoal' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'English' }))
    expect(screen.getByRole('heading', { name: 'Personal registration' })).toBeInTheDocument()
    view.unmount()
    renderApp()
    expect(await screen.findByRole('heading', { name: 'Personal registration' })).toBeInTheDocument()
    expect(window.location.search).toBe('?lang=en')
  })

  it('shows a session restoration error in English on the private route', async () => {
    window.history.replaceState({}, '', '/tournaments/registration?lang=en')
    vi.mocked(supabase.auth.getSession).mockRejectedValue(new Error('auth unavailable'))
    renderApp()
    expect(await screen.findByRole('alert')).toHaveTextContent('We could not restore your session.')
    expect(screen.getByRole('button', { name: 'Sign in with Google' })).toBeInTheDocument()
  })

  it('formats the fee in Brazilian reais for the default Portuguese route', async () => {
    mockTournament({ ...tournament, registration_fee_amount: '125.50' })
    renderApp()
    expect(await screen.findByText(/17 de janeiro de 2027/)).toBeInTheDocument()
    expect(screen.getByText(/R\$\s?125,50/)).toBeInTheDocument()
  })

  it('translates sign-out errors on the English private route', async () => {
    window.history.replaceState({}, '', '/tournaments/registration?lang=en')
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: signedInSession }, error: null })
    vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: { message: 'unavailable' } } as Awaited<ReturnType<typeof supabase.auth.signOut>>)
    renderApp()
    fireEvent.click(await screen.findByRole('button', { name: 'Sign out' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('We could not sign you out.')
  })

  it('keeps entered values and unchecked declarations while switching the signed-in form', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: signedInSession }, error: null })
    renderApp()
    const name = await screen.findByRole('textbox', { name: /Nome completo/ })
    fireEvent.change(name, { target: { value: 'Fixture Athlete' } })
    expect(screen.getAllByRole('checkbox')).toHaveLength(7)
    fireEvent.click(screen.getByRole('button', { name: 'English' }))
    expect(screen.getByRole('form', { name: 'Registration form' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /Full name/ })).toHaveValue('Fixture Athlete')
    expect(screen.getAllByRole('checkbox')).toHaveLength(7)
    expect(screen.getAllByRole('checkbox').every((checkbox) => !(checkbox as HTMLInputElement).checked)).toBe(true)
    expect(screen.getByRole('radio', { name: /I do not authorize/ })).not.toBeChecked()
    expect(window.location.search).toBe('?lang=en')
  })
  it('loads the unique Monomachia catalog match through /api and leaves unknown event facts unconfirmed', async () => {
    const request = mockTournament()
    renderApp()

    expect(await screen.findByRole('heading', { name: tournament.name })).toBeInTheDocument()
    expect(request).toHaveBeenCalledWith(monomachiaListUrl, expect.objectContaining({ signal: expect.any(AbortSignal) }))
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
    expect(await screen.findByRole('form', { name: 'Formulário de inscrição' })).toBeInTheDocument()
  })

  it.each([
    ['multiple matches', { items: [tournament, { ...tournament, id: 43 }], total: 2, limit: 2, offset: 0 }],
    ['an unsafe ID', { ...tournament, id: Number.MAX_SAFE_INTEGER + 1 }],
    ['missing event fields', { id: 42, slug: 'monomachia-2027' }],
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
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => catalogBody(tournament) })
    vi.stubGlobal('fetch', request)
    renderApp()
    expect(await screen.findByRole('alert')).toHaveTextContent('Tente novamente.')
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByRole('heading', { name: tournament.name })).toBeInTheDocument()
    expect(request).toHaveBeenCalledTimes(2)
  })

})

function mockLinkedRegistration(status = "waitlist", paymentStatus = 200) {
  const request = vi.fn(async (url: string) => {
    if (url === "/api/tournaments/77") return { ok: true, status: 200, json: async () => ({ ...tournament, id: 77, name: "Second Tournament", slug: "second" }) };
    if (url === "/api/tournaments/77/registrations/T77-001/payment") return { ok: paymentStatus === 200, status: paymentStatus, json: async () => ({
      registration_number: "T77-001", registration_status: status, registration_fee_amount: "100.00", payment_due_at: null,
      payment_options: { pix: { pix_key: "fixture-key" } }, latest_payment_proof: null, current_review: null,
    }) };
    throw new Error(`Unexpected linked request: ${url}`);
  });
  vi.stubGlobal("fetch", request); return request;
}
it("loads the email-linked registration for a different tournament using the active token", async () => {
  window.history.replaceState({}, "", "/tournaments/registration?tournament_id=77&registration_number=T77-001");
  vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: signedInSession }, error: null });
  const request = mockLinkedRegistration(); renderApp();
  await screen.findByText("Lista de espera");
  expect(screen.getByRole("heading", { name: "Second Tournament" })).toBeInTheDocument();
  expect(request).toHaveBeenCalledWith("/api/tournaments/77/registrations/T77-001/payment", expect.objectContaining({ headers: { Authorization: "Bearer test-token" } }));
  expect(request.mock.calls.some(([url]) => url.includes("name=Monomachia") || url.endsWith("/registrations"))).toBe(false);
  expect(screen.queryByRole("form")).not.toBeInTheDocument();
});
it("preserves the tournament and exact registration through email and Google sign-in", async () => {
  const target = "/tournaments/registration?tournament_id=77&registration_number=T77-001&lang=en";
  window.history.replaceState({}, "", target); const request = mockLinkedRegistration(); renderApp();
  const link = await screen.findByRole("link", { name: "Sign in with email" });
  expect(link).toHaveAttribute("href", `/account/sign-in?${new URLSearchParams({ returnTo: target })}`);
  expect(request).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Sign in with Google" }));
  await waitFor(() => expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({ provider: "google", options: { redirectTo: `${window.location.origin}${target}` } }));
});
it.each(["", "foreign", "cancelled"])("keeps a linked %s outcome separate from another active registration", async scenario => {
  window.history.replaceState({}, "", "/tournaments/registration?tournament_id=77&registration_number=T77-001");
  vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: signedInSession }, error: null });
  const request = mockLinkedRegistration(scenario === "cancelled" ? "cancelled" : "waitlist", scenario === "cancelled" ? 200 : 404); renderApp();
  if (scenario === "cancelled") await screen.findByText("Cancelada");
  else expect(await screen.findByRole("alert")).toHaveTextContent("Inscrição não encontrada ou sem acesso");
  expect(screen.queryByRole("form")).not.toBeInTheDocument();
  expect(request.mock.calls.some(([url]) => url.endsWith("/registrations"))).toBe(false);
});
it.each([
  "tournament_id=0&registration_number=T77-001", "tournament_id=oops", "registration_number=T77-001",
  "tournament_id=77&registration_number=", "tournament_id=77&tournament_id=42", "tournament_id=9007199254740992",
])("rejects malformed link parameters %s without loading another tournament", async query => {
  window.history.replaceState({}, "", `/tournaments/registration?${query}`); const request = mockLinkedRegistration(); renderApp();
  expect(await screen.findByRole("alert")).toHaveTextContent("Este link de inscrição não é válido.");
  expect(request).not.toHaveBeenCalled();
});
it("shows a missing linked tournament without falling back to Monomachia", async () => {
  window.history.replaceState({}, "", "/tournaments/registration?tournament_id=77&registration_number=T77-001");
  vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: signedInSession }, error: null });
  const request = vi.fn().mockResolvedValue({ ok: false, status: 404 }); vi.stubGlobal("fetch", request); renderApp();
  await screen.findByRole("alert"); expect(request).toHaveBeenCalledTimes(1); expect(request.mock.calls[0][0]).toBe("/api/tournaments/77");
});
it("returns from email sign-in to the exact registration named in the notification", async () => {
  let signedIn: (() => void) | undefined;
  vi.mocked(supabase.auth.onAuthStateChange).mockImplementation(callback => {
    signedIn = () => { void callback("SIGNED_IN", signedInSession); };
    return { data: { subscription: { unsubscribe: vi.fn() } } } as unknown as ReturnType<typeof supabase.auth.onAuthStateChange>;
  });
  vi.mocked(supabase.auth.signInWithPassword).mockImplementation(async () => {
    signedIn?.(); return { data: { session: signedInSession, user: signedInSession.user }, error: null };
  });
  window.history.replaceState({}, "", "/tournaments/registration?tournament_id=77&registration_number=T77-001");
  mockLinkedRegistration(); renderApp();
  fireEvent.click(await screen.findByRole("link", { name: "Entrar com e-mail" }));
  fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "athlete@example.test" } });
  fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "FixturePassword1!" } });
  fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
  await screen.findByText("Lista de espera");
  expect(screen.getByText("T77-001")).toBeInTheDocument();
});
it("does not contradict a confirmed outcome on the default personal registration page", async () => {
  vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: signedInSession }, error: null });
  vi.stubGlobal("fetch", vi.fn(async (url: string) => ({ ok: true, json: async () => {
    if (url === monomachiaListUrl) return catalogBody(tournament);
    if (url.endsWith("/registrations")) return [{ tournament_id: 42, registration_number: "T42-001", registration_status: "confirmed", full_name: "Fixture", email: "athlete@example.test" }];
    return { registration_number: "T42-001", registration_status: "confirmed", registration_fee_amount: null, payment_due_at: null, payment_options: { pix: { pix_key: null } }, latest_payment_proof: null, current_review: null };
  } })));
  renderApp(); await screen.findByText("Confirmada");
  expect(screen.queryByText(/O envio da inscrição não confirma/)).not.toBeInTheDocument();
  expect(screen.queryByText(/Faça o Pix/)).not.toBeInTheDocument();
});
