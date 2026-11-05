import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
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
