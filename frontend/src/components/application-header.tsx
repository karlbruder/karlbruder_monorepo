import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { HeaderIcon } from "@/components/header-icon";
import { useAppearance } from "@/hooks/use-appearance";
import type { Appearance } from "@/hooks/use-appearance";
import type { AppLanguage } from "@/utils/app-copy";
import guildLogo from "@/components/assets/guild-logo.png";

type Props = {
  language: AppLanguage;
  onLanguageChange?: (language: AppLanguage) => void;
  navigation?: ReactNode;
  children?: ReactNode;
};

type Panel = "appearance" | "language" | "navigation";

const appearances: { value: Appearance; en: string; pt: string }[] = [
  { value: "light", en: "Light", pt: "Claro" },
  { value: "dark", en: "Dark", pt: "Escuro" },
  { value: "system", en: "System", pt: "Sistema" },
];

const languages = [
  { value: "pt", name: "Português", lang: "pt-BR" },
  { value: "en", name: "English", lang: "en" },
] as const;

export function ApplicationHeader({ language, onLanguageChange, navigation, children }: Props) {
  const { appearance, changeAppearance } = useAppearance();
  const [open, setOpen] = useState<Panel | null>(null);
  const header = useRef<HTMLElement>(null);
  const prefix = useId();
  const en = language === "en";
  const appearanceLabel = en ? "Appearance" : "Aparência";
  const languageLabel = en ? "Language" : "Idioma";
  const currentAppearance = appearances.find(option => option.value === appearance);
  const hasNavigation = Boolean(navigation || children);

  useEffect(() => {
    if (!open) return;

    function closeOutside(event: Event) {
      const target = event.target;
      if (!(target instanceof Element) || !header.current?.contains(target.closest(`[data-panel="${open}"]`))) {
        setOpen(null);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape" || !open) return;

      event.preventDefault();
      setOpen(null);
      header.current?.querySelector<HTMLElement>(`[data-panel="${open}"] > button`)?.focus();
    }

    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("focusin", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("focusin", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function closeAndRestoreFocus(panel: Panel) {
    setOpen(null);
    header.current?.querySelector<HTMLElement>(`[data-panel="${panel}"] > button`)?.focus();
  }

  function toggle(panel: Panel) {
    setOpen(current => current === panel ? null : panel);
  }

  return (
    <header className="application-header" ref={header}>
      <div className="application-header-inner">
        <a className="application-brand" href="/" aria-label="Karlbrüder">
          <img src={guildLogo} alt="" width="174" />
        </a>
        {hasNavigation && (
          <div className="application-navigation" data-panel="navigation">
            <button className="header-icon-button application-menu-button" type="button" aria-label={en ? "Navigation menu" : "Menu de navegação"} aria-expanded={open === "navigation"} aria-controls={`${prefix}-navigation`} onClick={() => toggle("navigation")}>
              <HeaderIcon name="menu" />
            </button>
            <div className="application-navigation-content" id={`${prefix}-navigation`}>
              {navigation && <nav aria-label={en ? "Main navigation" : "Navegação principal"}>{navigation}</nav>}
              {children && <div className="application-account">{children}</div>}
            </div>
          </div>
        )}
        <div className="application-tools">
          <div className="application-preferences">
            <div data-panel="appearance">
              <button
                className="header-icon-button"
                type="button"
                aria-label={appearanceLabel}
                aria-description={currentAppearance?.[language]}
                title={`${appearanceLabel} · ${currentAppearance?.[language]}`}
                aria-expanded={open === "appearance"}
                aria-controls={`${prefix}-appearance`}
                onClick={() => toggle("appearance")}
              >
                <HeaderIcon name={appearance} />
              </button>
              <div className="preference-popover" id={`${prefix}-appearance`} hidden={open !== "appearance"} role="group" aria-label={appearanceLabel}>
                {appearances.map(option => (
                  <button key={option.value} className="preference-option" type="button" aria-pressed={appearance === option.value} onClick={() => {
                    changeAppearance(option.value);
                    closeAndRestoreFocus("appearance");
                  }}>
                    <HeaderIcon name={option.value} />
                    {option[language]}
                    <HeaderIcon name="check" />
                  </button>
                ))}
              </div>
            </div>
            {onLanguageChange && (
              <div data-panel="language">
                <button
                  className="header-icon-button"
                  type="button"
                  aria-label={`${languageLabel} · ${language.toUpperCase()}`}
                  title={languageLabel}
                  aria-expanded={open === "language"}
                  aria-controls={`${prefix}-language`}
                  onClick={() => toggle("language")}
                >
                  <HeaderIcon name="globe" />
                  <span>{language.toUpperCase()}</span>
                  <HeaderIcon name="chevron" />
                </button>
                <div className="preference-popover" id={`${prefix}-language`} hidden={open !== "language"} role="group" aria-label={languageLabel}>
                  {languages.map(option => (
                    <button key={option.value} className="preference-option" type="button" aria-pressed={language === option.value} onClick={() => {
                      onLanguageChange(option.value);
                      closeAndRestoreFocus("language");
                    }}>
                      <span lang={option.lang}>{option.name}</span>
                      <HeaderIcon name="check" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
