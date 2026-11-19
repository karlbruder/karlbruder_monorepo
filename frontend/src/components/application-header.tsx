import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { accountRoutes } from "@/config/account-routes";
import { appCopy } from "@/utils/app-copy";
import { HeaderIcon } from "@/components/header-icon";
import { useAppearance } from "@/hooks/use-appearance";
import type { Appearance } from "@/hooks/use-appearance";
import type { AppLanguage } from "@/utils/app-copy";
import guildLogo from "@/components/assets/guild-logo.png";

type Props = {
  language: AppLanguage;
  onLanguageChange: (language: AppLanguage) => void;
  navigation: ReactNode;
  routeKey: string;
  account?: {
    name?: string;
    email?: string;
    initials: string;
    photo?: string;
    onSignOut: () => Promise<void>;
  };
};

type Panel = "appearance" | "language" | "navigation" | "account";

const appearances: { value: Appearance; en: string; pt: string }[] = [
  { value: "light", en: "Light", pt: "Claro" },
  { value: "dark", en: "Dark", pt: "Escuro" },
  { value: "system", en: "System", pt: "Sistema" },
];

const languages = [
  { value: "pt", name: "Português", lang: "pt-BR" },
  { value: "en", name: "English", lang: "en" },
] as const;

export function ApplicationHeader({ language, onLanguageChange, navigation, routeKey, account }: Props) {
  const { appearance, changeAppearance } = useAppearance();
  const [panel, setPanel] = useState<{ name: Panel; routeKey: string } | null>(null);
  const [failedPhoto, setFailedPhoto] = useState<string>();
  const open = panel?.routeKey === routeKey ? panel.name : null;
  const header = useRef<HTMLElement>(null);
  const prefix = useId();
  const en = language === "en";
  const appearanceLabel = en ? "Appearance" : "Aparência";
  const languageLabel = en ? "Language" : "Idioma";
  const currentAppearance = appearances.find(option => option.value === appearance);
  const accountLabel = en ? "My account" : "Minha conta";
  const photo = account?.photo !== failedPhoto ? account?.photo : undefined;
  const accountButtonLabel = !photo && account?.initials ? `${accountLabel} · ${account.initials}` : accountLabel;

  useEffect(() => {
    if (!open) return;

    function closeOutside(event: Event) {
      const target = event.target;
      if (!(target instanceof Element) || !header.current?.contains(target.closest(`[data-panel="${open}"]`))) {
        setPanel(null);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape" || !open) return;

      event.preventDefault();
      setPanel(null);
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
    setPanel(null);
    header.current?.querySelector<HTMLElement>(`[data-panel="${panel}"] > button`)?.focus();
  }

  function toggle(panel: Panel) {
    setPanel(open === panel ? null : { name: panel, routeKey });
  }

  return (
    <header className="application-header" ref={header}>
      <div className="application-header-inner">
        <NavLink className="application-brand" to={account ? "/" : "/tournaments/registration"} aria-label="Karlbrüder" end>
          <img src={guildLogo} alt="" width="174" />
        </NavLink>
        <div className="application-navigation" data-panel="navigation">
          <button className="header-icon-button application-menu-button" type="button" aria-label={en ? "Navigation menu" : "Menu de navegação"} aria-expanded={open === "navigation"} aria-controls={`${prefix}-navigation`} onClick={() => toggle("navigation")}>
            <HeaderIcon name="menu" />
          </button>
          <nav className="application-navigation-content" id={`${prefix}-navigation`} aria-label={en ? "Main navigation" : "Navegação principal"}>
            {navigation}
          </nav>
        </div>
        <div className="application-tools">
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
          <div data-panel="language">
            <button
              className="header-icon-button language-trigger"
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
          {account && (
            <div className="application-account" data-panel="account">
              <button
                className="header-icon-button account-trigger"
                type="button"
                aria-label={accountButtonLabel}
                aria-expanded={open === "account"}
                aria-controls={`${prefix}-account`}
                onClick={() => toggle("account")}
              >
                <span className="account-avatar" aria-hidden="true">
                  {photo ? <img src={photo} alt="" width="32" height="32" referrerPolicy="no-referrer" onError={() => setFailedPhoto(photo)} />
                    : account.initials || <HeaderIcon name="person" />}
                </span>
              </button>
              <div className="preference-popover account-popover" id={`${prefix}-account`} hidden={open !== "account"}>
                <div className="account-menu-identity">
                  <strong>{account.name || accountLabel}</strong>
                  {account.email && <small>{account.email}</small>}
                </div>
                <NavLink className="account-action" to={accountRoutes.password} onClick={() => setPanel(null)}>
                  <HeaderIcon name="password" />
                  {appCopy(language, "Alterar senha")}
                </NavLink>
                <button className="account-action account-sign-out" type="button" onClick={() => {
                  closeAndRestoreFocus("account");
                  void account.onSignOut();
                }}>
                  <HeaderIcon name="signOut" />
                  {appCopy(language, "Sair")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
