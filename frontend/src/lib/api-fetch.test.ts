import { afterEach, describe, expect, it, vi } from "vitest";
import { apiFetch, setApiUnauthorizedHandler } from "@/lib/api-fetch";

afterEach(() => {
  setApiUnauthorizedHandler(null);
  vi.unstubAllGlobals();
});

describe("apiFetch", () => {
  it("signs the current user out when the API returns 401 and leaves the session in place for 403", async () => {
    const onUnauthorized = vi.fn();
    setApiUnauthorizedHandler(onUnauthorized);
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ status: 401 })
      .mockResolvedValueOnce({ status: 403 }));

    await apiFetch("/api/tournaments/42/signups");
    await apiFetch("/api/admin");

    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });
});
