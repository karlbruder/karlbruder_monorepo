import { useState } from "react";
import { registrationCopy } from "@/utils/registration-language";
import type { RegistrationLanguage } from "@/utils/registration-language";
import {
  consumeSupabaseAuthRedirectErrorCode,
  supabaseAuthRedirectErrorCopyKey,
  type SupabaseAuthErrorContext,
} from "@/features/auth/utils/supabase-auth-errors";

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
