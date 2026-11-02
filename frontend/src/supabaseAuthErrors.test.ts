import { describe, expect, it } from "vitest";
import { AuthApiError } from "@supabase/supabase-js";
import {
  consumeSupabaseAuthRedirectErrorCode,
  supabaseAuthErrorCopyKey,
  supabaseAuthErrorMessage,
  supabaseAuthRedirectErrorCopyKey,
} from "./supabaseAuthErrors";

function authApiError(code: string, message: string): AuthApiError {
  return new AuthApiError(message, 422, code);
}

describe("supabaseAuthErrorCopyKey", () => {
  it("maps weak_password to the app password policy message", () => {
    expect(supabaseAuthErrorCopyKey(authApiError("weak_password", "Password should contain..."), "update_password")).toBe(
      "Use uma senha com pelo menos 8 caracteres, com letras maiúsculas e minúsculas, números e símbolos.",
    );
  });

  it("maps invalid_credentials to a generic sign-in failure message", () => {
    expect(supabaseAuthErrorCopyKey(authApiError("invalid_credentials", "Invalid login credentials"), "sign_in")).toBe(
      "E-mail ou senha incorretos. Tente novamente.",
    );
  });

  it("falls back to the flow-specific message when the code is unknown", () => {
    expect(supabaseAuthErrorCopyKey(authApiError("unexpected_failure", "fail"), "sign_up")).toBe(
      "Não foi possível criar a conta. Tente novamente.",
    );
  });
});

describe("supabaseAuthErrorMessage", () => {
  it("returns English copy when the UI language is English", () => {
    expect(
      supabaseAuthErrorMessage(authApiError("email_exists", "exists"), "en", "sign_up"),
    ).toBe("This email is already in use.");
  });
});

describe("supabaseAuthRedirectErrorCopyKey", () => {
  it("maps otp_expired from redirect hashes to the expired link message", () => {
    expect(supabaseAuthRedirectErrorCopyKey("otp_expired", "update_password")).toBe(
      "Este link expirou ou já foi usado. Solicite um novo link.",
    );
  });
});

describe("consumeSupabaseAuthRedirectErrorCode", () => {
  it("reads error_code from the hash and clears it from the location", () => {
    window.history.replaceState({}, "", "/account/new-password#error_code=otp_expired");

    expect(consumeSupabaseAuthRedirectErrorCode()).toBe("otp_expired");
    expect(window.location.hash).toBe("");
  });
});
