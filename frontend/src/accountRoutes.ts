export const accountRoutes = {
  signIn: "/account/sign-in",
  signUp: "/account/sign-up",
  checkEmail: "/account/check-email",
  recover: "/account/recover",
  newPassword: "/account/new-password",
  password: "/account/password",
} as const;

export function emailConfirmationRedirectUrl(): string {
  return `${window.location.origin}${accountRoutes.signIn}`;
}

export function passwordRecoveryRedirectUrl(): string {
  return `${window.location.origin}${accountRoutes.newPassword}`;
}

export function readReturnTo(searchParams: URLSearchParams): string | null {
  const value = searchParams.get("returnTo");
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

export const SESSION_EXPIRED_QUERY_PARAM = "sessionExpired";

export function signInPathWithReturnTo(returnTo: string, options?: { sessionExpired?: boolean }): string {
  const params = new URLSearchParams({ returnTo });
  if (options?.sessionExpired) {
    params.set(SESSION_EXPIRED_QUERY_PARAM, "1");
  }
  return `${accountRoutes.signIn}?${params.toString()}`;
}

export function readSessionExpiredFromSignIn(searchParams: URLSearchParams): boolean {
  return searchParams.get(SESSION_EXPIRED_QUERY_PARAM) === "1";
}
