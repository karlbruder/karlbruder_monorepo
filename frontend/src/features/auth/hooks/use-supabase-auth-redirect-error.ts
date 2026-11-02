import { useState } from "react";
import { appCopy } from "@/utils/app-copy";
import type { AppLanguage } from "@/utils/app-copy";
import {
  consumeSupabaseAuthRedirectErrorCode,
  supabaseAuthRedirectErrorCopyKey,
  type SupabaseAuthErrorContext,
} from "@/features/auth/utils/supabase-auth-errors";

export function useSupabaseAuthRedirectError(
  language: AppLanguage,
  context: SupabaseAuthErrorContext,
): string | null {
  const [errorCode] = useState(consumeSupabaseAuthRedirectErrorCode);
  if (!errorCode) {
    return null;
  }
  return appCopy(language, supabaseAuthRedirectErrorCopyKey(errorCode, context));
}
