import { apiBaseUrl } from "@/config/environment";
import { notifyApiUnauthorized } from "@/lib/api-fetch";
import { supabase } from "@/lib/supabase-client";
import { currentSessionGeneration } from "@/lib/session-generation";

type BackendRequestOptions = {
  authentication: "optional" | "required";
  expectedAccountId?: string;
};

function backendUrl(path: string): string {
  const base = new URL(apiBaseUrl(), window.location.origin);
  const boundary = base.pathname.replace(/\/+$/, "");
  // Encoded separators can be interpreted differently by proxies and servers.
  if (/%(?:2f|5c|25)/i.test(path) || path.includes("\\")) {
    throw new Error("Invalid backend path");
  }
  const url = /^[a-z][a-z\d+.-]*:/i.test(path) || path.startsWith("//")
    ? new URL(path, base)
    : new URL(`${boundary}/${path.replace(/^\/+/, "")}`, base.origin);
  if (url.origin !== base.origin || (url.pathname !== boundary && !url.pathname.startsWith(`${boundary}/`))) {
    throw new Error("URL is outside the backend boundary");
  }
  return base.origin === window.location.origin && apiBaseUrl().startsWith("/")
    ? `${url.pathname}${url.search}${url.hash}` : url.href;
}

export async function backendFetch(path: string, init: RequestInit = {}, options: BackendRequestOptions): Promise<Response> {
  const url = backendUrl(path);
  const generation = currentSessionGeneration();
  init.signal?.throwIfAborted();
  const { data: { session }, error } = await supabase.auth.getSession();
  init.signal?.throwIfAborted();
  if (generation !== currentSessionGeneration()) throw new DOMException("Session changed", "AbortError");
  if (error) throw error;
  if (!session && options.authentication === "required") throw new Error("Authentication required");
  if (options.expectedAccountId && session?.user.id !== options.expectedAccountId) {
    throw new Error("Current account does not match request account");
  }
  const headers = new Headers(init.headers);
  headers.delete("Authorization");
  if (session) headers.set("Authorization", `Bearer ${session.access_token}`);
  const response = await fetch(url, { ...init, headers });
  if (generation !== currentSessionGeneration()) throw new DOMException("Session changed", "AbortError");
  if (response.status === 401) {
    notifyApiUnauthorized(session ? { accountId: session.user.id, accessToken: session.access_token, generation } : null);
  }
  return response;
}
