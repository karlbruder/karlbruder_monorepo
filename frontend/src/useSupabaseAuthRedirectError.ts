import { useState } from "react";
import { registrationCopy } from "./registrationLanguage";
import type { RegistrationLanguage } from "./registrationLanguage";
import {
  consumeSupabaseAuthRedirectErrorCode,
  supabaseAuthRedirectErrorCopyKey,
  type SupabaseAuthErrorContext,
} from "./supabaseAuthErrors";

export function useSupabaseAuthRedirectError(
  language: RegistrationLanguage,
  context: SupabaseAuthErrorContext,
): string | null {
  const [errorCode] = useState(consumeSupabaseAuthRedirectErrorCode);
  if (!errorCode) {
    return null;
  }
  return registrationCopy(language, supabaseAuthRedirectErrorCopyKey(errorCode, context));
}
