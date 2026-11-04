import { renderWithQuery as render } from "@/testing/render-with-query";
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useState } from "react";
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import type { Session } from '@supabase/supabase-js'
import TournamentRegistration from '@/features/tournament/components/tournament-registration'
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

const monomachiaListUrl = '/api/tournaments?name=Monomachia&starts_from=2027-01-01&starts_to=2027-12-31&limit=2'

function catalogBody(response: unknown) {
  if (response && typeof response === 'object' && 'items' in response) return response
  if (response === null) return { items: [], total: 0, limit: 2, offset: 0 }
  return { items: [response], total: 1, limit: 2, offset: 0 }
}

function mockTournament(response: unknown = tournament) {
  const request = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => catalogBody(response),
  })
  vi.stubGlobal('fetch', request)
  return request
}


beforeEach(() => {
  window.history.replaceState({}, '', '/tournaments/registration')
  window.localStorage.clear()
  vi.stubEnv('VITE_API_BASE_URL', '/api')
  mockTournament()
})

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('Tournament registration', () => {
  it('shows an unavailable state when the catalog has no match, without choosing another event', async () => {
    const request = mockTournament(null)
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
    expect(request).toHaveBeenCalledWith(monomachiaListUrl, expect.anything())
    expect(screen.queryByRole('form', { name: 'Formulário de inscrição' })).not.toBeInTheDocument()
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
    expect(screen.queryByRole('form', { name: 'Formulário de inscrição' })).not.toBeInTheDocument()
    view.unmount()
    mockTournament(null)
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

  it("posts the signup to the ID returned by the catalog lookup and opens the payment panel", async () => {
    const resolvedTournament = { ...tournament, id: 73 };
    const paymentPayload = {
      inscription_number: "T73-000001-1",
      status: "awaiting_payment",
      inscription_fee_amount: "150.00",
      payment_due_at: null,
      payment_options: { pix: { pix_key: null } },
      latest_payment_proof: null,
    };
    const request = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === monomachiaListUrl) {
        return { ok: true, status: 200, json: async () => catalogBody(resolvedTournament) };
      }
      if (url === "/api/tournaments/73/signups" && (!init?.method || init.method === "GET")) {
        return { ok: true, status: 200, json: async () => [] };
      }
      if (url === "/api/tournaments/73/signups" && init?.method === "POST") {
        return {
          ok: true,
          status: 201,
          json: async () => ({
            inscription_number: "T73-000001-1",
            status: "awaiting_payment",
            full_name: "Fixture Athlete",
            email: "athlete@example.test",
            tournament_id: 73,
          }),
        };
      }
      if (url.endsWith("/payment")) {
        return { ok: true, status: 200, json: async () => paymentPayload };
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    vi.stubGlobal("fetch", request);
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

    await waitFor(() => {
      expect(request).toHaveBeenCalledWith(
        "/api/tournaments/73/signups",
        expect.objectContaining({ method: "POST" }),
      );
    });
    expect(await screen.findByRole("heading", { name: "Pagamento da inscrição" })).toBeInTheDocument();
    expect(screen.queryByRole("form", { name: "Formulário de inscrição" })).not.toBeInTheDocument();
  });

  it("shows the payment panel instead of the form when the caller already has an active signup", async () => {
    mockTournament(tournament);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url === monomachiaListUrl) {
          return { ok: true, status: 200, json: async () => catalogBody(tournament) };
        }
        if (url === "/api/tournaments/42/signups") {
          return {
            ok: true,
            status: 200,
            json: async () => [{
              inscription_number: "T42-000001-5",
              status: "awaiting_payment",
              full_name: "Fixture Athlete",
              email: "athlete@example.test",
              tournament_id: 42,
            }],
          };
        }
        if (url.endsWith("/payment")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              inscription_number: "T42-000001-5",
              status: "awaiting_payment",
              inscription_fee_amount: null,
              payment_due_at: null,
              payment_options: { pix: { pix_key: null } },
              latest_payment_proof: null,
            }),
          };
        }
        throw new Error(`unexpected fetch ${url}`);
      }),
    );
    render(
      <TournamentRegistration
        session={signedInSession}
        authReady
        authError={null}
        onSignOut={vi.fn()}
        signInButton={<button>Entrar</button>}
      />,
    );
    expect(await screen.findByRole("heading", { name: "Pagamento da inscrição" })).toBeInTheDocument();
    expect(screen.queryByRole("form", { name: "Formulário de inscrição" })).not.toBeInTheDocument();
  });

  it("shows the registration form when only cancelled signups exist for the caller", async () => {
    mockTournament(tournament);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url === monomachiaListUrl) {
          return { ok: true, status: 200, json: async () => catalogBody(tournament) };
        }
        if (url === "/api/tournaments/42/signups") {
          return {
            ok: true,
            status: 200,
            json: async () => [{
              inscription_number: "T42-000001-5",
              status: "cancelled",
              full_name: "Fixture Athlete",
              email: "athlete@example.test",
              tournament_id: 42,
            }],
          };
        }
        throw new Error(`unexpected fetch ${url}`);
      }),
    );
    render(
      <TournamentRegistration
        session={signedInSession}
        authReady
        authError={null}
        onSignOut={vi.fn()}
        signInButton={<button>Entrar</button>}
      />,
    );
    expect(await screen.findByRole("form", { name: "Formulário de inscrição" })).toBeInTheDocument();
  });

  it("shows the admin's own payment panel when another participant is first in the staff list", async () => {
    const adminSession = {
      access_token: "admin-token",
      user: { id: "admin-uuid", email: "admin@example.test", user_metadata: {} },
    } as Session
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url === monomachiaListUrl) {
        return { ok: true, status: 200, json: async () => catalogBody(tournament) }
      }
      if (url === "/api/tournaments/42/signups") {
        return {
          ok: true,
          status: 200,
          json: async () => [
            {
              inscription_number: "T42-OTHER",
              status: "awaiting_payment",
              full_name: "Other Athlete",
              email: "other@example.test",
              tournament_id: 42,
              user_id: "other-uuid",
            },
            {
              inscription_number: "T42-ADMIN",
              status: "awaiting_payment",
              full_name: "Admin Athlete",
              email: "admin@example.test",
              tournament_id: 42,
              user_id: "admin-uuid",
            },
          ],
        }
      }
      if (url === "/api/tournaments/42/signups/T42-ADMIN/payment") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            inscription_number: "T42-ADMIN",
            status: "awaiting_payment",
            inscription_fee_amount: null,
            payment_due_at: null,
            payment_options: { pix: { pix_key: null } },
            latest_payment_proof: null,
          }),
        }
      }
      throw new Error(`unexpected fetch ${url}`)
    }))
    render(
      <TournamentRegistration
        session={adminSession}
        authReady
        authError={null}
        onSignOut={vi.fn()}
        signInButton={<button>Entrar</button>}
      />,
    )
    expect(await screen.findByText("T42-ADMIN")).toBeInTheDocument()
    expect(screen.queryByText("T42-OTHER")).not.toBeInTheDocument()
    expect(screen.queryByRole("form", { name: "Formulário de inscrição" })).not.toBeInTheDocument()
  })

  it("shows the creation form when an admin has no signup of their own", async () => {
    const adminSession = {
      access_token: "admin-token",
      user: { id: "admin-uuid", email: "admin@example.test", user_metadata: {} },
    } as Session
    const request = vi.fn(async (url: string) => {
      if (url === monomachiaListUrl) {
        return { ok: true, status: 200, json: async () => catalogBody(tournament) }
      }
      if (url === "/api/tournaments/42/signups") {
        return {
          ok: true,
          status: 200,
          json: async () => [{
            inscription_number: "T42-OTHER",
            status: "awaiting_payment",
            full_name: "Other Athlete",
            email: "other@example.test",
            tournament_id: 42,
            user_id: "other-uuid",
          }],
        }
      }
      throw new Error(`unexpected fetch ${url}`)
    })
    vi.stubGlobal("fetch", request)
    render(
      <TournamentRegistration
        session={adminSession}
        authReady
        authError={null}
        onSignOut={vi.fn()}
        signInButton={<button>Entrar</button>}
      />,
    )
    expect(await screen.findByRole("form", { name: "Formulário de inscrição" })).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Pagamento da inscrição" })).not.toBeInTheDocument()
    expect(request.mock.calls.map(([url]) => url)).not.toContain("/api/tournaments/42/signups/T42-OTHER/payment")
  })

  it("drops a registration created on this page when a different account signs in", async () => {
    const sessionB = {
      access_token: "token-b",
      user: { id: "account-b", email: "b@example.test", user_metadata: {} },
    } as Session
    const paymentPayload = {
      inscription_number: "T42-000001-1",
      status: "awaiting_payment",
      inscription_fee_amount: "150.00",
      payment_due_at: null,
      payment_options: { pix: { pix_key: null } },
      latest_payment_proof: null,
    }
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      const authorization = new Headers(init?.headers).get("Authorization")
      if (url === monomachiaListUrl) {
        return { ok: true, status: 200, json: async () => catalogBody(tournament) }
      }
      if (url === "/api/tournaments/42/signups" && init?.method === "POST") {
        return {
          ok: true,
          status: 201,
          json: async () => ({
            inscription_number: "T42-000001-1",
            status: "awaiting_payment",
            full_name: "Fixture Athlete",
            email: "athlete@example.test",
            tournament_id: 42,
          }),
        }
      }
      if (url === "/api/tournaments/42/signups" && authorization === "Bearer token-b") {
        return { ok: true, status: 200, json: async () => [] }
      }
      if (url === "/api/tournaments/42/signups") {
        return { ok: true, status: 200, json: async () => [] }
      }
      if (url.endsWith("/payment")) {
        return { ok: true, status: 200, json: async () => paymentPayload }
      }
      throw new Error(`unexpected fetch ${url}`)
    }))
    render(<SwitchableRegistration nextSession={sessionB} />)
    const form = await screen.findByRole("form", { name: "Formulário de inscrição" })
    const fill = (label: RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } })
    fill(/Nome completo/, "Fixture Athlete")
    fill(/Data de nascimento/, "2000-01-01")
    fill(/^Documento/, "passport")
    fill(/Número do documento/, "TEST-123")
    fill(/^Telefone \*/, "000000000")
    fill(/^País/, "Brasil")
    fill(/^Cidade/, "São Paulo")
    fill(/Tempo de prática em HEMA/, "2 anos")
    fill(/Torneios anteriores/, "0")
    fill(/Contato de emergência/, "Fixture Contact")
    fill(/Telefone de emergência/, "000000001")
    for (const checkbox of screen.getAllByRole("checkbox")) fireEvent.click(checkbox)
    fireEvent.click(screen.getByRole("radio", { name: /Não autorizo/ }))
    fireEvent.submit(form)
    expect(await screen.findByRole("heading", { name: "Pagamento da inscrição" })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Trocar conta" }))
    expect(await screen.findByRole("form", { name: "Formulário de inscrição" })).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Pagamento da inscrição" })).not.toBeInTheDocument()
  })
})

function SwitchableRegistration({ nextSession }: { nextSession: Session }) {
  const [session, setSession] = useState(signedInSession)
  return (
    <>
      <button type="button" onClick={() => setSession(nextSession)}>Trocar conta</button>
      <TournamentRegistration
        session={session}
        authReady
        authError={null}
        onSignOut={vi.fn()}
        signInButton={<button>Entrar</button>}
      />
    </>
  )
}
