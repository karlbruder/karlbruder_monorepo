import { Link } from "react-router-dom";
import AppLanguageToggle from "./AppLanguageToggle";
import { accountRoutes } from "./accountRoutes";
import type { Session } from "@supabase/supabase-js";
import { registrationCopy } from "./registrationLanguage";
import type { RegistrationCopyKey, RegistrationLanguage } from "./registrationLanguage";

type Props = {
  session: Session;
  language: RegistrationLanguage;
  onLanguageChange: (language: RegistrationLanguage) => void;
  onSignOut: () => Promise<void>;
  authError: RegistrationCopyKey | null;
};

export default function SignedInHomePage({ session, language, onLanguageChange, onSignOut, authError }: Props) {
  const t = (key: RegistrationCopyKey) => registrationCopy(language, key);

  return (
    <main className="app-center">
      <div className="home-signed-in-shell">
        <AppLanguageToggle language={language} onLanguageChange={onLanguageChange} />
        <div className="home-account">
          <h1>Karlbrüder</h1>
          <p>{session.user.user_metadata?.name ?? session.user.email}</p>
          <Link to={accountRoutes.password}>{t("Alterar senha")}</Link>
          <a href="/tournaments/registration">{t("Inscrição Monomachia")}</a>
          <button type="button" onClick={onSignOut}>{t("Sair")}</button>
        </div>
      </div>
      {authError && <p role="alert">{t(authError)}</p>}
    </main>
  );
}
