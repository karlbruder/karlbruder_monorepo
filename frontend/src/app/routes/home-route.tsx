import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { useLanguage } from "@/hooks/use-language";
import { Link } from "react-router-dom";
import { ApplicationHeader } from "@/components/application-header";
import { ApplicationFooter } from "@/components/application-footer";
import { accountRoutes } from "@/config/account-routes";
import { appCopy } from "@/utils/app-copy";
import type { AppCopyKey } from "@/utils/app-copy";

export default function HomeRoute() {
  const { session, signOut, authError } = useAuthSession();
  const { language, changeLanguage } = useLanguage();
  const t = (key: AppCopyKey) => appCopy(language, key);
  const en = language === "en";
  const name = session?.user.user_metadata?.name;

  return (
    <div className="application-page" lang={en ? "en-US" : "pt-BR"}>
      <ApplicationHeader language={language} onLanguageChange={changeLanguage} />
      <main className="application-body home-body">
        <div className="page-intro">
          <p className="eyebrow">{en ? "Personal area" : "Área pessoal"}</p>
          <h1>{name ? `${en ? "Hello" : "Olá"}, ${name}.` : en ? "Welcome." : "Boas-vindas."}</h1>
          <p className="muted">{name ?? session?.user.email}</p>
        </div>
        <div className="home-layout">
          <section aria-labelledby="home-registration-title">
            <p className="eyebrow">{en ? "Your tournament" : "Seu torneio"}</p>
            <h2 id="home-registration-title">{en ? "Registration" : "Inscrição"}</h2>
            <article className="home-registration">
              <p className="eyebrow">Monomachia</p>
              <h3>{t("Inscrição Monomachia")}</h3>
              <p className="muted">{en ? "Open the tournament to register or follow your registration." : "Acesse o torneio para se inscrever ou acompanhar sua inscrição."}</p>
              <a href="/tournaments/registration" className="screen-link">{t("Inscrição Monomachia")} <span aria-hidden="true">→</span></a>
            </article>
          </section>
          <aside>
            <section className="home-shortcuts">
              <p className="eyebrow">{en ? "Quick access" : "Acesso rápido"}</p>
              <h2>{en ? "My account" : "Minha conta"}</h2>
              <Link className="shortcut-link" to={accountRoutes.password} aria-label={t("Alterar senha")}>
                <span><strong>{t("Alterar senha")}</strong><small>{en ? "Update your access password" : "Atualize sua senha de acesso"}</small></span><span aria-hidden="true">→</span>
              </Link>
              <button className="secondary-button" type="button" onClick={signOut}>{t("Sair")}</button>
            </section>
            {session?.user.app_metadata?.karlbruder_role === "admin" && (
              <section className="home-shortcuts">
                <p className="eyebrow">{en ? "Admin only" : "Somente admin"}</p>
                <h2>{en ? "Guild" : "Guilda"}</h2>
                <Link className="shortcut-link" to="/staff/tournaments" aria-label={en ? "Guild panel" : "Painel da Guilda"}>
                  <span><strong>{en ? "Guild panel" : "Painel da Guilda"}</strong><small>{en ? "Tournaments, payments and users" : "Torneios, pagamentos e usuários"}</small></span><span aria-hidden="true">→</span>
                </Link>
              </section>
            )}
          </aside>
        </div>
        {authError && <p role="alert">{t(authError)}</p>}
      </main>
      <ApplicationFooter language={language} />
    </div>
  );
}
