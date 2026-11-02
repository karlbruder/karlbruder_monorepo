import { isAuthRetryableFetchError, isAuthWeakPasswordError, type AuthError } from "@supabase/supabase-js";
import { registrationCopy } from "./registrationLanguage";
import type { RegistrationCopyKey, RegistrationLanguage } from "./registrationLanguage";

export type SupabaseAuthErrorContext = "sign_in" | "sign_up" | "recover" | "update_password";

const AUTH_ERROR_COPY: Partial<Record<string, RegistrationCopyKey>> = {
  bad_code_verifier: "Não foi possível concluir o acesso. Tente novamente.",
  captcha_failed: "Não foi possível concluir o acesso. Tente novamente.",
  email_address_invalid: "Informe um endereço de e-mail válido.",
  email_address_not_authorized: "Não foi possível enviar o e-mail para este endereço. Verifique o e-mail informado.",
  email_exists: "Este e-mail já está em uso.",
  email_not_confirmed: "Confirme seu e-mail antes de entrar.",
  email_provider_disabled: "Novas contas por e-mail estão desativadas no momento.",
  flow_state_expired: "Este link expirou ou já foi usado. Solicite um novo link.",
  flow_state_not_found: "Este link expirou ou já foi usado. Solicite um novo link.",
  invalid_credentials: "E-mail ou senha incorretos. Tente novamente.",
  invite_not_found: "Este link expirou ou já foi usado. Solicite um novo link.",
  mfa_verification_failed: "Código incorreto ou expirado. Tente novamente.",
  otp_expired: "Este link expirou ou já foi usado. Solicite um novo link.",
  over_email_send_rate_limit: "Aguarde alguns minutos antes de tentar novamente.",
  over_request_rate_limit: "Aguarde alguns minutos antes de tentar novamente.",
  reauthentication_needed: "Confirme sua identidade antes de alterar a senha.",
  reauthentication_not_valid: "Código incorreto ou expirado. Tente novamente.",
  same_password: "A nova senha precisa ser diferente da senha atual.",
  session_expired: "Sua sessão expirou",
  session_not_found: "Sua sessão expirou",
  signup_disabled: "Novas contas por e-mail estão desativadas no momento.",
  user_already_exists: "Este e-mail já está em uso.",
  user_banned: "Esta conta está suspensa. Entre em contato com a organização.",
  validation_failed: "Informe um endereço de e-mail válido.",
  weak_password: "Use uma senha com pelo menos 8 caracteres, com letras maiúsculas e minúsculas, números e símbolos.",
};

const WEAK_PASSWORD_LENGTH_COPY_KEY: RegistrationCopyKey = "Use pelo menos 8 caracteres na senha.";
const WEAK_PASSWORD_PWNED_COPY_KEY: RegistrationCopyKey =
  "Esta senha apareceu em vazamentos conhecidos. Escolha outra.";

const CONTEXT_FALLBACK: Record<SupabaseAuthErrorContext, RegistrationCopyKey> = {
  sign_in: "Não foi possível entrar. Tente novamente.",
  sign_up: "Não foi possível criar a conta. Tente novamente.",
  recover: "Não foi possível enviar o link de recuperação. Tente novamente.",
  update_password: "Não foi possível atualizar a senha. Tente novamente.",
};

export const ACCOUNT_PASSWORD_POLICY_COPY_KEY: RegistrationCopyKey =
  "Use uma senha com pelo menos 8 caracteres, com letras maiúsculas e minúsculas, números e símbolos.";

function readAuthErrorCode(error: AuthError): string | undefined {
  if (typeof error.code === "string" && error.code.length > 0) {
    return error.code;
  }
  return undefined;
}

function weakPasswordCopyKey(error: AuthError): RegistrationCopyKey {
  if (isAuthWeakPasswordError(error)) {
    if (error.reasons.includes("pwned")) {
      return WEAK_PASSWORD_PWNED_COPY_KEY;
    }
    if (error.reasons.includes("length") && !error.reasons.includes("characters")) {
      return WEAK_PASSWORD_LENGTH_COPY_KEY;
    }
  }
  return AUTH_ERROR_COPY.weak_password!;
}

function isSupabaseAuthError(error: unknown): error is AuthError {
  return typeof error === "object" && error !== null && "__isAuthError" in error;
}

export function isSupabaseAuthServiceUnavailable(error: unknown): boolean {
  return isAuthRetryableFetchError(error);
}

export function supabaseAuthErrorCopyKey(
  error: unknown,
  context: SupabaseAuthErrorContext,
): RegistrationCopyKey {
  if (!isSupabaseAuthError(error)) {
    return CONTEXT_FALLBACK[context];
  }
  const code = readAuthErrorCode(error);
  if (code === "weak_password") {
    return weakPasswordCopyKey(error);
  }
  if (code && AUTH_ERROR_COPY[code]) {
    return AUTH_ERROR_COPY[code]!;
  }
  return CONTEXT_FALLBACK[context];
}

export function supabaseAuthErrorMessage(
  error: unknown,
  language: RegistrationLanguage,
  context: SupabaseAuthErrorContext,
): string {
  return registrationCopy(language, supabaseAuthErrorCopyKey(error, context));
}

export function supabaseAuthRedirectErrorCopyKey(
  errorCode: string | null,
  context: SupabaseAuthErrorContext,
): RegistrationCopyKey {
  if (errorCode && AUTH_ERROR_COPY[errorCode]) {
    return AUTH_ERROR_COPY[errorCode]!;
  }
  if (errorCode === "access_denied") {
    return "Este link expirou ou já foi usado. Solicite um novo link.";
  }
  return CONTEXT_FALLBACK[context];
}

function readRedirectErrorCodeFromHash(): string | null {
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  if (!hash) {
    return null;
  }
  const params = new URLSearchParams(hash);
  return params.get("error_code") ?? params.get("error");
}

export function consumeSupabaseAuthRedirectErrorCode(): string | null {
  const errorCode = readRedirectErrorCodeFromHash();
  if (!errorCode) {
    return null;
  }
  const url = new URL(window.location.href);
  url.hash = "";
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}`);
  return errorCode;
}
