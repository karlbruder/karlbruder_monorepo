import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import AppRouter from "@/app/router";
import { AuthSessionContext } from "@/features/auth/hooks/use-auth-session";
import { LanguageProvider } from "@/components/language-provider";
import { createQueryClient } from "@/lib/query-client";

vi.mock("@/lib/supabase-client", () => ({ supabase: { auth: {} } }));
const admin = { access_token: "staff-token", user: { id: "staff", app_metadata: { karlbruder_role: "admin" }, user_metadata: {} } } as unknown as Session;
const event = { id: 1, name: "First event", slug: "first", starts_at: "2027-01-17T12:00:00Z", is_internal: false, is_registration_closed: false, competitor_capacity: null, registration_fee_amount: "10.00", pix_key: "fixture", rules_url: "https://example.test/rules" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const fetchMock = vi.fn();
function tree(path: string, session: Session | null = admin, ready = true) {
  return <QueryClientProvider client={createQueryClient()}><LanguageProvider><AuthSessionContext value={{ session, authReady: ready, authLoading: !ready, authError: null, sessionLapsed: false, signInWithGoogle: vi.fn(), signOut: vi.fn(), clearSessionLapsedNotice: vi.fn() }}><MemoryRouter initialEntries={[path]}><AppRouter /></MemoryRouter></AuthSessionContext></LanguageProvider></QueryClientProvider>;
}
beforeEach(() => {
  window.localStorage.clear(); window.history.replaceState({}, "", "/"); vi.stubEnv("VITE_API_BASE_URL", "/api");
  fetchMock.mockReset().mockImplementation(async (url: string, init?: RequestInit) => {
    if (init?.method === "DELETE") return json({ detail: "Tournament with registrations cannot be deleted" }, 409);
    if (init?.method === "PUT" || init?.method === "POST") return json(event);
    if (url.includes("?")) return json({ items: [event, { ...event, id: 2, name: "Second event" }], total: 2 });
    return json(event);
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it("lists multiple tournaments and saves an edit with null fields and policy links", async () => {
  render(tree("/staff/tournaments"));
  fireEvent.click(await screen.findByRole("link", { name: "First event" }));
  await screen.findByDisplayValue("fixture");
  fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Updated event" } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar torneio" }));
  await waitFor(() => expect(fetchMock.mock.calls.some(([, init]) => init?.method === "PUT")).toBe(true));
  const [, init] = fetchMock.mock.calls.find(([, options]) => options?.method === "PUT")!;
  expect(JSON.parse(init.body)).toMatchObject({ name: "Updated event", competitor_capacity: null, pix_key: "fixture", rules_url: "https://example.test/rules", registration_fee_amount: "10.00" });
  expect(init.headers.Authorization).toBe("Bearer staff-token");
  await screen.findByRole("link", { name: "Second event" });
});
it("creates a tournament and sends explicit unconfigured values", async () => {
  render(tree("/staff/tournaments/new"));
  fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "New event" } });
  fireEvent.change(screen.getByLabelText("Início"), { target: { value: "2027-01-17T12:00" } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar torneio" }));
  await waitFor(() => expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST")).toBe(true));
  const [, init] = fetchMock.mock.calls.find(([, options]) => options?.method === "POST")!;
  expect(JSON.parse(init.body)).toMatchObject({ name: "New event", pix_key: null, competitor_capacity: null, is_internal: false });
});
it("asks for deletion confirmation and explains when registrations prevent deletion", async () => {
  render(tree("/staff/tournaments/1"));
  fireEvent.click(await screen.findByRole("button", { name: "Excluir torneio" }));
  expect(fetchMock.mock.calls.every(([, init]) => init?.method !== "DELETE")).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Confirmar exclusão" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("possui inscrições");
  expect(screen.getByDisplayValue("fixture")).toBeInTheDocument();
});
it("keeps drafts after validation errors and supports English", async () => {
  fetchMock.mockImplementation(async () => json({ detail: "bad fields" }, 422));
  render(tree("/staff/tournaments/new"));
  fireEvent.click(screen.getByRole("button", { name: "English" }));
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Draft" } });
  fireEvent.change(screen.getByLabelText("Start"), { target: { value: "2027-01-17T12:00" } });
  fireEvent.click(screen.getByRole("button", { name: "Save tournament" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Check the fields");
  expect(screen.getByLabelText("Name")).toHaveValue("Draft");
});
it("denies non-admins without requests and waits for session restoration", () => {
  const view = render(tree("/staff/tournaments", null, false));
  expect(screen.getByRole("status")).toHaveTextContent("Carregando sua sessão");
  view.rerender(tree("/staff/tournaments", { ...admin, user: { ...admin.user, app_metadata: {} } }));
  expect(screen.getByRole("alert")).toHaveTextContent("Acesso restrito");
  expect(fetchMock).not.toHaveBeenCalled();
});

it("deletes an eligible tournament after confirmation and returns to the list", async () => {
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    if (init?.method === "DELETE") return new Response(null, { status: 204 });
    return url.includes("?") ? json({ items: [], total: 0 }) : json(event);
  });
  render(tree("/staff/tournaments/1"));
  fireEvent.click(await screen.findByRole("button", { name: "Excluir torneio" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirmar exclusão" }));
  await screen.findByText("Nenhum torneio encontrado.");
  expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "DELETE")).toHaveLength(1);
});
