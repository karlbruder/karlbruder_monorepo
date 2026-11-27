import { useEffect, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import AppProvider from "@/app/provider";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { supabase } from "@/lib/supabase-client";
import { backendFetch } from "@/lib/backend-api-client";

vi.mock("@/lib/supabase-client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

const accountA = {
  access_token: "token-a",
  user: { id: "account-a", email: "a@example.test", user_metadata: {} },
} as Session;
const accountB = { ...accountA, access_token: "token-b", user: { ...accountA.user, id: "account-b" } } as Session;
const refreshedA = { ...accountA, access_token: "token-refreshed" };
let queryClientForTest: QueryClient;

const registrationKey = ["tournaments", 42, "registrations", "own"] as const;
const publicCatalogKey = ["tournaments", "monomachia", 2027] as const;

function CacheProbe() {
  const { session } = useAuthSession();
  const queryClient = useQueryClient();
  const [, setCacheVersion] = useState(0);

  useEffect(() => {
    queryClientForTest = queryClient;
    queryClient.setQueryData(registrationKey, [{ registration_number: "A-PRIVATE" }]);
    queryClient.setQueryData(publicCatalogKey, "catalog");
  }, [queryClient]);

  useEffect(() => {
    return queryClient.getQueryCache().subscribe(() => {
      setCacheVersion((version) => version + 1);
    });
  }, [queryClient]);

  const accountLabel = session?.user.id ?? "signed-out";
  const cacheLabel = queryClient.getQueryCache().getAll().length === 0 ? "empty" : "cached";
  return <p>{`${accountLabel} ${cacheLabel}`}</p>;
}

let authStateListener: ((event: AuthChangeEvent, session: Session | null) => void) | undefined;

beforeEach(() => {
  authStateListener = undefined;
  vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: accountA }, error: null });
  vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback) => {
    authStateListener = callback;
    return { data: { subscription: { unsubscribe: vi.fn() } } } as unknown as ReturnType<typeof supabase.auth.onAuthStateChange>;
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("AppProvider", () => {
  it("clears the query cache on sign-out", async () => {
    render(
      <AppProvider>
        <CacheProbe />
      </AppProvider>,
    );

    expect(await screen.findByText("account-a cached")).toBeInTheDocument();
    authStateListener?.("SIGNED_OUT", null);
    await waitFor(() => expect(screen.getByText("signed-out empty")).toBeInTheDocument());
  });

  it("signs out when an API request returns 401", async () => {
    vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    render(
      <AppProvider>
        <button type="button" onClick={() => void backendFetch("/tournaments/42/registrations", {}, { authentication: "required", expectedAccountId: "account-a" })}>Carregar</button>
      </AppProvider>,
    );
    fireEvent.click(await screen.findByRole("button", { name: "Carregar" }));
    await waitFor(() => expect(supabase.auth.signOut).toHaveBeenCalled());
  });

  it("cancels pending queries and clears the cache on a direct account switch", async () => {
    render(<AppProvider><CacheProbe /></AppProvider>);
    await screen.findByText("account-a cached");
    let finish!: (value: string) => void;
    const pending = queryClientForTest.fetchQuery({ queryKey: ["pending"], queryFn: () => new Promise<string>((resolve) => { finish = resolve; }) });
    const cancelled = pending.catch(() => undefined);
    act(() => authStateListener?.("SIGNED_IN", accountB));
    await screen.findByText("account-b empty");
    finish("old private data");
    await cancelled;
    expect(queryClientForTest.getQueryData(["pending"])).toBeUndefined();
  });

  it("retains cached data on a same-account token refresh", async () => {
    render(<AppProvider><CacheProbe /></AppProvider>);
    await screen.findByText("account-a cached");
    act(() => authStateListener?.("TOKEN_REFRESHED", refreshedA));
    expect(queryClientForTest.getQueryData(registrationKey)).toEqual([{ registration_number: "A-PRIVATE" }]);
  });

  it("ignores a late request even after switching A to B and back to A", async () => {
    render(<AppProvider><CacheProbe /></AppProvider>);
    await screen.findByText("account-a cached");
    let respond!: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => new Promise<Response>((resolve) => { respond = resolve; })));
    const request = backendFetch("/private", {}, { authentication: "required" });
    const result = request.catch((error: unknown) => error);
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    act(() => { authStateListener?.("SIGNED_IN", accountB); authStateListener?.("SIGNED_IN", accountA); });
    respond(new Response(null, { status: 401 }));
    expect(await result).toMatchObject({ name: "AbortError" });
    expect(supabase.auth.signOut).not.toHaveBeenCalled();
  });

  it("ignores an old token's 401 after refresh and signs out once for concurrent current 401s", async () => {
    render(<AppProvider><CacheProbe /></AppProvider>);
    await screen.findByText("account-a cached");
    let respond!: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn().mockImplementationOnce(() => new Promise<Response>((resolve) => { respond = resolve; })));
    const oldRequest = backendFetch("/private", {}, { authentication: "required" });
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    act(() => authStateListener?.("TOKEN_REFRESHED", refreshedA));
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: refreshedA }, error: null });
    respond(new Response(null, { status: 401 }));
    await oldRequest;
    expect(supabase.auth.signOut).not.toHaveBeenCalled();
    vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 401 }));
    await Promise.all([backendFetch("/private", {}, { authentication: "required" }), backendFetch("/private", {}, { authentication: "required" })]);
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
  });

  it("keeps the session for forbidden and guest unauthorized responses", async () => {
    render(<AppProvider><CacheProbe /></AppProvider>);
    await screen.findByText("account-a cached");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response(null, { status: 403 })).mockResolvedValueOnce(new Response(null, { status: 401 })));
    await backendFetch("/private", {}, { authentication: "required" });
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null });
    await backendFetch("/public", {}, { authentication: "optional" });
    expect(supabase.auth.signOut).not.toHaveBeenCalled();
    expect(screen.getByText("account-a cached")).toBeInTheDocument();
  });
});
