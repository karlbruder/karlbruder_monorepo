/**
 * Cancels work started by a session when the user signs out or changes accounts.
 * Token refresh keeps the current scope. Cancellation stops browser requests
 * and later callbacks, but cannot undo work already accepted by a server or
 * revoke a presigned storage URL.
 */
export type SessionScope = {
  signal: AbortSignal;
  isCurrent(): boolean;
  throwIfChanged(): void;
};

let controller = new AbortController();
let current: SessionScope = createScope(controller);

function createScope(controller: AbortController): SessionScope {
  const scope: SessionScope = {
    signal: controller.signal,
    isCurrent: () => scope === current && !controller.signal.aborted,
    throwIfChanged: () => {
      if (!scope.isCurrent()) throw new DOMException("Session changed", "AbortError");
    },
  };
  return scope;
}

export function captureSessionScope(): SessionScope {
  return current;
}

export function endSessionScope(): void {
  cancelSessionWork();
  controller = new AbortController();
  current = createScope(controller);
}

export function cancelSessionWork(): void {
  controller.abort();
}
