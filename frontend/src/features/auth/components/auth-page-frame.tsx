import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import LanguageToggle from "@/components/language-toggle";
import { appCopy } from "@/utils/app-copy";
import type { AppCopyKey, AppLanguage } from "@/utils/app-copy";
import "@/features/auth/components/account-auth.css";

type Props = {
  language: AppLanguage;
  onLanguageChange: (language: AppLanguage) => void;
  title: string;
  subtitle: string;
  showRegistrationContext?: boolean;
  children: ReactNode;
};

export function AuthPageFrame({
  language,
  onLanguageChange,
  title,
  subtitle,
  showRegistrationContext = true,
  children,
}: Props) {
  const t = (key: AppCopyKey) => appCopy(language, key);

  return (
    <div className="account-auth-page" lang={language === "pt" ? "pt-BR" : "en-US"}>
      <header className="account-auth-header">
        <Link className="account-auth-brand" to="/">Karlbrüder</Link>
        <LanguageToggle language={language} onLanguageChange={onLanguageChange} />
      </header>
      <main className="account-auth-main">
        <div className="account-auth-layout">
          <section className="account-auth-story">
            <p className="account-auth-overline">{t("Sua conta")}</p>
            <h1>{title}</h1>
            <p>{t("Uma conta para acompanhar seus torneios na Karlbrüder.")}</p>
            {showRegistrationContext && (
              <>
                <hr className="account-auth-divider" />
                <p className="account-auth-muted">
                  {t("Você está continuando a inscrição em")} <strong>{t("Monomachia Karlbrüder 2027")}</strong>
                </p>
              </>
            )}
          </section>
          <section className="account-auth-form-panel" aria-labelledby="account-auth-form-title">
            <h2 id="account-auth-form-title">{subtitle}</h2>
            {children}
          </section>
        </div>
      </main>
    </div>
  );
}

