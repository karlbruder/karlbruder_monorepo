import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { useLanguage } from "@/hooks/use-language";
import { Link } from "react-router-dom";
import LanguageToggle from "@/components/language-toggle";
import { accountRoutes } from "@/config/account-routes";
import { appCopy } from "@/utils/app-copy";
import type { AppCopyKey } from "@/utils/app-copy";

export default function HomeRoute() {
  const { session, signOut, authError } = useAuthSession();
  const { language, changeLanguage } = useLanguage();
  const t = (key: AppCopyKey) => appCopy(language, key);

  return (
    <main className="app-center">
      <div className="home-signed-in-shell">
        <LanguageToggle language={language} onLanguageChange={changeLanguage} />
        <div className="home-account">
          <h1>Karlbrüder</h1>
          <p>{session?.user.user_metadata?.name ?? session?.user.email}</p>
          <Link to={accountRoutes.password}>{t("Alterar senha")}</Link>
          <a href="/tournaments/registration">{t("Inscrição Monomachia")}</a>
          {session?.user.app_metadata?.karlbruder_role === "admin" && <Link to="/staff/payment-reviews">{t("Análise de pagamentos")}</Link>}
          <button type="button" onClick={signOut}>{t("Sair")}</button>
        </div>
      </div>
      {authError && <p role="alert">{t(authError)}</p>}
    </main>
  );
}
