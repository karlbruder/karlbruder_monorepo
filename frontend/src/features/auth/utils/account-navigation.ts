import { accountRoutes } from "@/config/account-routes";

export function getEmailConfirmationRedirectUrl(): string {
  return `${window.location.origin}${accountRoutes.signIn}`;
}

export function getPasswordRecoveryRedirectUrl(returnTo?: string | null): string {
  const url = new URL(`${window.location.origin}${accountRoutes.newPassword}`);
  if (returnTo) {
    url.searchParams.set("returnTo", returnTo);
  }
  return url.toString();
}

export function getReturnToPath(searchParams: URLSearchParams): string | null {
  const value = searchParams.get("returnTo");
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

export function isTournamentRegistrationPath(returnTo: string): boolean {
  return returnTo.split("?")[0] === "/tournaments/registration";
}

export const SESSION_EXPIRED_QUERY_PARAM = "sessionExpired";

export function buildSignInPath(returnTo: string, options?: { sessionExpired?: boolean }): string {
  const params = new URLSearchParams({ returnTo });
  if (options?.sessionExpired) {
    params.set(SESSION_EXPIRED_QUERY_PARAM, "1");
  }
  return `${accountRoutes.signIn}?${params.toString()}`;
}

export function hasSessionExpiredParameter(searchParams: URLSearchParams): boolean {
  return searchParams.get(SESSION_EXPIRED_QUERY_PARAM) === "1";
}
