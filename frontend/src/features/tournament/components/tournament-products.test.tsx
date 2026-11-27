vi.mock("@/lib/supabase-client", () => ({ supabase: { auth: { getSession: vi.fn(async () => ({ data: { session: { access_token: "staff-token", user: { id: "staff" } } }, error: null })) } } }));
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderWithQuery } from "@/testing/render-with-query";
import { StaffTournamentForm } from "@/features/tournament/components/staff-tournament-form";
import { TournamentProducts } from "@/features/tournament/components/tournament-products";

const product = { id: 7, name: "Plena", description: "Entrada e prêmios", is_active: true, price_id: 9, amount: "100.00", currency: "BRL", tournaments: [{ id: 1, name: "Primeiro" }, { id: 2, name: "Segundo" }] };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const fetchMock = vi.fn();
beforeEach(() => { vi.stubEnv("VITE_API_BASE_URL", "/api"); fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it("submits existing selections and multiple new drafts with the tournament and retains them after failure", async () => {
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    if (url === "/api/staff/tournaments/products") return json([product]);
    if (init?.method === "POST") return json({ detail: "failure" }, 503);
    return json([]);
  });
  renderWithQuery(<StaffTournamentForm userId="staff" language="pt" onSaved={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Torneio" } });
  fireEvent.change(screen.getByLabelText("Início"), { target: { value: "2027-01-17" } });
  fireEvent.click(await screen.findByRole("checkbox", { name: /Plena/ }));
  fireEvent.click(screen.getByRole("button", { name: "Adicionar novo produto" }));
  const draft = within(screen.getByRole("group", { name: "Novo produto 1" }));
  fireEvent.change(draft.getByLabelText("Nome do produto"), { target: { value: " Social " } });
  fireEvent.change(draft.getByLabelText("Descrição dos benefícios"), { target: { value: " Entrada " } });
  fireEvent.change(draft.getByLabelText("Preço em BRL"), { target: { value: "25,50" } });
  fireEvent.click(screen.getByRole("button", { name: "Adicionar novo produto" }));
  const secondDraft = within(screen.getByRole("group", { name: "Novo produto 2" }));
  expect(secondDraft.getByLabelText("Nome do produto")).toHaveFocus();
  fireEvent.change(secondDraft.getByLabelText("Nome do produto"), { target: { value: "Plus" } });
  fireEvent.change(secondDraft.getByLabelText("Descrição dos benefícios"), { target: { value: "Brinde" } });
  fireEvent.change(secondDraft.getByLabelText("Preço em BRL"), { target: { value: "75" } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar torneio" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível salvar");
  const [, request] = fetchMock.mock.calls.find(([url, init]) => url === "/api/staff/tournaments" && init?.method === "POST")!;
  expect(JSON.parse(request.body)).toMatchObject({ existing_product_ids: [7], new_products: [{ name: "Social", description: "Entrada", amount: "25.50" }, { name: "Plus", description: "Brinde", amount: "75" }] });
  expect(screen.getByLabelText("Nome")).toHaveValue("Torneio");
  expect(screen.getByRole("checkbox", { name: /Plena/ })).toBeChecked();
  expect(draft.getByLabelText("Nome do produto")).toHaveValue(" Social ");
});

it("requires review of all linked tournaments before saving, and cancel makes no mutation", async () => {
  fetchMock.mockImplementation(async (url: string) => url.includes("/products") ? json([product]) : json({}));
  renderWithQuery(<TournamentProducts userId="staff" tournamentId="1" language="pt" />);
  fireEvent.click(await screen.findByRole("button", { name: "Editar detalhes" }));
  expect(screen.getByLabelText("Nome do produto")).toHaveFocus();
  fireEvent.change(screen.getByLabelText("Nome do produto"), { target: { value: "Nova Plena" } });
  fireEvent.click(screen.getByRole("button", { name: "Revisar alteração" }));
  const review = screen.getByRole("region", { name: "Confirmar alteração compartilhada" });
  expect(within(review).getByText(/Primeiro, Segundo/)).toBeInTheDocument();
  expect(within(review).getByRole("heading")).toHaveFocus();
  fireEvent.click(within(review).getByRole("button", { name: "Cancelar" }));
  expect(fetchMock.mock.calls.every(([, init]) => !init?.method || init.method === "GET")).toBe(true);
  expect(screen.getByLabelText("Nome do produto")).toHaveValue("Nova Plena");
  fireEvent.click(screen.getByRole("button", { name: "Revisar alteração" }));
  fireEvent.click(within(screen.getByRole("region", { name: "Confirmar alteração compartilhada" })).getByRole("button", { name: "Confirmar alteração" }));
  await waitFor(() => expect(fetchMock.mock.calls.some(([url, init]) => url === "/api/staff/products/7" && init?.method === "PATCH")).toBe(true));
});

it("retains price changes after a failed save and supports retry", async () => {
  let attempts = 0;
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    if (url.endsWith("/prices") && init?.method === "POST") return ++attempts === 1 ? json({}, 503) : json({});
    return json([product]);
  });
  renderWithQuery(<TournamentProducts userId="staff" tournamentId="1" language="en" />);
  fireEvent.click(await screen.findByRole("button", { name: "Change price" }));
  fireEvent.change(screen.getByLabelText("New price in BRL"), { target: { value: "120.50" } });
  fireEvent.click(screen.getByRole("button", { name: "Review change" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm change" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Your changes are still here");
  expect(screen.getByText(/120.50/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Confirm change" }));
  await waitFor(() => expect(attempts).toBe(2));
  expect(await screen.findByRole("status")).toHaveTextContent("Product updated");
});

it("links an existing product to an existing tournament", async () => {
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    if (url === "/api/staff/tournaments/1/products" && init?.method === "POST") return json([product]);
    if (url === "/api/staff/tournaments/1/products") return json([]);
    return json([product]);
  });
  renderWithQuery(<TournamentProducts userId="staff" tournamentId="1" language="pt" />);
  fireEvent.click(await screen.findByRole("button", { name: "Adicionar produto" }));
  fireEvent.click(await screen.findByRole("checkbox", { name: /Plena/ }));
  fireEvent.click(screen.getByRole("button", { name: "Adicionar ao torneio" }));
  await waitFor(() => expect(fetchMock.mock.calls.some(([url, init]) => url.endsWith("/1/products") && init?.method === "POST")).toBe(true));
  const [, init] = fetchMock.mock.calls.find(([url, options]) => url.endsWith("/1/products") && options?.method === "POST")!;
  expect(JSON.parse(init.body)).toEqual({ existing_product_ids: [7], new_products: [] });
});

it("refreshes a conflicting attachment and saves the remaining selection and retained draft", async () => {
  const otherProduct = { ...product, id: 8, name: "Social" };
  const catalog = [product, otherProduct];
  const payloads: unknown[] = [];
  let attached = false;
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    if (url === "/api/staff/tournaments/1/products" && init?.method === "POST") {
      payloads.push(JSON.parse(String(init.body)));
      if (payloads.length === 1) {
        attached = true;
        return json({ detail: "Product already offered" }, 409);
      }
      return json(catalog);
    }
    return json(url === "/api/staff/tournaments/1/products" ? (attached ? [product] : []) : catalog);
  });
  renderWithQuery(<TournamentProducts userId="staff" tournamentId="1" language="en" />);
  fireEvent.click(await screen.findByRole("button", { name: "Add product" }));
  fireEvent.click(await screen.findByRole("checkbox", { name: /Plena/ }));
  fireEvent.click(screen.getByRole("checkbox", { name: /Social/ }));
  fireEvent.click(screen.getByRole("button", { name: "Add new product" }));
  fireEvent.change(screen.getByLabelText("Product name"), { target: { value: "Plus" } });
  fireEvent.change(screen.getByLabelText("Benefits description"), { target: { value: "Entry and gifts" } });
  fireEvent.change(screen.getByLabelText("Price in BRL"), { target: { value: "125.50" } });
  fireEvent.click(screen.getByRole("button", { name: "Add to tournament" }));
  fireEvent.click(await screen.findByRole("button", { name: "Refresh products" }));
  await screen.findByRole("button", { name: "Edit details" });
  expect(screen.queryByRole("checkbox", { name: /Plena/ })).not.toBeInTheDocument();
  expect(screen.getByRole("checkbox", { name: /Social/ })).toBeChecked();
  expect(screen.getByLabelText("Product name")).toHaveValue("Plus");
  expect(screen.getByLabelText("Benefits description")).toHaveValue("Entry and gifts");
  expect(screen.getByLabelText("Price in BRL")).toHaveValue("125.50");
  fireEvent.click(screen.getByRole("button", { name: "Add to tournament" }));
  expect(await screen.findByText("Products added.")).toBeInTheDocument();
  expect(payloads).toEqual([
    { existing_product_ids: [7, 8], new_products: [{ name: "Plus", description: "Entry and gifts", amount: "125.50" }] },
    { existing_product_ids: [8], new_products: [{ name: "Plus", description: "Entry and gifts", amount: "125.50" }] },
  ]);
});

it("blocks invalid draft prices without sending a tournament request", async () => {
  fetchMock.mockResolvedValue(json([]));
  renderWithQuery(<StaffTournamentForm userId="staff" language="pt" onSaved={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Torneio" } });
  fireEvent.change(screen.getByLabelText("Início"), { target: { value: "2027-01-17" } });
  fireEvent.click(screen.getByRole("button", { name: "Adicionar novo produto" }));
  fireEvent.change(screen.getByLabelText("Nome do produto"), { target: { value: "Social" } });
  fireEvent.change(screen.getByLabelText("Descrição dos benefícios"), { target: { value: "Entrada" } });
  fireEvent.change(screen.getByLabelText("Preço em BRL"), { target: { value: "2,999" } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar torneio" }));
  expect(screen.getByRole("alert")).toHaveTextContent("preço em BRL válido");
  expect(fetchMock.mock.calls.every(([, init]) => init?.method !== "POST")).toBe(true);
});

it("confirms global deactivation and blocks duplicate submission while pending", async () => {
  let finish!: (response: Response) => void;
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    if (url.endsWith("/deactivate") && init?.method === "POST") return new Promise<Response>(resolve => { finish = resolve; });
    return json([product]);
  });
  renderWithQuery(<TournamentProducts userId="staff" tournamentId="1" language="pt" />);
  fireEvent.click(await screen.findByRole("button", { name: "Desativar" }));
  const review = screen.getByRole("region", { name: "Confirmar alteração compartilhada" });
  expect(within(review).getByText(/Primeiro, Segundo/)).toBeInTheDocument();
  fireEvent.click(within(review).getByRole("button", { name: "Confirmar alteração" }));
  expect(within(review).getByRole("button", { name: "Salvando..." })).toBeDisabled();
  await waitFor(() => expect(fetchMock.mock.calls.filter(([url]) => url.endsWith("/deactivate"))).toHaveLength(1));
  finish(json({}));
  expect(await screen.findByRole("status")).toHaveTextContent("Produto atualizado.");
});

it("retries a failed catalog load without losing a new product draft", async () => {
  let loads = 0;
  fetchMock.mockImplementation(async () => ++loads === 1 ? json({}, 503) : json([product]));
  renderWithQuery(<StaffTournamentForm userId="staff" language="en" onSaved={vi.fn()} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not load products");
  fireEvent.click(screen.getByRole("button", { name: "Add new product" }));
  fireEvent.change(screen.getByLabelText("Product name"), { target: { value: "Draft" } });
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByRole("checkbox", { name: /Plena/ })).toBeInTheDocument();
  expect(screen.getByLabelText("Product name")).toHaveValue("Draft");
});

it("lets staff remove a product that became inactive while creating a tournament", async () => {
  let loads = 0;
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    if (url.endsWith("/tournaments/products")) return json([{ ...product, is_active: ++loads === 1 }]);
    if (init?.method === "POST") return json({ detail: "Product is inactive" }, 409);
    return json([]);
  });
  renderWithQuery(<StaffTournamentForm userId="staff" language="pt" onSaved={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Torneio" } });
  fireEvent.change(screen.getByLabelText("Início"), { target: { value: "2027-01-17" } });
  fireEvent.click(await screen.findByRole("checkbox", { name: /Plena/ }));
  fireEvent.click(screen.getByRole("button", { name: "Salvar torneio" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("produto selecionado não está mais disponível");
  fireEvent.click(screen.getByRole("button", { name: "Atualizar produtos" }));
  const unavailable = await screen.findByRole("checkbox", { name: /Plena.*Não está mais disponível/ });
  expect(unavailable).toBeChecked();
  fireEvent.click(unavailable);
  expect(screen.queryByRole("checkbox", { name: /Plena/ })).not.toBeInTheDocument();
  expect(screen.getByLabelText("Nome")).toHaveValue("Torneio");
});

it("shows an access error after a shared product save is denied", async () => {
  fetchMock.mockImplementation(async (_url: string, init?: RequestInit) => init?.method === "PATCH" ? json({}, 403) : json([product]));
  renderWithQuery(<TournamentProducts userId="staff" tournamentId="1" language="pt" />);
  fireEvent.click(await screen.findByRole("button", { name: "Editar detalhes" }));
  fireEvent.click(screen.getByRole("button", { name: "Revisar alteração" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirmar alteração" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Acesso negado");
  expect(within(screen.getByRole("region", { name: "Confirmar alteração compartilhada" })).getByText(/Primeiro, Segundo/)).toBeInTheDocument();
});

it("does not finish a tournament creation after the staff session changes", async () => {
  const { endSessionScope } = await import("@/lib/session-scope");
  let finish!: (response: Response) => void;
  fetchMock.mockImplementation(async (_url: string, init?: RequestInit) => {
    if (init?.method === "POST") return new Promise<Response>(resolve => { finish = resolve; });
    return json([]);
  });
  const onSaved = vi.fn();
  renderWithQuery(<StaffTournamentForm userId="staff" language="pt" onSaved={onSaved} />);
  fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Torneio" } });
  fireEvent.change(screen.getByLabelText("Início"), { target: { value: "2027-01-17" } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar torneio" }));
  await waitFor(() => expect(finish).toBeTypeOf("function"));
  endSessionScope();
  finish(json({ id: 42 }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Salvar torneio" })).not.toBeDisabled());
  expect(onSaved).not.toHaveBeenCalled();
});
