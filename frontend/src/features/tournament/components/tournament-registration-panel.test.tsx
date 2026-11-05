import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import type { Session } from "@supabase/supabase-js";
import { renderWithQuery as render } from "@/testing/render-with-query";
import type { Tournament } from "@/features/tournament/api/tournaments";
import TournamentRegistrationPanel from "@/features/tournament/components/tournament-registration-panel";

const tournament = { id: 42, registration_fee_amount: null } as Tournament;
const session = { access_token: "token", user: { id: "owner" } } as Session;
const registration = { tournament_id: 42, registration_number: "T42-1", registration_status: "confirmed", full_name: "Fixture", email: "fixture@example.test", parental_consent_required: true };
const payment = { registration_number: "T42-1", registration_fee_amount: null, amount_received: "10.00", payment_due_at: null, payment_options: { pix: { pix_key: null } }, latest_payment_proof: null };
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it("shows registration and missing consent separately from payment and refreshes after upload", async () => {
  vi.stubEnv("VITE_API_BASE_URL", "/api");
  let required = true;
  const request = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith("/upload-url")) return { ok: true, status: 200, json: async () => ({ storage_key: "key", upload_url: "https://upload.test", expires_in_seconds: 900, required_headers: {} }) };
    if (url === "https://upload.test") return { ok: true };
    if (url.endsWith("/parental-consent-form") && init?.method === "POST") { required = false; return { ok: true }; }
    if (url.endsWith("/payment")) return { ok: true, json: async () => payment };
    return { ok: true, json: async () => ({ ...registration, parental_consent_required: required }) };
  });
  vi.stubGlobal("fetch", request);
  render(<TournamentRegistrationPanel tournament={tournament} session={session} registrationNumber="T42-1" language="en" />);
  const input = await screen.findByLabelText("Signed parental consent form");
  expect(screen.getByText(/signed parental consent form is required/)).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Your registration" })).toBeInTheDocument();
  const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
  const file = new File([bytes], "term.pdf", { type: "application/pdf" });
  Object.defineProperty(file, "arrayBuffer", { value: async () => bytes.buffer });
  fireEvent.change(input, { target: { files: [file] } });
  fireEvent.click(screen.getByRole("button", { name: "Upload form" }));
  await waitFor(() => expect(screen.queryByLabelText("Signed parental consent form")).not.toBeInTheDocument());
  expect(screen.getByText(/Your participation is confirmed/)).toBeInTheDocument();
  expect(request.mock.calls.some(([url, init]) => url.endsWith("/parental-consent-form") && init?.method === "POST")).toBe(true);
});

it("keeps registration status and consent visible when payment loading fails", async () => {
  vi.stubEnv("VITE_API_BASE_URL", "/api");
  vi.stubGlobal("fetch", vi.fn(async (url: string) => url.endsWith("/payment") ? { ok: false, status: 503, json: async () => ({}) } : { ok: true, json: async () => registration }));
  render(<TournamentRegistrationPanel tournament={tournament} session={session} registrationNumber="T42-1" language="en" />);
  expect(await screen.findByLabelText("Signed parental consent form")).toBeInTheDocument();
  expect(await screen.findByRole("alert")).toHaveTextContent("could not load payment instructions");
});

it("refreshes a waitlisted registration to confirmed without another payment", async () => {
  vi.stubEnv("VITE_API_BASE_URL", "/api");
  let status = "waitlist";
  vi.stubGlobal("fetch", vi.fn(async (url: string) => url.endsWith("/payment")
    ? { ok: true, json: async () => payment }
    : { ok: true, json: async () => ({ ...registration, registration_status: status, parental_consent_required: false }) }));
  render(<TournamentRegistrationPanel tournament={tournament} session={session} registrationNumber="T42-1" language="en" />);
  await screen.findByText("Paid waitlist");
  expect(await screen.findByText(/Do not pay again/)).toBeInTheDocument();
  expect(screen.queryByRole("form", { name: "Payment proof" })).not.toBeInTheDocument();
  status = "confirmed";
  fireEvent.click(await screen.findByRole("button", { name: "Refresh status" }));
  await screen.findByText("Confirmed");
  expect(screen.getByText(/Your participation is confirmed/)).toBeInTheDocument();
});

