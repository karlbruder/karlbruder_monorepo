import AppLanguageToggle from "@/components/app-language-toggle";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { accountRoutes } from "@/config/account-routes";

import { useMonomachiaTournament } from "@/features/tournament/api/use-monomachia-tournament";
import type { Tournament } from "@/features/tournament/api/tournaments";
import SignupForm from "@/features/tournament/components/signup-form";
import { registrationCopy } from "@/utils/registration-language";
import type { RegistrationCopyKey, RegistrationLanguage } from "@/utils/registration-language";
import "@/features/tournament/components/tournament-registration.css";

type Props = {
  session: Session | null;
  authReady: boolean;
  authError: RegistrationCopyKey | null;
  onSignOut: () => Promise<void>;
  signInButton: ReactNode;
  language?: RegistrationLanguage;
  onLanguageChange?: (language: RegistrationLanguage) => void;
};

const locale = (language: RegistrationLanguage) => language === "pt" ? "pt-BR" : "en-US";

function eventDate(value: string, language: RegistrationLanguage): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? registrationCopy(language, "A confirmar") : new Intl.DateTimeFormat(locale(language), { dateStyle: "long", timeZone: "Etc/GMT+3" }).format(date);
}

function calendarDate(value: string, language: RegistrationLanguage): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return registrationCopy(language, "A confirmar");
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? registrationCopy(language, "A confirmar") : new Intl.DateTimeFormat(locale(language), { dateStyle: "medium", timeZone: "UTC" }).format(date);
}

function registrationWindow(tournament: Tournament, language: RegistrationLanguage): string {
  const t = (key: Parameters<typeof registrationCopy>[1]) => registrationCopy(language, key);
  if (tournament.new_registrations_closed) return t("Novas inscrições encerradas pela organização.");
  if (!tournament.registration_opens_on || !tournament.registration_closes_on) {
    return t("Período de inscrição a confirmar.");
  }
  return `${t("De")} ${calendarDate(tournament.registration_opens_on, language)} ${t("a")} ${calendarDate(tournament.registration_closes_on, language)}, ${t("inclusive (GMT-3).")}`;
}

function fee(value: Tournament["inscription_fee_amount"], language: RegistrationLanguage): string {
  if (value === null) return registrationCopy(language, "A confirmar");
  const amount = Number(value);
  return Number.isFinite(amount) ? new Intl.NumberFormat(locale(language), { style: "currency", currency: "BRL" }).format(amount) : registrationCopy(language, "A confirmar");
}

export default function TournamentRegistration({
  session, authReady, authError, onSignOut, signInButton, language = "pt", onLanguageChange,
}: Props) {
  const t = (key: Parameters<typeof registrationCopy>[1]) => registrationCopy(language, key);
  const { data: tournament, error, isFetching: loading, refetch } = useMonomachiaTournament();
  const loadIssue = error
    ? error.message === "http-401" ? "unauthorized" : "request"
    : tournament === null ? "missing" : null;

  return (
    <div className="registration-page" lang={locale(language)}>
      <header className="registration-header">
        <a href="/" className="registration-brand">Karlbrüder</a>
        <AppLanguageToggle className="registration-languages" language={language} onLanguageChange={onLanguageChange} />
        {authReady && session && (
          <div className="registration-account">
            <span>{session.user.email}</span>
            <a href={accountRoutes.password}>{t("Alterar senha")}</a>
            <button type="button" onClick={onSignOut}>{t("Sair")}</button>
          </div>
        )}
      </header>
      <main className="registration-main">
        <a className="registration-back" href="/">← {t("Início")}</a>
        <div className="registration-intro">
          <p className="registration-eyebrow">Monomachia · Karlbrüder</p>
          <h1>{t("Inscrição pessoal")}</h1>
          <p>{t("Conheça as informações do torneio antes de se inscrever.")}</p>
        </div>

        {loading ? (
          <p className="registration-notice" role="status">{t("Carregando informações do torneio...")}</p>
        ) : loadIssue ? (
          <div>
            <p className="registration-notice" role="alert">
              {loadIssue === "missing"
                ? t("Este torneio não está disponível.")
                : loadIssue === "unauthorized"
                  ? t("O acesso aos dados do torneio foi recusado. Entre novamente.")
                  : t("Não foi possível carregar os dados do torneio. Tente novamente.")}
            </p>
            {loadIssue === "request" && (
              <button type="button" onClick={() => void refetch()}>{t("Tentar novamente")}</button>
            )}
          </div>
        ) : tournament && (
          <div className="registration-layout">
            <div className="registration-flow">
              {!authReady ? (
                <section className="registration-card" aria-labelledby="registration-next-title">
                  <h2 id="registration-next-title">{t("Sua inscrição")}</h2>
                  <p role="status">{t("Carregando sua sessão...")}</p>
                </section>
              ) : !session ? (
                <section className="registration-card" aria-labelledby="registration-next-title">
                  <h2 id="registration-next-title">{t("Sua inscrição")}</h2>
                  <p>{t("Entre com sua conta para se inscrever neste torneio.")}</p>
                  {signInButton}
                </section>
              ) : (
                <>
                  <p className="registration-signed-in">{t("Você está conectado como")} {session.user.email}.</p>
                  {tournament.new_registrations_closed ? (
                    <p className="registration-notice" role="status">{t("Novas inscrições estão encerradas pela organização.")}</p>
                  ) : !tournament.registration_opens_on || !tournament.registration_closes_on || !tournament.terms_version || !tournament.regulation_version ? (
                    <p className="registration-notice" role="status">{t("A inscrição aguarda a configuração do período e dos termos do torneio.")}</p>
                  ) : (
                    <SignupForm key={session.user.id} tournament={tournament} session={session} language={language} />
                  )}
                </>
              )}
              {authError && <p className="registration-auth-error" role="alert">{t(authError)}</p>}
            </div>

            <aside className="registration-summary">
              <section className="registration-card registration-next" aria-labelledby="event-name">
                <p className="registration-eyebrow">{t("Torneio")}</p>
                <h2 id="event-name">{tournament.name}</h2>
                <dl className="registration-facts">
                  <div><dt>{t("Data")}</dt><dd>{eventDate(tournament.starts_at, language)}</dd></div>
                  <div><dt>{t("Modalidade")}</dt><dd>{tournament.modality === "longsword" ? t("Espada longa (longsword)") : tournament.modality || t("A confirmar")}</dd></div>
                  <div><dt>{t("Local")}</dt><dd>{tournament.location || t("A confirmar")}</dd></div>
                  <div><dt>{t("Valor")}</dt><dd>{fee(tournament.inscription_fee_amount, language)}</dd></div>
                  <div><dt>{t("Inscrições")}</dt><dd>{registrationWindow(tournament, language)}</dd></div>
                </dl>
                <p className="registration-seat-note">{t("O envio da inscrição não confirma uma vaga. A equipe analisará o pagamento e a disponibilidade depois.")}</p>
              </section>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
