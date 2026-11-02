import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import AppLanguageToggle from "@/components/app-language-toggle";
import { registrationCopy } from "@/utils/registration-language";
import type { RegistrationCopyKey, RegistrationLanguage } from "@/utils/registration-language";
import "@/features/auth/components/account-auth.css";

type Props = {
  language: RegistrationLanguage;
  onLanguageChange: (language: RegistrationLanguage) => void;
  title: string;
  subtitle: string;
  showRegistrationContext?: boolean;
  children: ReactNode;
};

export function AccountAuthLayout({
  language,
  onLanguageChange,
  title,
  subtitle,
  showRegistrationContext = true,
  children,
}: Props) {
  const t = (key: RegistrationCopyKey) => registrationCopy(language, key);

  return (
    <div className="account-auth-page" lang={language === "pt" ? "pt-BR" : "en-US"}>
      <header className="account-auth-header">
        <Link className="account-auth-brand" to="/">Karlbrüder</Link>
        <AppLanguageToggle language={language} onLanguageChange={onLanguageChange} />
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

export function GoogleSignInButton({
  language,
  loading,
  onSignIn,
  secondary = true,
  labelKey = "Continuar com Google",
}: {
  language: RegistrationLanguage;
  loading: boolean;
  onSignIn: () => Promise<void>;
  secondary?: boolean;
  labelKey?: RegistrationCopyKey;
}) {
  const t = (key: RegistrationCopyKey) => registrationCopy(language, key);
  return (
    <button
      className={`google-btn${secondary ? " secondary" : ""}`}
      type="button"
      onClick={onSignIn}
      disabled={loading}
    >
      {t(loading ? "Entrando..." : labelKey)}
    </button>
  );
}

export function AuthServiceNotice({ language, kind }: { language: RegistrationLanguage; kind: "expired" | "unavailable" }) {
  const t = (key: RegistrationCopyKey) => registrationCopy(language, key);
  if (kind === "expired") {
    return (
      <div className="account-auth-notice info" role="status">
        <strong>{t("Sua sessão expirou")}</strong>
        <p className="account-auth-muted">{t("Entre novamente para continuar no torneio selecionado.")}</p>
      </div>
    );
  }
  return (
    <div className="account-auth-notice error" role="alert">
      <strong>{t("Serviço temporariamente indisponível")}</strong>
      <p className="account-auth-muted">{t("Não foi possível conectar ao serviço de acesso. Tente novamente em instantes.")}</p>
    </div>
  );
}
