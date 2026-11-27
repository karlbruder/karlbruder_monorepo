import type { ReactNode } from "react";
import { ApplicationFooter } from "@/components/application-footer";
import { appCopy } from "@/utils/app-copy";
import type { AppCopyKey, AppLanguage } from "@/utils/app-copy";
import "@/features/auth/components/account-auth.css";

type Props = {
  language: AppLanguage;
  title: string;
  subtitle: string;
  showTournamentRegistrationMessage?: boolean;
  children: ReactNode;
};

export function AuthPageFrame({
  language,
  title,
  subtitle,
  showTournamentRegistrationMessage = false,
  children,
}: Props) {
  const t = (key: AppCopyKey) => appCopy(language, key);

  return (
    <div className="account-auth-page" lang={language === "pt" ? "pt-BR" : "en-US"}>
      <main className="account-auth-main">
        <div className="account-auth-layout">
          <section className="account-auth-story">
            <p className="account-auth-overline">{language === "en" ? "Your next experience" : "Sua próxima experiência"}</p>
            <h1 className="visually-hidden">{title}</h1>
            <h2>{t("Da primeira inscrição ao próximo encontro.")}</h2>
            <p>{t("Uma conta para acompanhar seus torneios na Karlbrüder.")}</p>
            {showTournamentRegistrationMessage && (
              <>
                <hr className="account-auth-divider" />
                <p className="account-auth-muted">
                  {t("Você está continuando sua inscrição no torneio.")}
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
      <ApplicationFooter />
    </div>
  );
}

