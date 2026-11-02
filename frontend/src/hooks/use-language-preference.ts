import { useEffect, useState } from "react";
import type { AppLanguage } from "@/utils/app-copy";

const storageKey = "registrationLanguage";
function validLanguage(value: string | null): value is AppLanguage {
  return value === "pt" || value === "en";
}

export function useLanguagePreference() {
  const [language, setLanguage] = useState<AppLanguage>(() => {
    const query = new URLSearchParams(window.location.search).get("lang");
    if (validLanguage(query)) return query;
    const saved = window.localStorage.getItem(storageKey);
    return validLanguage(saved) ? saved : "pt";
  });

  useEffect(() => {
    window.localStorage.setItem(storageKey, language);
  }, [language]);

  const changeLanguage = (next: AppLanguage) => {
    const url = new URL(window.location.href);
    url.searchParams.set("lang", next);
    window.history.replaceState(window.history.state, "", url);
    window.localStorage.setItem(storageKey, next);
    setLanguage(next);
  };

  return { language, changeLanguage };
}
