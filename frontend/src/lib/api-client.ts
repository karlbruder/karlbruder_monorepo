import { apiBaseUrl } from "@/config/environment";
import { supabase } from "@/lib/supabase-client";
import { captureSessionScope, type SessionScope } from "@/lib/session-scope";

type RequestSession = { accountId: string; accessToken: string; scope: SessionScope } | null;
type ApiUnauthorizedHandler = (session: RequestSession) => void;
let apiUnauthorizedHandler: ApiUnauthorizedHandler | null = null;
export function setApiUnauthorizedHandler(handler: ApiUnauthorizedHandler | null) {
  apiUnauthorizedHandler = handler;
}

type ApiRequestOptions = {
  authentication: "anonymous" | "optional" | "required";
  expectedAccountId?: string;
};

function apiUrl(path: string): string {
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

export async function apiFetch(path: string, init: RequestInit = {}, options: ApiRequestOptions): Promise<Response> {
  const url = apiUrl(path);
  init.signal?.throwIfAborted();
  if (options.authentication === "anonymous") {
    const headers = new Headers(init.headers);
    headers.delete("Authorization");
    return fetch(url, { ...init, headers, credentials: "omit" });
  }
  const scope = captureSessionScope();
  scope.throwIfChanged();
  const { data: { session }, error } = await supabase.auth.getSession();
  init.signal?.throwIfAborted();
  scope.throwIfChanged();
  if (error) throw error;
  if (!session && options.authentication === "required") throw new Error("Authentication required");
  if (options.expectedAccountId && session?.user.id !== options.expectedAccountId) {
    throw new Error("Current account does not match request account");
  }
  const headers = new Headers(init.headers);
  headers.delete("Authorization");
  if (session) headers.set("Authorization", `Bearer ${session.access_token}`);
  const signal = init.signal ? AbortSignal.any([init.signal, scope.signal]) : scope.signal;
  const response = await fetch(url, { ...init, headers, signal });
  scope.throwIfChanged();
  if (response.status === 401) {
    apiUnauthorizedHandler?.(session ? { accountId: session.user.id, accessToken: session.access_token, scope } : null);
  }
  return response;
}
