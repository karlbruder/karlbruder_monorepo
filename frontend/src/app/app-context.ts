import { createContext, useContext } from "react";
import type { useAppAuth } from "@/features/auth/hooks/use-app-auth";
import type { useRegistrationLanguage } from "@/hooks/use-registration-language";

type AppState = {
  auth: ReturnType<typeof useAppAuth>;
} & ReturnType<typeof useRegistrationLanguage>;

export const AppContext = createContext<AppState | null>(null);

export function useAppContext() {
  const value = useContext(AppContext);
  if (!value) throw new Error("AppProvider is required");
  return value;
}
