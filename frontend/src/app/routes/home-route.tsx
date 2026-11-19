import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { accountProfile } from "@/features/auth/utils/account-profile";
import { useLanguage } from "@/hooks/use-language";
import { Link } from "react-router-dom";
import { ApplicationFooter } from "@/components/application-footer";
import { appCopy } from "@/utils/app-copy";
import type { AppCopyKey } from "@/utils/app-copy";

export default function HomeRoute() {
  const { session } = useAuthSession();
  const { language } = useLanguage();
  const t = (key: AppCopyKey) => appCopy(language, key);
  const en = language === "en";
  const name = session ? accountProfile(session.user).name : undefined;
  const admin = session?.user.app_metadata?.karlbruder_role === "admin";

  return (
    <div className="application-page" lang={en ? "en-US" : "pt-BR"}>
      <main className="application-body home-body">
        <div className="page-intro">
          <p className="eyebrow">{en ? "Personal area" : "Área pessoal"}</p>
          <h1>{name ? `${en ? "Hello" : "Olá"}, ${name}.` : en ? "Welcome." : "Boas-vindas."}</h1>
        </div>
        <div className="home-layout">
          <section aria-labelledby="home-registration-title">
            <p className="eyebrow">{en ? "Your tournament" : "Seu torneio"}</p>
            <h2 id="home-registration-title">{en ? "Registration" : "Inscrição"}</h2>
            <p className="muted">{en ? "Register for the tournament or follow your participation." : "Inscreva-se no torneio ou acompanhe sua participação."}</p>
            <article className="home-registration">
              <p className="eyebrow">Monomachia</p>
              <h3>{t("Inscrição Monomachia")}</h3>
              <a href="/tournaments/registration" className="screen-link">{t("Inscrição Monomachia")} <span aria-hidden="true">→</span></a>
            </article>
          </section>
          {admin && (
            <aside className="home-shortcuts">
              <p className="eyebrow">{en ? "Admin only" : "Somente admin"}</p>
              <h2>{en ? "Guild" : "Guilda"}</h2>
              <Link className="shortcut-link" to="/staff/tournaments" aria-label={en ? "Guild panel" : "Painel da Guilda"}>
                <span><strong>{en ? "Guild panel" : "Painel da Guilda"}</strong><small>{en ? "Tournaments, payments and users" : "Torneios, pagamentos e usuários"}</small></span><span aria-hidden="true">→</span>
              </Link>
            </aside>
          )}
        </div>
      </main>
      <ApplicationFooter />
    </div>
  );
}
