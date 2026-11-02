import type { ReactNode } from "react";
import { AuthSessionContext } from "@/features/auth/hooks/use-auth-session";
import { useAuthSessionState } from "@/features/auth/hooks/use-auth-session-state";

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const auth = useAuthSessionState();
  return <AuthSessionContext value={auth}>{children}</AuthSessionContext>;
}
