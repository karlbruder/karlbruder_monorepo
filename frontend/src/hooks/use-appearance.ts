import { useLayoutEffect, useState } from "react";
import { readPreference, savePreference } from "@/utils/browser-preferences";

export type Appearance = "light" | "dark" | "system";
const storageKey = "karlbruder.appearance";

export function readAppearance(): Appearance {
  const saved = readPreference(storageKey);
  return saved === "dark" || saved === "system" ? saved : "light";
}

export function applyAppearance(appearance: Appearance, systemDark?: boolean) {
  const dark = systemDark ?? window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
  document.documentElement.dataset.theme =
    appearance === "system" ? (dark ? "dark" : "light") : appearance;
}

export function useAppearance() {
  const [appearance, setAppearance] = useState(readAppearance);

  useLayoutEffect(() => {
    if (appearance !== "system") {
      applyAppearance(appearance);
      return;
    }

    const system = window.matchMedia?.("(prefers-color-scheme: dark)");
    const update = () => applyAppearance(appearance, system?.matches ?? false);
    update();
    system?.addEventListener("change", update);
    return () => system?.removeEventListener("change", update);
  }, [appearance]);

  function changeAppearance(next: Appearance) {
    savePreference(storageKey, next);
    setAppearance(next);
  }

  return { appearance, changeAppearance };
}
