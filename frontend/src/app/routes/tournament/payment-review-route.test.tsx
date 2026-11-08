import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import AppRouter from "@/app/router";
import { AuthSessionContext } from "@/features/auth/hooks/use-auth-session";
import { LanguageProvider } from "@/components/language-provider";
import { createQueryClient } from "@/lib/query-client";
import { setApiUnauthorizedHandler } from "@/lib/api-fetch";
import type { ReviewDetail } from "@/features/tournament/api/payment-reviews";

vi.mock("@/lib/supabase-client", () => ({ supabase: { auth: {} } }));
const admin = { access_token: "staff-token", user: { id: "staff-id", app_metadata: { karlbruder_role: "admin" }, user_metadata: {} } } as unknown as Session;
const detail: ReviewDetail = {
  registration: {
    tournament_id: 1, registration_number: "T1-001", registration_status: "awaiting_payment_confirmation", full_name: "Athlete Fixture",
    social_name: null, birth_date: "2012-01-01", identity_document_type: "passport", identity_document_number: "TEST",
    school_or_team_name: "Fixture Team", instructor_name: null, hema_experience_description: "2 years", hema_started_year: 2024,
    previous_tournament_count: 0, category_or_eligibility_note: null, declares_has_required_equipment: true,
    declares_physically_fit: true, accepts_rules: true, staff_safety_note: "Private fixture",
  },
  tournament_name: "First Tournament", registration_fee_amount: "150.00", payment_due_at: "2020-01-01T00:00:00Z",
  competitor_capacity: null, confirmed_count: 10, equipment_requirements: "Mask", latest_document_id: 20,
  documents: [
    { id: 20, document_type: "payment_proof", original_file_name: "current.pdf", content_type: "application/pdf", size_bytes: 1200, submitted_at: "2026-11-01T12:00:00Z" },
    { id: 19, document_type: "payment_proof", original_file_name: "old.pdf", content_type: "application/pdf", size_bytes: 1200, submitted_at: "2026-10-01T12:00:00Z" },
    { id: 18, document_type: "parental_consent_form", original_file_name: "parent.pdf", content_type: "application/pdf", size_bytes: 1200, submitted_at: "2026-10-01T12:00:00Z" },
  ],
  reviews: [{ id: 1, document_id: 19, decision: "rejected", rejection_reason: "Unreadable fixture", reviewed_by_user_id: "reviewer-fixture", reviewed_at: "2026-10-02T12:00:00Z" }],
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
let current: ReviewDetail;
let decisionStatus = 200;
let downloadStatus = 200;
let queueStatus = 200;
let detailStatus = 200;
let outcome = "waitlist";
let delivery = "sent";
let pending: Promise<Response> | undefined;
const fetchMock = vi.fn();
function tree(path: string, session: Session | null = admin, ready = true) {
  return <QueryClientProvider client={createQueryClient()}><LanguageProvider><AuthSessionContext value={{
    session, authReady: ready, authLoading: !ready, authError: null, sessionLapsed: false,
    signInWithGoogle: vi.fn(), signOut: vi.fn(), clearSessionLapsedNotice: vi.fn(),
  }}><MemoryRouter initialEntries={[path]}><AppRouter /></MemoryRouter></AuthSessionContext></LanguageProvider></QueryClientProvider>;
}
function openReview() { return render(tree("/staff/payment-reviews/T1-001")); }
async function approveDraft() {
  await screen.findByLabelText("Valor recebido (BRL)");
  fireEvent.change(screen.getByLabelText("Valor recebido (BRL)"), { target: { value: "123,45" } });
  fireEvent.click(screen.getByLabelText("Conferi o recebimento e o valor do pagamento."));
  fireEvent.click(screen.getByLabelText("Conferi os requisitos de participação e a documentação aplicável."));
}
const decisions = () => fetchMock.mock.calls.filter(([, init]) => init?.method === "POST");
beforeEach(() => {
  vi.stubEnv("VITE_API_BASE_URL", "/api"); window.localStorage.clear(); window.history.replaceState({}, "", "/");
  current = structuredClone(detail); decisionStatus = 200; downloadStatus = 200; queueStatus = 200; detailStatus = 200; outcome = "waitlist"; delivery = "sent"; pending = undefined;
  fetchMock.mockReset().mockImplementation(async (url: string, init?: RequestInit) => {
    if (init?.method === "POST") return pending ?? json({ review: { ...detail.reviews[0], document_id: 20, decision: "approved" }, registration_status: outcome, notification_result: delivery }, decisionStatus);
    if (url.includes("download-url")) return json({ download_url: `https://files.example.test/proof?version=${fetchMock.mock.calls.length}` }, downloadStatus);
    if (url.includes("?")) {
      const params = new URL(url, "https://app.example.test").searchParams;
      const filter = params.get("registration_number"); const offset = Number(params.get("offset"));
      return json({ items: filter === "missing" ? [] : [
        { registration_number: offset ? "T2-021" : "T1-001", full_name: "First Athlete", tournament_name: "First Tournament", submitted_at: "2026-11-01" },
        { registration_number: "T2-002", full_name: "Second Athlete", tournament_name: "Second Tournament", submitted_at: "2026-11-01" },
      ], total: filter === "missing" ? 0 : 21, limit: 20, offset }, queueStatus);
    }
    return json(current, detailStatus);
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); setApiUnauthorizedHandler(null); });

it("shows the global queue, searches exact numbers, pages, and opens a review", async () => {
  render(tree("/staff/payment-reviews"));
  expect(await screen.findByText("Second Tournament", { exact: false })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Próxima" }));
  await screen.findByRole("button", { name: "Revisar T2-021" });
  expect(fetchMock.mock.calls.some(([url]) => url.includes("offset=20"))).toBe(true);
  fireEvent.change(screen.getByLabelText("Buscar inscrição exata"), { target: { value: "missing" } });
  fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
  await screen.findByText("Nenhum comprovante pendente.");
  expect(fetchMock.mock.calls.some(([url]) => url.includes("registration_number=missing") && url.includes("offset=0"))).toBe(true);
  fireEvent.change(screen.getByLabelText("Buscar inscrição exata"), { target: { value: "T1-001" } });
  fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
  fireEvent.click(await screen.findByRole("button", { name: "Revisar T1-001" }));
  await screen.findByRole("heading", { name: "Conferir pagamento e participação" });
  await screen.findByText("current.pdf");
});
it("shows a queue failure with refresh and recovers", async () => {
  queueStatus = 503; render(tree("/staff/payment-reviews"));
  await screen.findByRole("alert"); queueStatus = 200;
  fireEvent.click(screen.getByRole("button", { name: "Atualizar fila" }));
  await screen.findByRole("button", { name: "Revisar T1-001" });
});
it("shows current proof, prior evidence, parental form, restricted facts and audit history", async () => {
  openReview(); await screen.findByText("current.pdf");
  expect(screen.getByText("parent.pdf")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Histórico de documentos")); expect(screen.getByText("old.pdf")).toBeVisible();
  expect(screen.getByText("Unreadable fixture")).toBeInTheDocument();
  expect(screen.getByText(/O prazo passou/)).toBeInTheDocument();
  expect(screen.getByText("Sem limite")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Dados restritos")); expect(screen.getByText("Private fixture")).toBeVisible();
  expect(screen.getByText(/Para menores, confira o termo/)).toBeInTheDocument();
});
it("requests a fresh document link on renewal and handles unavailable downloads", async () => {
  openReview(); const file = (await screen.findByText("current.pdf")).closest("li")!;
  fireEvent.click(within(file).getByRole("button", { name: "Abrir documento" }));
  const first = await within(file).findByRole("link"); const url = first.getAttribute("href");
  fireEvent.click(within(file).getByRole("button", { name: "Renovar link" }));
  await waitFor(() => expect(within(file).getByRole("link").getAttribute("href")).not.toBe(url));
  downloadStatus = 503; fireEvent.click(within(file).getByRole("button", { name: "Renovar link" }));
  await within(file).findByRole("alert"); expect(within(file).queryByRole("link")).not.toBeInTheDocument();
  expect(fetchMock.mock.calls.some(([url]) => url.includes("/T1-001/documents/20/download-url"))).toBe(true);
});
it("validates actual amounts and acknowledgements and submits the displayed proof once", async () => {
  let finish!: (response: Response) => void;
  openReview(); await screen.findByLabelText("Valor recebido (BRL)");
  fireEvent.click(screen.getByRole("button", { name: "Aprovar pagamento" })); expect(decisions()).toHaveLength(0);
  fireEvent.change(screen.getByLabelText("Valor recebido (BRL)"), { target: { value: "10.123" } });
  fireEvent.click(screen.getByRole("button", { name: "Aprovar pagamento" })); expect(decisions()).toHaveLength(0);
  fireEvent.change(screen.getByLabelText("Valor recebido (BRL)"), { target: { value: "0" } });
  fireEvent.click(screen.getByRole("button", { name: "Aprovar pagamento" })); expect(screen.getByRole("alert")).toHaveTextContent("Confira o recebimento");
  await approveDraft(); pending = new Promise(resolve => { finish = resolve; });
  fireEvent.click(screen.getByRole("button", { name: "Aprovar pagamento" }));
  await waitFor(() => expect(decisions()).toHaveLength(1));
  expect(screen.getByRole("button", { name: "Aprovar pagamento" })).toBeDisabled();
  expect(JSON.parse(decisions()[0][1].body)).toEqual({ document_id: 20, decision: "approved", amount_received: "123.45", requirements_checked: true });
  expect(decisions()[0][1].headers.Authorization).toBe("Bearer staff-token");
  await act(async () => finish(json({ review: detail.reviews[0], registration_status: "waitlist", notification_result: "sent" })));
  await screen.findByText("Pagamento aprovado. Lista de espera, sem vaga confirmada.");
  expect(screen.queryByRole("button", { name: "Aprovar pagamento" })).not.toBeInTheDocument();
});
it.each(["confirmed", "waitlist"])("shows the saved %s outcome and separates email failure", async status => {
  outcome = status; delivery = status === "confirmed" ? "not_required" : "send_failed";
  current.competitor_capacity = status === "confirmed" ? null : 10;
  openReview(); await approveDraft();
  if (status === "waitlist") expect(screen.getByText(/Sem vaga disponível/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Aprovar pagamento" }));
  await screen.findByText(status === "confirmed" ? "Participação confirmada." : "Pagamento aprovado. Lista de espera, sem vaga confirmada.");
  if (status === "waitlist") expect(screen.getByText(/A análise foi registrada, mas o e-mail/)).toBeInTheDocument();
});
it("requires a trimmed rejection reason without payment acknowledgements", async () => {
  outcome = "awaiting_payment"; openReview(); await screen.findByLabelText("Motivo da recusa");
  fireEvent.click(screen.getByRole("button", { name: "Recusar comprovante e solicitar novo envio" })); expect(decisions()).toHaveLength(0);
  fireEvent.change(screen.getByLabelText("Motivo da recusa"), { target: { value: "  Unreadable  " } });
  fireEvent.click(screen.getByRole("button", { name: "Recusar comprovante e solicitar novo envio" }));
  await screen.findByText("Comprovante rejeitado. Aguardando novo envio.");
  expect(JSON.parse(decisions()[0][1].body)).toEqual({ document_id: 20, decision: "rejected", rejection_reason: "Unreadable" });
});
it("blocks stale submissions, preserves drafts, and requires renewed checks for the refreshed proof", async () => {
  decisionStatus = 409; openReview(); await approveDraft();
  fireEvent.change(screen.getByLabelText("Motivo da recusa"), { target: { value: "Draft reason" } });
  fireEvent.click(screen.getByRole("button", { name: "Aprovar pagamento" }));
  await screen.findByText(/O comprovante ou a análise mudou/);
  expect(screen.getByRole("button", { name: "Aprovar pagamento" })).toBeDisabled();
  current = { ...current, latest_document_id: 21, documents: [...current.documents, { ...current.documents[0], id: 21, original_file_name: "replacement.pdf" }] };
  fireEvent.click(screen.getByRole("button", { name: "Atualizar análise" }));
  await screen.findByText("Atualização concluída. Confira o comprovante novamente.");
  expect(screen.getByLabelText("Valor recebido (BRL)")).toHaveValue("123,45");
  expect(screen.getByLabelText("Motivo da recusa")).toHaveValue("Draft reason");
  expect(screen.getByLabelText("Conferi o recebimento e o valor do pagamento.")).not.toBeChecked();
  await approveDraft(); decisionStatus = 200;
  fireEvent.click(screen.getByRole("button", { name: "Aprovar pagamento" }));
  await screen.findByText("Análise registrada.");
  expect(JSON.parse(decisions()[1][1].body).document_id).toBe(21);
});
it.each(["queue", "detail", "decision"])("handles backend 403 on %s without signing out", async location => {
  const unauthorized = vi.fn(); setApiUnauthorizedHandler(unauthorized);
  if (location === "queue") queueStatus = 403;
  if (location === "detail") fetchMock.mockImplementation(async () => json({}, 403));
  render(tree(location === "queue" ? "/staff/payment-reviews" : "/staff/payment-reviews/T1-001"));
  if (location === "decision") { await approveDraft(); decisionStatus = 403; fireEvent.click(screen.getByRole("button", { name: "Aprovar pagamento" })); }
  await screen.findByText("Acesso restrito à equipe."); expect(unauthorized).not.toHaveBeenCalled();
});
it("uses English labels and provides guild panel navigation from home", async () => {
  render(tree("/")); fireEvent.click(screen.getByRole("link", { name: "Painel da Guilda" }));
  expect(screen.getByText("Guilda Karlbrüder")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("link", { name: "Conferência de pagamentos" }));
  await screen.findByRole("button", { name: "Revisar T1-001" });
  fireEvent.click(screen.getByRole("button", { name: "English" }));
  expect(screen.getByText("Karlbrüder Guild")).toBeInTheDocument();
  expect(screen.getByRole("navigation", { name: "Guild panel" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Payment verification" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Review T1-001" }));
  await screen.findByLabelText("Amount received (BRL)");
});
it("rejects editable metadata as staff access and does not fetch private data", async () => {
  render(tree("/staff/payment-reviews", { ...admin, user: { ...admin.user, app_metadata: {}, user_metadata: { karlbruder_role: "admin" } } }));
  expect(screen.getByRole("alert")).toHaveTextContent("Acesso restrito à equipe."); expect(fetchMock).not.toHaveBeenCalled();
});
it("waits for session restoration and redirects guests with the selected staff destination", async () => {
  const view = render(tree("/staff/payment-reviews/T1-001", null, false));
  expect(screen.getByRole("status")).toHaveTextContent("Carregando sua sessão"); expect(fetchMock).not.toHaveBeenCalled();
  view.rerender(tree("/staff/payment-reviews/T1-001", null));
  await screen.findByRole("heading", { name: "Boas-vindas de volta." });
  expect(screen.getByRole("link", { name: "Esqueci minha senha" })).toHaveAttribute("href", "/account/recover?returnTo=%2Fstaff%2Fpayment-reviews%2FT1-001");
  expect(fetchMock).not.toHaveBeenCalled();
});
it("removes private evidence when the session is lost", async () => {
  const view = openReview(); await screen.findByText("current.pdf");
  view.rerender(tree("/staff/payment-reviews/T1-001", null));
  await screen.findByRole("heading", { name: "Boas-vindas de volta." });
  expect(screen.queryByText("current.pdf")).not.toBeInTheDocument();
});

it("does not offer another decision when a refresh finds the proof already decided", async () => {
  decisionStatus = 409; openReview(); await approveDraft();
  fireEvent.click(screen.getByRole("button", { name: "Aprovar pagamento" }));
  await screen.findByText(/O comprovante ou a análise mudou/);
  current.registration.registration_status = "confirmed";
  fireEvent.click(screen.getByRole("button", { name: "Atualizar análise" }));
  await screen.findByText("Esta evidência já foi decidida ou não está em análise.");
  expect(screen.queryByRole("button", { name: "Aprovar pagamento" })).not.toBeInTheDocument();
});
it("allows correction after validation failure without losing the draft", async () => {
  decisionStatus = 422; openReview(); await approveDraft();
  fireEvent.click(screen.getByRole("button", { name: "Aprovar pagamento" }));
  await screen.findByRole("alert");
  expect(screen.getByLabelText("Valor recebido (BRL)")).toHaveValue("123,45");
  decisionStatus = 200;
  fireEvent.change(screen.getByLabelText("Valor recebido (BRL)"), { target: { value: "0" } });
  fireEvent.click(screen.getByRole("button", { name: "Aprovar pagamento" }));
  await screen.findByText("Análise registrada.");
  expect(JSON.parse(decisions()[1][1].body).amount_received).toBe("0");
});

it("preserves the blocked draft if refreshing a conflict fails", async () => {
  decisionStatus = 409; openReview(); await approveDraft();
  fireEvent.click(screen.getByRole("button", { name: "Aprovar pagamento" }));
  await screen.findByText(/O comprovante ou a análise mudou/);
  detailStatus = 503;
  fireEvent.click(screen.getByRole("button", { name: "Atualizar análise" }));
  await screen.findByText("Não foi possível carregar as análises.");
  expect(screen.getByLabelText("Valor recebido (BRL)")).toHaveValue("123,45");
  expect(screen.getByRole("button", { name: "Aprovar pagamento" })).toBeDisabled();
});
