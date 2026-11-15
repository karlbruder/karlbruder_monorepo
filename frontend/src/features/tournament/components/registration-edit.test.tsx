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
