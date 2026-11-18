import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import type { Session } from "@supabase/supabase-js";
import { renderWithQuery } from "@/testing/render-with-query";
import type { OwnerRegistration, Tournament } from "@/features/tournament/api/tournaments";
import { RegistrationEdit } from "@/features/tournament/components/registration-edit";

vi.mock("@/features/tournament/api/tournament-tags", async original => ({ ...await original<typeof import("@/features/tournament/api/tournament-tags")>(), getTags: async () => [], getSelection: async () => [] }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const session = { access_token: "token", user: { id: "owner" } } as Session;
const tournament = { id: 42, is_registration_closed: false, registration_opens_on: "2026-01-01", registration_closes_on: "2027-01-01" } as Tournament;
const registration = { registration_number: "T42-1", registration_status: "confirmed", tournament_id: 42, full_name: "Ana", email: "ana@example.test", birth_date: "2000-01-01", identity_document_type: "passport", identity_document_number: "AB123", phone: "123", city: "City", country: "Brasil", hema_experience_description: "2 anos", previous_tournament_count: 0, emergency_contact_name: "Contato", emergency_contact_phone: "456" } as OwnerRegistration;

it("saves corrected fields without sending status or acceptance evidence", async () => {
  const request = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<{ ok: boolean }>>(async () => ({ ok: true }));
  vi.stubGlobal("fetch", request);
  const saved = vi.fn();
  renderWithQuery(<RegistrationEdit session={session} tournament={tournament} registration={registration} language="pt" onBack={() => {}} onSaved={saved} />);
  fireEvent.change(screen.getByLabelText("Nome completo *"), { target: { value: "Ana Nova" } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
  await waitFor(() => expect(saved).toHaveBeenCalledOnce());
  const payload = JSON.parse(String(request.mock.calls[0][1]?.body));
  expect(payload.full_name).toBe("Ana Nova");
  expect(payload).not.toHaveProperty("registration_status");
  expect(payload).not.toHaveProperty("accepts_rules");
  expect(screen.getByRole("status")).toHaveTextContent("Dados da inscrição salvos");
});

it("retains entered data when the backend rejects a duplicate", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 409 })));
  renderWithQuery(<RegistrationEdit session={session} tournament={tournament} registration={registration} language="pt" onBack={() => {}} onSaved={() => {}} />);
  fireEvent.change(screen.getByLabelText("Número do documento *"), { target: { value: "DUPLICATE" } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("conflito");
  expect(screen.getByLabelText("Número do documento *")).toHaveValue("DUPLICATE");
});

it("lets staff correct a cancelled registration without owner-only controls", async () => {
  const request = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<{ ok: boolean }>>(async () => ({ ok: true }));
  vi.stubGlobal("fetch", request);
  renderWithQuery(<RegistrationEdit staff session={session} tournament={tournament} registration={{ ...registration, registration_status: "cancelled" }} language="en" onBack={() => {}} onSaved={() => {}} />);
  expect(screen.getByRole("heading", { name: "Manage registration" })).toBeInTheDocument();
  expect(screen.queryByText("Review my declarations")).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Full name *"), { target: { value: "Ana Corrected" } });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(request).toHaveBeenCalledOnce());
  expect(JSON.parse(String(request.mock.calls[0][1]?.body)).full_name).toBe("Ana Corrected");
  expect(await screen.findByText("Registration details saved.")).toBeInTheDocument();
});

it.each([
  ["pt", "Rever minhas declarações", "Política de Privacidade"],
  ["en", "Review my declarations", "Privacy Policy"],
] as const)("provides organizer and privacy contacts with read-only declarations in %s", (language, summary, privacy) => {
  renderWithQuery(<RegistrationEdit session={session} tournament={tournament} registration={registration} language={language} onBack={() => {}} onSaved={() => {}} />);
  fireEvent.click(screen.getByText(summary));
  expect(screen.getByRole("link", { name: "suporte@karlbruder.com" })).toHaveAttribute("href", "mailto:suporte@karlbruder.com");
  expect(screen.getByRole("link", { name: privacy })).toHaveAttribute("href", "/privacy-policy");
  expect(screen.queryByRole("button", { name: /regulamento aceito|accepted tournament rules/ })).not.toBeInTheDocument();
  expect(screen.getByText(language === "pt" ? "Informações verdadeiras: Não aceita" : "Truthful information: Not accepted")).toBeInTheDocument();
});

it("opens the accepted rules version from the read-only declarations", async () => {
  const downloadUrl = "https://files.example.test/accepted-rules.pdf";
  const request = vi.fn(async () => ({ ok: true, json: async () => ({ download_url: downloadUrl }) }));
  const tab = { opener: window, location: { replace: vi.fn() }, close: vi.fn() };
  vi.stubGlobal("open", vi.fn(() => tab));
  vi.stubGlobal("fetch", request);
  renderWithQuery(<RegistrationEdit session={session} tournament={tournament}
    registration={{ ...registration, rules_version_id: 11, cancellation_policy_version_id: null }}
    language="en" onBack={() => {}} onSaved={() => {}} />);
  fireEvent.click(screen.getByText("Review my declarations"));
  expect(screen.queryByRole("button", { name: /accepted cancellation policy/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /View accepted tournament rules/ }));
  await waitFor(() => expect(tab.location.replace).toHaveBeenCalledWith(downloadUrl));
  expect(request).toHaveBeenCalledWith("/api/tournaments/42/policy-documents/rules/11/download-url", {
    headers: { Authorization: "Bearer token" },
  });
});


it.each([true, false])("staff confirms cancellation when refunds allowed is %s", async refundsAllowed => {
  const request = vi.fn(async () => ({ ok: true, status: 204 }));
  vi.stubGlobal("fetch", request);
  const saved = vi.fn();
  renderWithQuery(<RegistrationEdit staff session={session} tournament={{ ...tournament, refunds_allowed: refundsAllowed }} registration={{ ...registration, parental_consent_required: true }} language="en" onBack={() => {}} onSaved={saved} />);
  expect(screen.getByText(/Signed parental consent form missing/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Cancel participation" }));
  expect(request).not.toHaveBeenCalled();
  expect(screen.getByText(refundsAllowed ? /verified payment creates a refund obligation/ : /does not allow refunds/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Confirm cancellation" }));
  await waitFor(() => expect(saved).toHaveBeenCalledOnce());
  expect(request).toHaveBeenCalledWith(expect.stringContaining("/registrations/T42-1/cancel"), expect.objectContaining({ method: "POST" }));
  expect(screen.getByText("Registration cancelled.")).toBeInTheDocument();
});

it("shows a cancellation error and permits retry", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500 })));
  renderWithQuery(<RegistrationEdit staff session={session} tournament={tournament} registration={registration} language="en" onBack={() => {}} onSaved={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: "Cancel participation" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm cancellation" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not cancel");
  expect(screen.getByRole("button", { name: "Confirm cancellation" })).toBeEnabled();
});