it.each(["awaiting_payment", "awaiting_payment_confirmation"])("suppresses payment actions while an approved %s registration refreshes", async status => {
  vi.stubEnv("VITE_API_BASE_URL", "/api");
  let registrationRequests = 0;
  let resolveRefresh!: (value: unknown) => void;
  const refresh = new Promise(resolve => { resolveRefresh = resolve; });
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (url.endsWith("/payment")) return { ok: true, json: async () => ({ ...payment, payment_options: { pix: { pix_key: "pix-key" } }, current_review: { document_id: 1, decision: "approved", rejection_reason: null, reviewed_at: "2026-11-05T12:00:00Z" } }) };
    registrationRequests++;
    if (registrationRequests > 1) return refresh;
    return { ok: true, json: async () => ({ ...registration, registration_status: status, parental_consent_required: false }) };
  }));
  render(<TournamentRegistrationPanel tournament={tournament} session={session} registrationNumber="T42-1" language="en" />);
  await screen.findByText("Payment confirmed");
  await waitFor(() => expect(registrationRequests).toBe(2));
  expect(screen.queryByText("pix-key")).not.toBeInTheDocument();
  expect(screen.queryByRole("form", { name: "Payment proof" })).not.toBeInTheDocument();
  expect(screen.queryByText(/Complete the Pix transfer|We received your proof/)).not.toBeInTheDocument();
  resolveRefresh({ ok: true, json: async () => ({ ...registration, registration_status: "waitlist", parental_consent_required: false }) });
  expect(await screen.findByText("Paid waitlist")).toBeInTheDocument();
  expect(screen.getByText(/Do not pay again/)).toBeInTheDocument();
});

it("refreshes registration when retrying a failed payment request", async () => {
  vi.stubEnv("VITE_API_BASE_URL", "/api");
  let paymentRequests = 0;
  let registrationRequests = 0;
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (url.endsWith("/payment")) {
      paymentRequests++;
      return paymentRequests === 1 ? { ok: false, status: 503, json: async () => ({}) } : { ok: true, json: async () => payment };
    }
    registrationRequests++;
    return { ok: true, json: async () => ({ ...registration, registration_status: registrationRequests > 1 ? "confirmed" : "awaiting_payment", parental_consent_required: false }) };
  }));
  render(<TournamentRegistrationPanel tournament={tournament} session={session} registrationNumber="T42-1" language="en" />);
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByText("Confirmed")).toBeInTheDocument();
  await screen.findByRole("heading", { name: "Registration payment" });
  expect(registrationRequests).toBe(2);
});

it("shows a rejected proof and replacement form while the older registration status refreshes", async () => {
  vi.stubEnv("VITE_API_BASE_URL", "/api");
  let registrationRequests = 0;
  let resolveRefresh!: (value: unknown) => void;
  const refresh = new Promise(resolve => { resolveRefresh = resolve; });
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (url.endsWith("/payment")) return { ok: true, json: async () => ({ ...payment, amount_received: null, latest_payment_proof: { original_file_name: "proof.pdf", submitted_at: "2026-11-05T10:00:00Z", content_type: "application/pdf" }, current_review: { document_id: 1, decision: "rejected", rejection_reason: "Unreadable proof", reviewed_at: "2026-11-05T12:00:00Z" } }) };
    registrationRequests++;
    if (registrationRequests > 1) return refresh;
    return { ok: true, json: async () => ({ ...registration, registration_status: "awaiting_payment_confirmation", parental_consent_required: false }) };
  }));
  render(<TournamentRegistrationPanel tournament={tournament} session={session} registrationNumber="T42-1" language="en" />);
  expect(await screen.findByText("Unreadable proof")).toBeInTheDocument();
  expect(screen.getByRole("form", { name: "Payment proof" })).toBeInTheDocument();
  expect(screen.queryByText(/We received your proof/)).not.toBeInTheDocument();
  await waitFor(() => expect(registrationRequests).toBe(2));
  resolveRefresh({ ok: true, json: async () => ({ ...registration, registration_status: "awaiting_payment", parental_consent_required: false }) });
  await screen.findByText("Awaiting payment");
  expect(screen.getByText("Unreadable proof")).toBeInTheDocument();
});

