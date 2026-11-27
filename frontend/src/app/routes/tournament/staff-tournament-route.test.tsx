vi.mock("@/features/tournament/api/staff-products", async (original) => ({ ...await original<typeof import("@/features/tournament/api/staff-products")>(), useStaffProducts: () => ({ data: [], isLoading: false, isError: false, refetch: vi.fn() }) }));
vi.mock("@/features/tournament/api/tournament-tags", async (original) => ({ ...await original<typeof import("@/features/tournament/api/tournament-tags")>(), getTags: async () => [], getSelection: async () => [] }));
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import AppRouter from "@/app/router";
import { AuthSessionContext } from "@/features/auth/hooks/use-auth-session";
import { LanguageProvider } from "@/components/language-provider";
import { createQueryClient } from "@/lib/query-client";

vi.mock("@/lib/supabase-client", () => ({ supabase: { auth: {} } }));
const admin = { access_token: "staff-token", user: { id: "staff", app_metadata: { karlbruder_role: "admin" }, user_metadata: {} } } as unknown as Session;
const event = { id: 1, name: "First event", slug: "first", starts_at: "2027-01-17T12:00:00Z", is_internal: false, is_registration_closed: false, competitor_capacity: null, pix_key: "fixture" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const fetchMock = vi.fn();
function tree(path: string, session: Session | null = admin, ready = true, client: QueryClient = createQueryClient()) {
  return <QueryClientProvider client={client}><LanguageProvider><AuthSessionContext value={{ session, authReady: ready, authLoading: !ready, authError: null, sessionLapsed: false, signInWithGoogle: vi.fn(), signOut: vi.fn(), clearSessionLapsedNotice: vi.fn() }}><MemoryRouter initialEntries={[path]}><AppRouter /></MemoryRouter></AuthSessionContext></LanguageProvider></QueryClientProvider>;
}
beforeEach(() => {
  window.localStorage.clear(); window.history.replaceState({}, "", "/"); vi.stubEnv("VITE_API_BASE_URL", "/api");
  fetchMock.mockReset().mockImplementation(async (url: string, init?: RequestInit) => {
    if (url.endsWith("/policy-documents")) return json({});
    if (url.endsWith("/documents")) return json([]);
    if (init?.method === "DELETE") return json({ detail: "Tournament with registrations cannot be deleted" }, 409);
    if (init?.method === "PUT" || init?.method === "POST") return json(event);
    if (url.includes("?")) return json({ items: [event, { ...event, id: 2, name: "Second event" }], total: 2 });
    return json(event);
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it("lists multiple tournaments and saves tournament settings independently of document uploads", async () => {
  render(tree("/staff/tournaments"));
  fireEvent.click(await screen.findByRole("link", { name: "First event" }));
  await screen.findByDisplayValue("fixture");
  fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Updated event" } });
  const refunds = screen.getByRole("checkbox", { name: "Permitir reembolsos conforme a política de cancelamento" });
  expect(refunds).not.toBeChecked();
  fireEvent.click(refunds);
  fireEvent.click(screen.getByRole("button", { name: "Salvar torneio" }));
  await waitFor(() => expect(fetchMock.mock.calls.some(([, init]) => init?.method === "PUT")).toBe(true));
  const [, init] = fetchMock.mock.calls.find(([, options]) => options?.method === "PUT")!;
  const payload = JSON.parse(init.body);
  expect(payload).toMatchObject({ name: "Updated event", competitor_capacity: null, pix_key: "fixture", refunds_allowed: true });
  for (const field of ["rules_text", "rules_url", "cancellation_policy_text", "cancellation_policy_url"]) {
    expect(payload).not.toHaveProperty(field);
  }
  expect(JSON.parse(init.body)).not.toHaveProperty("registration_fee_amount");
  expect(init.headers.Authorization).toBe("Bearer staff-token");
  await screen.findByRole("link", { name: "Second event" });
});
it("opens the saved tournament for document uploads after creating it", async () => {
  render(tree("/staff/tournaments/new"));
  expect(screen.getByText("Salve o torneio para enviar os documentos.")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Enviar arquivo" })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "New event" } });
  fireEvent.change(screen.getByLabelText("Início"), { target: { value: "2027-01-17" } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar torneio" }));
  await waitFor(() => expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST")).toBe(true));
  const [, init] = fetchMock.mock.calls.find(([, options]) => options?.method === "POST")!;
  expect(JSON.parse(init.body)).toMatchObject({ name: "New event", pix_key: null, competitor_capacity: null, is_internal: false, refunds_allowed: false });
  expect(await screen.findAllByRole("button", { name: "Enviar arquivo" })).toHaveLength(2);
});
it("publishes both policies independently and keeps the current file on a failed replacement", async () => {
  const previousRules = { id: 2, original_file_name: "regras-anteriores.pdf" };
  const endpoint = "/api/staff/tournaments/1/policy-documents";
  const storage = "https://storage.example.test";
  let finishRules!: (response: Response) => void;
  let attempts = 0;
  fetchMock.mockImplementation(async (url: string) => {
    if (url === "/api/tournaments/1/policy-documents") return json({ rules: previousRules });
    if (url === endpoint + "/rules/upload-url") return json({
      storage_key: "stage-rules", upload_url: storage + "/rules",
      required_headers: { "Content-Type": "application/octet-stream" },
    });
    if (url === endpoint + "/cancellation_policy/upload-url") return json({
      storage_key: "stage-cancellation", upload_url: storage + "/cancellation",
      required_headers: { "Content-Type": "application/octet-stream" },
    });
    if (url.startsWith(storage)) return new Response(null, { status: 200 });
    if (url === endpoint + "/rules") {
      attempts += 1;
      if (attempts === 1) return new Promise<Response>(resolve => { finishRules = resolve; });
      return json({ id: 8, original_file_name: "regras-novas.pdf" }, 201);
    }
    if (url === endpoint + "/cancellation_policy") return json({ id: 7, original_file_name: "cancelamento.pdf" }, 201);
    return json(event);
  });

  render(tree("/staff/tournaments/1"));
  const rules = within(await screen.findByRole("region", { name: "Regulamento" }));
  const cancellation = within(screen.getByRole("region", { name: "Política de cancelamento" }));
  fireEvent.click(rules.getByRole("button", { name: "Substituir" }));
  const newRules = new File(["%PDF"], "regras-novas.pdf", { type: "application/pdf" });
  fireEvent.change(rules.getByLabelText("Arquivo"), { target: { files: [newRules] } });
  fireEvent.click(rules.getByRole("button", { name: "Publicar documento" }));
  await waitFor(() => expect(finishRules).toBeDefined());
  expect(rules.getByRole("status")).toHaveTextContent("Publicando documento");
  expect(rules.getByRole("button", { name: /regras-anteriores.pdf/ })).toBeInTheDocument();
  expect(rules.getByRole("button", { name: "Publicar documento" })).toBeDisabled();

  fireEvent.click(cancellation.getByRole("button", { name: "Enviar arquivo" }));
  fireEvent.change(cancellation.getByLabelText("Arquivo"), { target: { files: [new File(["%PDF"], "cancelamento.pdf")] } });
  fireEvent.click(cancellation.getByRole("button", { name: "Publicar documento" }));
  expect(await cancellation.findByRole("button", { name: /cancelamento.pdf/ })).toBeInTheDocument();

  finishRules(json({ detail: "Policy file type is not allowed" }, 415));
  expect(await rules.findByRole("alert")).toHaveTextContent("Escolha um arquivo PDF, JPEG ou PNG.");
  expect(rules.getByRole("button", { name: /regras-anteriores.pdf/ })).toBeInTheDocument();
  fireEvent.click(rules.getByRole("button", { name: "Publicar documento" }));
  expect(await rules.findByRole("button", { name: /regras-novas.pdf/ })).toBeInTheDocument();
  expect(rules.getByRole("status")).toHaveTextContent("Documento publicado.");
  expect(cancellation.getByRole("button", { name: /cancelamento.pdf/ })).toBeInTheDocument();

  const [, put] = fetchMock.mock.calls.find(([url]) => url === storage + "/rules")!;
  expect(put.method).toBe("PUT");
  expect([...put.headers]).toEqual([["content-type", "application/octet-stream"]]);
  expect(put.body).toBe(newRules);
  const [, finalize] = fetchMock.mock.calls.find(([url]) => url === endpoint + "/rules")!;
  expect(finalize.headers.Authorization).toBe("Bearer staff-token");
  expect(JSON.parse(finalize.body)).toEqual({ storage_key: "stage-rules", original_file_name: "regras-novas.pdf" });
});

it("adds a titled competitor’s guide without saving the tournament form", async () => {
  const listing = "/api/tournaments/1/documents";
  const endpoint = "/api/staff/tournaments/1/documents";
  const uploadUrl = "https://storage.example.test/guide";
  const guide = { id: 9, title: "Guia do competidor", original_file_name: "guide.pdf", content_type: "application/pdf" };
  let documents: typeof guide[] = [];
  fetchMock.mockImplementation(async (url: string) => {
    if (url === listing) return json(documents);
    if (url.endsWith("/policy-documents")) return json({});
    if (url === endpoint + "/upload-url") return json({
      storage_key: "staged-guide", upload_url: uploadUrl, required_headers: { "Content-Type": "application/octet-stream" },
    });
    if (url === uploadUrl) return new Response(null, { status: 200 });
    if (url === endpoint) {
      documents = [guide];
      return json(guide, 201);
    }
    return json(event);
  });
  render(tree("/staff/tournaments/1"));
  const additional = within(await screen.findByRole("region", { name: "Documentos adicionais" }));
  expect(await additional.findByText("Nenhum documento adicionado.")).toBeInTheDocument();
  const add = additional.getByRole("button", { name: "Adicionar documento" });
  fireEvent.click(add);
  const title = additional.getByLabelText("Título do documento");
  expect(title).toHaveFocus();
  const file = new File(["%PDF"], "guide.pdf", { type: "application/pdf" });
  fireEvent.change(additional.getByLabelText("Arquivo"), { target: { files: [file] } });
  expect(additional.getByRole("button", { name: "Adicionar arquivo" })).toBeDisabled();
  fireEvent.change(title, { target: { value: " Guia do competidor " } });
  fireEvent.click(additional.getByRole("button", { name: "Adicionar arquivo" }));
  expect(await additional.findByRole("button", { name: /Guia do competidor · guide.pdf/ })).toBeInTheDocument();
  expect(add).toHaveFocus();
  expect(fetchMock).toHaveBeenCalledWith(uploadUrl, expect.objectContaining({ method: "PUT", body: file }));
  const [, publish] = fetchMock.mock.calls.find(([url]) => url === endpoint)!;
  expect(JSON.parse(publish.body)).toEqual({
    storage_key: "staged-guide", title: "Guia do competidor", original_file_name: "guide.pdf",
  });
  expect(fetchMock.mock.calls.some(([url, options]) => url === "/api/staff/tournaments/1" && options?.method === "PUT")).toBe(false);
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
  fireEvent.click(screen.getByRole("button", { name: /^Idioma/ }));
  fireEvent.click(screen.getByRole("button", { name: "English" }));
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Draft" } });
  fireEvent.change(screen.getByLabelText("Start"), { target: { value: "2027-01-17" } });
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
  const client = createQueryClient();
  render(tree("/staff/tournaments/1", admin, true, client));
  fireEvent.click(await screen.findByRole("button", { name: "Excluir torneio" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirmar exclusão" }));
  await screen.findByText("Nenhum torneio encontrado.");
  expect(client.getQueryCache().findAll({ queryKey: ["staff-tournament", "staff", "1"] }).every(query => query.state.isInvalidated)).toBe(true);
  expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "DELETE")).toHaveLength(1);
});

it("waits for current details when an older tournament is cached", async () => {
  const client = createQueryClient();
  client.setQueryData(["staff-tournament", "staff", "1", "old-visit"], { ...event, pix_key: "old-key" });
  let finish!: (response: Response) => void;
  fetchMock.mockImplementation(async (_url: string, init?: RequestInit) => init?.method === "PUT" ? json(event) : new Promise<Response>(resolve => { finish = resolve; }));
  render(tree("/staff/tournaments/1", admin, true, client));
  await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  expect(screen.queryByLabelText("Chave Pix")).not.toBeInTheDocument();
  finish(json({ ...event, name: "Current event", pix_key: "current-key" }));
  await screen.findByDisplayValue("current-key");
  fireEvent.change(screen.getByLabelText("Descrição"), { target: { value: "Edited" } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar torneio" }));
  await waitFor(() => expect(fetchMock.mock.calls.some(([, init]) => init?.method === "PUT")).toBe(true));
  const [, init] = fetchMock.mock.calls.find(([, options]) => options?.method === "PUT")!;
  expect(JSON.parse(init.body)).toMatchObject({ name: "Current event", pix_key: "current-key", description: "Edited" });
});

it("keeps an active draft after a failed refresh but hides controls after a 404", async () => {
  const client = createQueryClient();
  render(tree("/staff/tournaments/1", admin, true, client));
  await screen.findByLabelText("Descrição");
  fireEvent.change(screen.getByLabelText("Descrição"), { target: { value: "My draft" } });
  fetchMock.mockImplementation(async () => json({ detail: "Unavailable" }, 503));
  await client.invalidateQueries({ queryKey: ["staff-tournament"] });
  await screen.findByRole("alert");
  expect(screen.getByLabelText("Descrição")).toHaveValue("My draft");
  fetchMock.mockImplementation(async () => json({ detail: "Tournament not found" }, 404));
  fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
  await waitFor(() => expect(screen.queryByRole("button", { name: "Salvar torneio" })).not.toBeInTheDocument());
  expect(screen.queryByRole("button", { name: "Excluir torneio" })).not.toBeInTheDocument();
});

it("preserves all untouched timestamp instants including fractional seconds", async () => {
  const dates = { starts_at: "2027-11-07T06:30:00.123Z", ends_at: "2027-11-07T07:30:00.456Z", payment_due_at: "2027-11-07T06:45:00.789Z" };
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => init?.method === "PUT" ? json(event) : url.includes("?") ? json({ items: [], total: 0 }) : json({ ...event, ...dates }));
  render(tree("/staff/tournaments/1"));
  await screen.findByLabelText("Descrição");
  expect(screen.getByText(/fuso horário do navegador/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Descrição"), { target: { value: "Edited" } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar torneio" }));
  await waitFor(() => expect(fetchMock.mock.calls.some(([, init]) => init?.method === "PUT")).toBe(true));
  const [, init] = fetchMock.mock.calls.find(([, options]) => options?.method === "PUT")!;
  expect(JSON.parse(init.body)).toMatchObject(dates);
});

it("sends start and end dates at their day boundaries in the browser time zone", async () => {
  render(tree("/staff/tournaments/1"));
  await screen.findByLabelText("Início");
  fireEvent.change(screen.getByLabelText("Início"), { target: { value: "2028-01-17" } });
  fireEvent.change(screen.getByLabelText("Término"), { target: { value: "2028-01-18" } });
  fireEvent.change(screen.getByLabelText("Prazo de pagamento"), { target: { value: "2028-01-15" } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar torneio" }));
  await waitFor(() => expect(fetchMock.mock.calls.some(([, init]) => init?.method === "PUT")).toBe(true));
  const [, init] = fetchMock.mock.calls.find(([, options]) => options?.method === "PUT")!;
  expect(JSON.parse(init.body)).toMatchObject({ starts_at: new Date("2028-01-17T00:00:00").toISOString(), ends_at: new Date("2028-01-18T23:59:59").toISOString(), payment_due_at: new Date("2028-01-15T23:59:59").toISOString() });
});

it.each([
  [422, [{ loc: ["body", "slug"], msg: "invalid", type: "value_error" }], "Identificador (use palavras minúsculas separadas por hífens simples)"],
  [409, "Tournament slug already exists", "identificador já está em uso"],
  [409, "Capacity cannot be below confirmed participation", "capacidade não pode ser menor"],
  [503, "private server error", "Não foi possível salvar"],
])("reports actionable failures for response %s and preserves the draft", async (status, detail, message) => {
  fetchMock.mockImplementation(async () => json({ detail }, status));
  render(tree("/staff/tournaments/new"));
  fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Draft" } });
  fireEvent.change(screen.getByLabelText("Início"), { target: { value: "2027-01-17" } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar torneio" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(message);
  expect(screen.getByLabelText("Nome")).toHaveValue("Draft");
});

it("localizes validation and server errors in English", async () => {
  let detail: unknown = [{ loc: ["body", "slug"], msg: "invalid" }];
  fetchMock.mockImplementation(async () => json({ detail }, 422));
  render(tree("/staff/tournaments/new"));
  fireEvent.click(screen.getByRole("button", { name: /^Idioma/ }));
  fireEvent.click(screen.getByRole("button", { name: "English" }));
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Draft" } });
  fireEvent.change(screen.getByLabelText("Start"), { target: { value: "2027-01-17" } });
  fireEvent.click(screen.getByRole("button", { name: "Save tournament" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Slug (use lowercase words separated by single hyphens)");
  detail = "Unrecognized server error";
  fireEvent.click(screen.getByRole("button", { name: "Save tournament" }));
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Could not save"));
  expect(screen.getByLabelText("Name")).toHaveValue("Draft");
});

it.each(["edit", "create", "delete"])("does not redirect a later draft when a pending %s finishes", async operation => {
  let finish!: (response: Response) => void;
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    if (init?.method === ({ edit: "PUT", create: "POST", delete: "DELETE" }[operation])) return new Promise<Response>(resolve => { finish = resolve; });
    if (url.includes("?")) return json({ items: [event], total: 1 });
    return json(event);
  });
  render(tree(operation === "create" ? "/staff/tournaments/new" : "/staff/tournaments/1"));
  if (operation === "create") {
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "First" } });
    fireEvent.change(screen.getByLabelText("Início"), { target: { value: "2027-01-17" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar torneio" }));
  } else if (operation === "edit") {
    fireEvent.click(await screen.findByRole("button", { name: "Salvar torneio" }));
  } else {
    fireEvent.click(await screen.findByRole("button", { name: "Excluir torneio" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar exclusão" }));
  }
  await waitFor(() => expect(finish).toBeDefined());
  fireEvent.click(screen.getByRole("link", { name: /^Torneios$/ }));
  fireEvent.click(await screen.findByRole("link", { name: "Criar torneio" }));
  fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Second draft" } });
  await act(async () => { finish(operation === "delete" ? new Response(null, { status: 204 }) : json(event)); });
  expect(screen.getByLabelText("Nome")).toHaveValue("Second draft");
});
