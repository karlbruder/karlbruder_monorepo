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

export function signInPathWithReturnTo(returnTo: string): string {
  return `${accountRoutes.signIn}?returnTo=${encodeURIComponent(returnTo)}`;
}
