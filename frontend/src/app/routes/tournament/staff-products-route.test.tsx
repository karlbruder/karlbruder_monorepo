import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { StaffTournamentCreateRoute } from "@/app/routes/tournament/staff-tournament-route";
import { renderWithQuery } from "@/testing/render-with-query";

vi.mock("@/features/auth/hooks/use-auth-session", () => ({ useAuthSession: () => ({ session: { access_token: "staff-token", user: { id: "staff" } } }) }));
vi.mock("@/hooks/use-language", () => ({ useLanguage: () => ({ language: "pt" }) }));
const product = { id: 7, name: "Plena", description: "Entrada", is_active: true, price_id: 2, amount: "100.00", currency: "BRL", tournaments: [] };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const fetchMock = vi.fn();
beforeEach(() => { vi.stubEnv("VITE_API_BASE_URL", "/api"); vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it("creates a tournament with reused and new products before navigating to its detail", async () => {
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    if (url.endsWith("/tournaments/products")) return json([product]);
    if (url.endsWith("/staff/tournaments") && init?.method === "POST") return json({ id: 42 });
    return json({});
  });
  renderWithQuery(<MemoryRouter initialEntries={["/staff/tournaments/new"]}><Routes><Route path="/staff/tournaments/new" element={<StaffTournamentCreateRoute />} /><Route path="/staff/tournaments/:id" element={<p>Torneio criado</p>} /></Routes></MemoryRouter>);
  fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Novo torneio" } });
  fireEvent.change(screen.getByLabelText("Início"), { target: { value: "2027-01-17" } });
  fireEvent.click(await screen.findByRole("checkbox", { name: /Plena/ }));
  fireEvent.click(screen.getByRole("button", { name: "Adicionar novo produto" }));
  const draft = within(screen.getByRole("group", { name: "Novo produto 1" }));
  fireEvent.change(draft.getByLabelText("Nome do produto"), { target: { value: "Social" } });
  fireEvent.change(draft.getByLabelText("Descrição dos benefícios"), { target: { value: "Entrada" } });
  fireEvent.change(draft.getByLabelText("Preço em BRL"), { target: { value: "50,00" } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar torneio" }));
  expect(await screen.findByText("Torneio criado")).toBeInTheDocument();
  const [, init] = fetchMock.mock.calls.find(([url, options]) => url.endsWith("/staff/tournaments") && options?.method === "POST")!;
  expect(JSON.parse(init.body)).toMatchObject({ existing_product_ids: [7], new_products: [{ name: "Social", description: "Entrada", amount: "50.00" }] });
  await waitFor(() => expect(fetchMock.mock.calls.filter(([, options]) => options?.method === "POST")).toHaveLength(1));
});
