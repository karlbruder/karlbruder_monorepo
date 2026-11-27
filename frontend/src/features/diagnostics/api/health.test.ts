import { afterEach, expect, it, vi } from "vitest";
import { getHealthStatus } from "@/features/diagnostics/api/health";
import { supabase } from "@/lib/supabase-client";

vi.mock("@/lib/supabase-client", () => ({ supabase: { auth: { getSession: vi.fn().mockRejectedValue(new Error("auth unavailable")) } } }));

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.clearAllMocks(); });

it("checks backend and database health without consulting authentication", async () => {
  vi.stubEnv("VITE_API_BASE_URL", "/api");
  const request = vi.fn().mockResolvedValueOnce(Response.json({ status: "ok" }))
    .mockResolvedValueOnce(Response.json({ status: "ok", database: "connected" }));
  vi.stubGlobal("fetch", request);

  await expect(getHealthStatus()).resolves.toEqual({ backend: { status: "ok" }, database: { status: "ok", database: "connected" } });
  expect(supabase.auth.getSession).not.toHaveBeenCalled();
  expect(request.mock.calls.map(([url]) => url)).toEqual(["/api/health", "/api/health/db"]);
  for (const [, init] of request.mock.calls) {
    expect(init.credentials).toBe("omit");
    expect(init.headers.has("Authorization")).toBe(false);
  }
});