it("keeps confirmed payment visible and permits retry after a temporary status refresh failure", async () => {
  vi.stubEnv("VITE_API_BASE_URL", "/api");
  let registrationRequests = 0;
  let resolveRefresh!: (value: unknown) => void;
  const refresh = new Promise(resolve => { resolveRefresh = resolve; });
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (url.endsWith("/payment")) return { ok: true, json: async () => ({ ...payment, current_review: { document_id: 1, decision: "approved", rejection_reason: null, reviewed_at: "2026-11-05T12:00:00Z" } }) };
    registrationRequests++;
    if (registrationRequests === 2) return refresh;
    return { ok: true, json: async () => ({ ...registration, registration_status: registrationRequests === 1 ? "awaiting_payment_confirmation" : "confirmed", parental_consent_required: false }) };
  }));
  render(<TournamentRegistrationPanel tournament={tournament} session={session} registrationNumber="T42-1" language="en" />);
  await screen.findByText("Payment confirmed");
  await waitFor(() => expect(registrationRequests).toBe(2));
  await act(async () => resolveRefresh({ ok: false, status: 503, json: async () => ({}) }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not refresh your registration");
  expect(screen.getByText("Payment confirmed")).toBeInTheDocument();
  expect(screen.queryByRole("form", { name: "Payment proof" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByText("Confirmed")).toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

it.each([401, 403, 404])("hides cached registration and payment when a refresh returns %s", async status => {
  vi.stubEnv("VITE_API_BASE_URL", "/api");
  let registrationRequests = 0;
  let resolveRefresh!: (value: unknown) => void;
  const refresh = new Promise(resolve => { resolveRefresh = resolve; });
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (url.endsWith("/payment")) return { ok: true, json: async () => ({ ...payment, current_review: { document_id: 1, decision: "approved", rejection_reason: null, reviewed_at: "2026-11-05T12:00:00Z" } }) };
    registrationRequests++;
    if (registrationRequests > 1) return refresh;
    return { ok: true, json: async () => ({ ...registration, registration_status: "awaiting_payment_confirmation", parental_consent_required: false }) };
  }));
  render(<TournamentRegistrationPanel tournament={tournament} session={session} registrationNumber="T42-1" language="en" />);
  await screen.findByText("Payment confirmed");
  await waitFor(() => expect(registrationRequests).toBe(2));
  await act(async () => resolveRefresh({ ok: false, status, json: async () => ({}) }));
  await screen.findByRole("alert");
  expect(screen.queryByText("Payment confirmed")).not.toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Your registration" })).not.toBeInTheDocument();
});

it.each([503, 403])("keeps a successful proof submission distinct from payment approval when the status refresh returns %s", async status => {
  vi.stubEnv("VITE_API_BASE_URL", "/api");
  let submitted = false;
  let resolveRefresh!: (value: unknown) => void;
  const refresh = new Promise(resolve => { resolveRefresh = resolve; });
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith("/payment")) return { ok: true, json: async () => ({ ...payment, amount_received: null, payment_options: { pix: { pix_key: "pix-key" } }, latest_payment_proof: submitted ? { original_file_name: "proof.pdf", content_type: "application/pdf", submitted_at: "2026-11-05T10:00:00Z" } : null }) };
    if (url.endsWith("/payment-proof/upload-url")) return { ok: true, json: async () => ({ storage_key: "key", upload_url: "https://upload.test", expires_in_seconds: 900, required_headers: {} }) };
    if (url === "https://upload.test") return { ok: true };
    if (url.endsWith("/payment-proof") && init?.method === "POST") {
      submitted = true;
      return { ok: true, json: async () => ({ ...registration, parental_consent_required: undefined, registration_status: "awaiting_payment_confirmation" }) };
    }
    if (submitted) return refresh;
    return { ok: true, json: async () => ({ ...registration, registration_status: "awaiting_payment", parental_consent_required: true }) };
  }));
  render(<TournamentRegistrationPanel tournament={tournament} session={session} registrationNumber="T42-1" language="en" />);
  const input = await screen.findByLabelText("Payment proof", { selector: "input" });
  const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
  const file = new File([bytes], "proof.pdf", { type: "application/pdf" });
  Object.defineProperty(file, "arrayBuffer", { value: async () => bytes.buffer });
  fireEvent.change(input, { target: { files: [file] } });
  fireEvent.click(screen.getByRole("button", { name: "Upload payment proof" }));
  expect(await screen.findByText(/We received your proof of payment/)).toBeInTheDocument();
  expect(screen.getByText("Awaiting payment confirmation")).toBeInTheDocument();
  expect(screen.getByLabelText("Signed parental consent form")).toBeInTheDocument();
  expect(screen.queryByText(/Complete the Pix transfer/)).not.toBeInTheDocument();
  expect(screen.queryByText("Payment confirmed")).not.toBeInTheDocument();
  await act(async () => resolveRefresh({ ok: false, status, json: async () => ({}) }));
  await screen.findByRole("alert");
  if (status === 503) {
    expect(screen.getByText(/We received your proof of payment/)).toBeInTheDocument();
    expect(screen.getByLabelText("Signed parental consent form")).toBeInTheDocument();
    expect(screen.queryByText(/Complete the Pix transfer/)).not.toBeInTheDocument();
  } else {
    expect(screen.queryByRole("heading", { name: "Your registration" })).not.toBeInTheDocument();
    expect(screen.queryByText(/We received your proof of payment/)).not.toBeInTheDocument();
  }
});
