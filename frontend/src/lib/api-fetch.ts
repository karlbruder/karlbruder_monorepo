export type RequestSession = { accountId: string; accessToken: string; generation: number } | null;
type ApiUnauthorizedHandler = (session?: RequestSession) => void;

let apiUnauthorizedHandler: ApiUnauthorizedHandler | null = null;

export function setApiUnauthorizedHandler(handler: ApiUnauthorizedHandler | null) {
  apiUnauthorizedHandler = handler;
}

export function notifyApiUnauthorized(session?: RequestSession) {
  apiUnauthorizedHandler?.(session);
}

export function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  return fetch(input, init).then((response) => {
    if (response.status === 401) {
      notifyApiUnauthorized();
    }
    return response;
  });
}
