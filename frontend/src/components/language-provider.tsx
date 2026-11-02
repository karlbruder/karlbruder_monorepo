import type { ReactNode } from "react";
import { LanguageContext } from "@/hooks/use-language";
import { useLanguagePreference } from "@/hooks/use-language-preference";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const language = useLanguagePreference();
  return <LanguageContext value={language}>{children}</LanguageContext>;
}
