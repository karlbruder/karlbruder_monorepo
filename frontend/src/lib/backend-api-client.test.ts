import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { backendFetch } from "@/lib/backend-api-client";
import { setApiUnauthorizedHandler } from "@/lib/api-fetch";
import { supabase } from "@/lib/supabase-client";
import { advanceSessionGeneration, currentSessionGeneration } from "@/lib/session-generation";

vi.mock("@/lib/supabase-client", () => ({ supabase: { auth: { getSession: vi.fn() } } }));

const getSession = vi.mocked(supabase.auth.getSession);
const session = (token: string, id = "account-a") => ({ access_token: token, user: { id } });
const result = (value: ReturnType<typeof session> | null, error: Error | null = null) =>
  ({ data: { session: value }, error }) as Awaited<ReturnType<typeof getSession>>;
const required = { authentication: "required" } as const;

beforeEach(() => {
  getSession.mockReset();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
});
afterEach(() => {
  vi.unstubAllGlobals();
  setApiUnauthorizedHandler(null);
});

describe("backendFetch", () => {
  it("uses the current SDK token for each request and merges caller headers", async () => {
    getSession.mockResolvedValueOnce(result(session("old"))).mockResolvedValueOnce(result(session("refreshed")));
    await backendFetch("/tournaments", { headers: { "Content-Type": "application/json", Authorization: "incorrect" } }, required);
    await backendFetch("/tournaments", {}, required);
    const calls = vi.mocked(fetch).mock.calls;
    expect(new URL(calls[0][0] as string, window.location.origin).pathname).toBe("/api/tournaments");
    expect((calls[0][1]?.headers as Headers).get("Content-Type")).toBe("application/json");
    expect((calls[0][1]?.headers as Headers).get("Authorization")).toBe("Bearer old");
    expect((calls[1][1]?.headers as Headers).get("Authorization")).toBe("Bearer refreshed");
  });

  it("allows a guest optional request without forwarding caller credentials", async () => {
    getSession.mockResolvedValue(result(null));
    await backendFetch("/tournaments", { headers: { Authorization: "Bearer supplied" } }, { authentication: "optional" });
    expect((vi.mocked(fetch).mock.calls[0][1]?.headers as Headers).has("Authorization")).toBe(false);
  });

  it("does not send a required request without a session or with a different account", async () => {
    getSession.mockResolvedValueOnce(result(null)).mockResolvedValueOnce(result(session("token")));
    await expect(backendFetch("/private", {}, required)).rejects.toThrow("Authentication required");
    await expect(backendFetch("/private", {}, { ...required, expectedAccountId: "account-b" })).rejects.toThrow("does not match");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("propagates SDK errors without making a request", async () => {
    const error = new Error("session lookup failed");
    getSession.mockResolvedValue(result(null, error));
    await expect(backendFetch("/private", {}, required)).rejects.toBe(error);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(["https://evil.example/api/private", "//evil.example/api/private", "/../outside", "/%2e%2e/outside", "/%2f..%2foutside", "/%252foutside"])(
    "rejects an unsafe destination before looking up credentials: %s", async (path) => {
      await expect(backendFetch(path, {}, required)).rejects.toThrow();
      expect(getSession).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it("does not send requests aborted before or during session lookup", async () => {
    const before = new AbortController();
    before.abort();
    await expect(backendFetch("/private", { signal: before.signal }, required)).rejects.toMatchObject({ name: "AbortError" });
    expect(getSession).not.toHaveBeenCalled();
    const during = new AbortController();
    getSession.mockImplementationOnce(async () => { during.abort(); return result(session("token")); });
    await expect(backendFetch("/private", { signal: during.signal }, required)).rejects.toMatchObject({ name: "AbortError" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("forwards cancellation to fetch", async () => {
    getSession.mockResolvedValue(result(session("token")));
    const controller = new AbortController();
    vi.mocked(fetch).mockImplementationOnce((_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
    }));
    const request = backendFetch("/private", { signal: controller.signal }, required);
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
    controller.abort();
    await expect(request).rejects.toMatchObject({ name: "AbortError" });
  });

  it("does not send a request when the account changes during session lookup", async () => {
    getSession.mockImplementationOnce(async () => { advanceSessionGeneration(); return result(session("token")); });
    await expect(backendFetch("/private", {}, required)).rejects.toMatchObject({ name: "AbortError" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("reports the initiating session on a backend 401 and ignores 403", async () => {
    const handler = vi.fn();
    setApiUnauthorizedHandler(handler);
    getSession.mockResolvedValue(result(session("token")));
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 401 })).mockResolvedValueOnce(new Response(null, { status: 403 }));
    await backendFetch("/private", {}, required);
    await backendFetch("/private", {}, required);
    expect(handler).toHaveBeenCalledExactlyOnceWith({ accountId: "account-a", accessToken: "token", generation: currentSessionGeneration() });
  });
});
