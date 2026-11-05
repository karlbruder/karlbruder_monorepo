import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import AppRouter from "@/app/router";
import { LanguageProvider } from "@/components/language-provider";
import { AuthSessionContext } from "@/features/auth/hooks/use-auth-session";
import { createQueryClient } from "@/lib/query-client";

vi.mock("@/lib/supabase-client", () => ({ supabase: { auth: {} } }));

const admin = {
  access_token: "staff-token",
  user: { id: "staff", app_metadata: { karlbruder_role: "admin" }, user_metadata: {} },
} as unknown as Session;

const ownAccount = { id: "staff", email: "staff@example.test", role: "admin" };
const fetchMock = vi.fn();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

function renderRoute(path = "/staff/users", session: Session | null = admin) {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <LanguageProvider>
        <AuthSessionContext value={{
          session,
          authReady: true,
          authLoading: false,
          authError: null,
          sessionLapsed: false,
          signInWithGoogle: vi.fn(),
          signOut: vi.fn(),
          clearSessionLapsedNotice: vi.fn(),
        }}>
          <MemoryRouter initialEntries={[path]}><AppRouter /></MemoryRouter>
        </AuthSessionContext>
      </LanguageProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState({}, "", "/");
  vi.stubEnv("VITE_API_BASE_URL", "/api");
  vi.stubGlobal("fetch", fetchMock.mockReset());
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it("opens accounts from the staff panel and searches across provider pages by email or ID", async () => {
  const firstPage = Array.from({ length: 25 }, (_, index) => ({
    id: `account-${index}`, email: `first-${index}@example.test`, role: "regular_user",
  }));
  fetchMock.mockImplementation(async (url: string) => {
    if (url.includes("/tournaments")) return json({ items: [], total: 0 });
    if (url.includes("page=1&")) return json({ users: firstPage, next_page: 2 });
    return json({ users: [{ id: "last-account", email: "last@example.test", role: "guild_member" }], next_page: null });
  });
  renderRoute("/staff/tournaments");
  const panel = screen.getByRole("navigation", { name: "Painel da equipe" });
  expect(within(panel).getByRole("link", { name: "Torneios" })).toBeInTheDocument();
  expect(within(panel).getByRole("link", { name: "Conferência de pagamentos" })).toBeInTheDocument();
  fireEvent.click(within(panel).getByRole("link", { name: "Contas de usuários" }));

  await screen.findByRole("heading", { name: "first-0@example.test" });
  const search = screen.getByRole("searchbox", { name: "Buscar por e-mail ou ID da conta" });
  fireEvent.change(search, { target: { value: "LAST@EXAMPLE.TEST" } });
  expect(screen.getByText("Função atual: Membro da guilda")).toBeInTheDocument();
  expect(screen.queryByText("first-0@example.test")).not.toBeInTheDocument();
  fireEvent.change(search, { target: { value: "last-account" } });
  expect(screen.getByRole("heading", { name: "last@example.test" })).toBeInTheDocument();
  fireEvent.change(search, { target: { value: "missing" } });
  expect(screen.getByText("Nenhuma conta encontrada.")).toBeInTheDocument();

  fireEvent.change(search, { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "Próxima" }));
  expect(screen.getByRole("heading", { name: "last@example.test" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Anterior" }));
  expect(screen.getByRole("heading", { name: "first-0@example.test" })).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith("/api/staff/users?page=2&per_page=100", expect.objectContaining({
    headers: { Authorization: "Bearer staff-token" },
  }));
});

it("lets the sole admin demote their own account and refreshes the role after saving", async () => {
  let role = ownAccount.role;
  let finishUpdate: (response: Response) => void = () => {};
  fetchMock.mockImplementation(async (_url: string, init?: RequestInit) => {
    if (init?.method === "PATCH") {
      return new Promise<Response>((resolve) => { finishUpdate = resolve; });
    }
    return json({ users: [{ ...ownAccount, role }], next_page: null });
  });
  renderRoute();
  const select = await screen.findByRole("combobox", { name: "Nova função" });
  expect(within(select).getAllByRole("option").map((option) => option.getAttribute("value")))
    .toEqual(["regular_user", "guild_member", "admin"]);
  fireEvent.change(select, { target: { value: "regular_user" } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar função" }));
  const pending = await screen.findByRole("button", { name: "Salvando função…" });
  expect(pending).toBeDisabled();
  fireEvent.click(pending);

  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/staff/users/staff", {
    method: "PATCH",
    headers: { Authorization: "Bearer staff-token", "Content-Type": "application/json" },
    body: JSON.stringify({ role: "regular_user" }),
  }));
  role = "regular_user";
  finishUpdate(json({ ...ownAccount, role }));

  expect(await screen.findByRole("status")).toHaveTextContent("Função atualizada.");
  expect(screen.getByText("Função atual: Usuário comum")).toBeInTheDocument();
  expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "PATCH")).toHaveLength(1);
  expect(fetchMock.mock.calls.filter(([url]) => url.includes("?page=1"))).toHaveLength(2);
  expect(screen.getByText(/sessões existentes podem manter/)).toBeInTheDocument();
});

it("retries a failed directory load and preserves the draft when saving fails in English", async () => {
  fetchMock.mockResolvedValueOnce(json({ detail: "provider unavailable" }, 503))
    .mockImplementation(async (_url: string, init?: RequestInit) => init?.method === "PATCH"
      ? json({ detail: "provider unavailable" }, 503)
      : json({ users: [ownAccount], next_page: null }));
  renderRoute();
  fireEvent.click(screen.getByRole("button", { name: "English" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not load user accounts.");
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  const select = await screen.findByRole("combobox", { name: "New role" });
  fireEvent.change(select, { target: { value: "guild_member" } });
  fireEvent.click(screen.getByRole("button", { name: "Save role" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not update the role. Try again.");
  expect(screen.getByText("Current role: Admin")).toBeInTheDocument();
  expect(select).toHaveValue("guild_member");
  expect(screen.getByRole("button", { name: "Save role" })).toBeEnabled();
});

it("keeps the saved role visible when refreshing the directory fails", async () => {
  fetchMock.mockResolvedValueOnce(json({ users: [ownAccount], next_page: null }))
    .mockResolvedValueOnce(json({ ...ownAccount, role: "guild_member" }))
    .mockResolvedValueOnce(json({ detail: "provider unavailable" }, 503));
  renderRoute();
  const select = await screen.findByRole("combobox", { name: "Nova função" });
  fireEvent.change(select, { target: { value: "guild_member" } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar função" }));

  expect(await screen.findByRole("status")).toHaveTextContent("Função atualizada.");
  expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar as contas de usuários.");
  expect(screen.getByText("Função atual: Membro da guilda")).toBeInTheDocument();
});

it("redirects guests to sign-in without requesting the directory", async () => {
  renderRoute("/staff/users", null);
  expect(await screen.findByRole("heading", { name: "Entrar na Karlbrüder" })).toBeInTheDocument();
  expect(fetchMock).not.toHaveBeenCalled();
});

it("blocks signed-in non-admins without requesting the directory", () => {
  renderRoute("/staff/users", { ...admin, user: { ...admin.user, app_metadata: {} } });
  expect(screen.getByRole("alert")).toHaveTextContent("Acesso restrito à equipe.");
  expect(fetchMock).not.toHaveBeenCalled();
});
