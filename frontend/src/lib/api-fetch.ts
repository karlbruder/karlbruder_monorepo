type ApiUnauthorizedHandler = () => void;

let apiUnauthorizedHandler: ApiUnauthorizedHandler | null = null;

export function setApiUnauthorizedHandler(handler: ApiUnauthorizedHandler | null) {
  apiUnauthorizedHandler = handler;
}

export function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  return fetch(input, init).then((response) => {
    if (response.status === 401) {
      apiUnauthorizedHandler?.();
    }
    return response;
  });
}
