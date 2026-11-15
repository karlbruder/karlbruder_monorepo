import { ApplicationHeader } from "@/components/application-header";
import { ApplicationFooter } from "@/components/application-footer";
import { useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { accountRoutes } from "@/config/account-routes";

import { useRegistrationTournament } from "@/features/tournament/api/use-registration-tournament";
import { useOwnTournamentRegistrations } from "@/features/tournament/api/use-own-tournament-registrations";
import type { OwnerRegistration, RegistrationCreated, Tournament } from "@/features/tournament/api/tournaments";
import TournamentRegistrationPanel from "@/features/tournament/components/tournament-registration-panel";
import TournamentRegistrationForm from "@/features/tournament/components/tournament-registration-form";
import { appCopy } from "@/utils/app-copy";
import type { AppCopyKey, AppLanguage } from "@/utils/app-copy";
import "@/features/tournament/components/tournament-registration.css";

type Props = {
  tournamentId?: number;
  registrationNumber?: string;
  invalidLink?: boolean;
  session: Session | null;
  authReady: boolean;
  authError: AppCopyKey | null;
  onSignOut: () => Promise<void>;
  signInButton: ReactNode;
  language?: AppLanguage;
  onLanguageChange?: (language: AppLanguage) => void;
};

const locale = (language: AppLanguage) => language === "pt" ? "pt-BR" : "en-US";

function eventDate(value: string, language: AppLanguage): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? appCopy(language, "A confirmar") : new Intl.DateTimeFormat(locale(language), { dateStyle: "medium", timeStyle: "medium" }).format(date);
}

function registrationWindow(tournament: Tournament, language: AppLanguage): string {
  const t = (key: Parameters<typeof appCopy>[1]) => appCopy(language, key);
  if (tournament.is_registration_closed) return t("Novas inscrições encerradas pela organização.");
  if (!tournament.registration_opens_on || !tournament.registration_closes_on) {
    return t("Período de inscrição a confirmar.");
  }
  return `${t("De")} ${eventDate(`${tournament.registration_opens_on}T00:00:00-03:00`, language)} ${t("a")} ${eventDate(`${tournament.registration_closes_on}T23:59:59-03:00`, language)}`;
}

function selectOwnActiveRegistration(registrations: OwnerRegistration[] | undefined, accountId: string): OwnerRegistration | null {
  const activeRegistrations = (registrations ?? []).filter((registration) => registration.registration_status !== "cancelled");
  if (activeRegistrations.some((registration) => registration.user_id !== undefined)) {
    return activeRegistrations.find((registration) => registration.user_id === accountId) ?? null;
  }
  return activeRegistrations[0] ?? null;
}

function SignedInRegistration({
  session,
  tournament,
  language,
  registrationNumber,
}: {
  session: Session;
  tournament: Tournament;
  language: AppLanguage;
  registrationNumber?: string;
}) {
  const t = (key: Parameters<typeof appCopy>[1]) => appCopy(language, key);
  const ownRegistrationsQuery = useOwnTournamentRegistrations(registrationNumber ? undefined : tournament.id, session.access_token, session.user.id);
  const [createdRegistration, setCreatedRegistration] = useState<RegistrationCreated | null>(null);
  const [cancelledNumber, setCancelledNumber] = useState<string>();
  const activeRegistration = createdRegistration ?? selectOwnActiveRegistration(ownRegistrationsQuery.data, session.user.id);
  const cancelledRegistrations = ownRegistrationsQuery.data?.filter(registration =>
    registration.registration_status === "cancelled" && (
      session.user.app_metadata?.karlbruder_role === "admin"
        ? registration.user_id === session.user.id
        : !registration.user_id || registration.user_id === session.user.id
    ),
  );

  const selectedRegistrationNumber = registrationNumber ?? cancelledNumber ?? activeRegistration?.registration_number;
  const personalRegistrationUrl = `/tournaments/registration?tournament_id=${tournament.id}`;

  const handleRegistrationCreated = (registration: RegistrationCreated) => {
    setCreatedRegistration(registration);
    void ownRegistrationsQuery.refetch();
  };

  return (
    <>
      <p className="registration-signed-in">{t("Você está conectado como")} {session.user.email}.</p>
      {!selectedRegistrationNumber && ownRegistrationsQuery.isPending ? (
        <p className="registration-notice" role="status">{t("Carregando informações do torneio...")}</p>
      ) : !selectedRegistrationNumber && ownRegistrationsQuery.isError ? (
        <div><p role="alert">{t("Não foi possível carregar sua inscrição.")}</p><button onClick={() => void ownRegistrationsQuery.refetch()}>{t("Tentar novamente")}</button></div>
      ) : selectedRegistrationNumber ? (
        <TournamentRegistrationPanel
          tournament={tournament}
          session={session}
          key={selectedRegistrationNumber}
          registrationNumber={selectedRegistrationNumber}
          language={language}
          onCancelled={() => setCancelledNumber(selectedRegistrationNumber)}
        />
      ) : tournament.is_registration_closed ? (
        <p className="registration-notice" role="status">{t("Novas inscrições estão encerradas pela organização.")}</p>
      ) : !tournament.registration_opens_on || !tournament.registration_closes_on ? (
        <p className="registration-notice" role="status">{t("A inscrição aguarda a configuração do período e dos termos do torneio.")}</p>
      ) : (
        <TournamentRegistrationForm
          tournament={tournament}
          session={session}
          language={language}
          onRegistrationCreated={handleRegistrationCreated}
        />
      )}
      {(registrationNumber || cancelledNumber) && <p><a href={personalRegistrationUrl}>{t("Voltar à inscrição pessoal")}</a></p>}
      {!registrationNumber && !cancelledNumber && Boolean(cancelledRegistrations?.length) && (
        <section className="registration-card">
          <h2>{t("Inscrições canceladas")}</h2>
          <ul>{cancelledRegistrations?.map(({ registration_number: number }) => (
            <li key={number}><a href={`${personalRegistrationUrl}&registration_number=${encodeURIComponent(number)}`}>{number}</a></li>
          ))}</ul>
        </section>
      )}
    </>
  );
}

