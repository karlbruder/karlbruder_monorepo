import { useEffect, useState } from "react";
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
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const errorCode = consumeSupabaseAuthRedirectErrorCode();
    if (!errorCode) {
      return;
    }
    setMessage(registrationCopy(language, supabaseAuthRedirectErrorCopyKey(errorCode, context)));
  }, [language, context]);

  return message;
}
