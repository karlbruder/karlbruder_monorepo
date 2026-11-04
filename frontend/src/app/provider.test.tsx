import { useEffect, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useQueryClient } from "@tanstack/react-query";
import AppProvider from "@/app/provider";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { supabase } from "@/lib/supabase-client";
import { apiFetch } from "@/lib/api-fetch";

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

const registrationKey = ["tournaments", 42, "registrations", "own"] as const;
const publicCatalogKey = ["tournaments", "monomachia", 2027] as const;

function CacheProbe() {
  const { session } = useAuthSession();
  const queryClient = useQueryClient();
  const [, setCacheVersion] = useState(0);

  useEffect(() => {
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
        <button type="button" onClick={() => void apiFetch("/api/tournaments/42/registrations")}>Carregar</button>
      </AppProvider>,
    );
    fireEvent.click(await screen.findByRole("button", { name: "Carregar" }));
    await waitFor(() => expect(supabase.auth.signOut).toHaveBeenCalled());
  });
});
