import type { ReactNode } from "react";
import { ApplicationHeader } from "@/components/application-header";
import { ApplicationFooter } from "@/components/application-footer";
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
      <ApplicationHeader language={language} onLanguageChange={onLanguageChange} />
      <main className="account-auth-main">
        <div className="account-auth-layout">
          <section className="account-auth-story">
            <p className="account-auth-overline">{language === "en" ? "Your next experience" : "Sua próxima experiência"}</p>
            <h1 className="visually-hidden">{title}</h1>
            <h2>{t("Da primeira inscrição ao próximo encontro.")}</h2>
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
            <p className="account-auth-overline">{t("Sua conta")}</p>
            <h2 id="account-auth-form-title">{subtitle}</h2>
            {children}
          </section>
        </div>
      </main>
      <ApplicationFooter language={language} />
    </div>
  );
}

