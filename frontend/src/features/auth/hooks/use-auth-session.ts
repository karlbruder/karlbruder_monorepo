import { createContext, useContext } from "react";
import type { useAuthSessionState } from "@/features/auth/hooks/use-auth-session-state";

export const AuthSessionContext = createContext<ReturnType<typeof useAuthSessionState> | null>(null);

export function useAuthSession() {
  const session = useContext(AuthSessionContext);
  if (!session) throw new Error("AuthSessionProvider is required");
  return session;
}