export default function TournamentRegistration({
  session, authReady, authError, onSignOut, signInButton, language = "pt", onLanguageChange, tournamentId, registrationNumber, invalidLink = false,
}: Props) {
  const t = (key: Parameters<typeof appCopy>[1]) => appCopy(language, key);
  const { data: tournament, error, isFetching: loading, refetch } = useRegistrationTournament(tournamentId, session, !invalidLink && (!registrationNumber || Boolean(authReady && session)));

  const loadIssue = error
    ? error.message === "http-401" ? "unauthorized" : error.message === "http-404" ? "missing" : "request"
    : tournament === null ? "missing" : null;

  return (
    <div className="registration-page" lang={locale(language)}>
      <ApplicationHeader language={language} onLanguageChange={onLanguageChange}>
        {authReady && session && (
          <div className="registration-account">
            <span>{session.user.email}</span>
            <a href={accountRoutes.password}>{t("Alterar senha")}</a>
            <button type="button" onClick={onSignOut}>{t("Sair")}</button>
          </div>
        )}
      </ApplicationHeader>
      <main className="registration-main">
        <a className="registration-back" href="/">← {t("Início do torneio")}</a>
        <div className="registration-intro">
          <p className="registration-eyebrow">{tournamentId ? tournament?.name ?? "Karlbrüder" : "Monomachia · Karlbrüder"}</p>
          <h1>{t("Inscrição pessoal")}</h1>
          <p>{t(registrationNumber ? "Acompanhe o pagamento e a situação da sua inscrição." : "Conheça as informações do torneio antes de se inscrever.")}</p>
        </div>

        {invalidLink ? (
          <p className="registration-notice" role="alert">{t("Este link de inscrição não é válido.")}</p>
        ) : registrationNumber && !authReady ? (
          <p role="status">{t("Carregando sua sessão...")}</p>
        ) : registrationNumber && !session ? (
          <section className="registration-card"><h2>{t("Sua inscrição")}</h2><p>{t("Entre com sua conta para consultar esta inscrição.")}</p>{signInButton}</section>
        ) : loading ? (
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
                <SignedInRegistration key={`${session.user.id}:${tournament.id}:${registrationNumber ?? ""}`} session={session} tournament={tournament} language={language} registrationNumber={registrationNumber} />
              )}
              {authError && <p className="registration-auth-error" role="alert">{t(authError)}</p>}
            </div>

            <aside className="registration-summary">
              <section className="registration-card registration-next" aria-labelledby="event-name">
                <p className="registration-eyebrow">{t("Torneio")}</p>
                <h2 id="event-name">{tournament.name}</h2>
                <p>{t("Datas e horários no fuso do seu navegador.")}</p>
                <dl className="registration-facts">
                  <div><dt>{t("Início do torneio")}</dt><dd>{eventDate(tournament.starts_at, language)}</dd></div>
                  {tournament.ends_at && <div><dt>{t("Término do torneio")}</dt><dd>{eventDate(tournament.ends_at, language)}</dd></div>}
                  <div><dt>{t("Modalidade")}</dt><dd>{tournament.discipline === "longsword" ? t("Espada longa (longsword)") : tournament.discipline || t("A confirmar")}</dd></div>
                  <div><dt>{t("Local")}</dt><dd>{tournament.location || t("A confirmar")}</dd></div>
                  <div><dt>{t("Inscrições")}</dt><dd>{registrationWindow(tournament, language)}</dd></div>
                </dl>
                {!session && !registrationNumber && <p className="registration-seat-note">{t("O envio da inscrição não confirma uma vaga. A equipe analisará o pagamento e a disponibilidade depois.")}</p>}
              </section>
            </aside>
          </div>
        )}
      </main>
      <ApplicationFooter language={language} />
    </div>
  );
}
