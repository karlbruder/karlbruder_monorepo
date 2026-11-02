import { createContext, useContext } from "react";
import type { useLanguagePreference } from "@/hooks/use-language-preference";

export const LanguageContext = createContext<ReturnType<typeof useLanguagePreference> | null>(null);

export function useLanguage() {
  const language = useContext(LanguageContext);
  if (!language) throw new Error("LanguageProvider is required");
  return language;
}
