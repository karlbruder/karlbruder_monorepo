import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { getTournamentBySlug, MONOMACHIA_SLUG } from "../lib/tournaments";
import type { Tournament } from "../lib/tournaments";
import SignupForm from "./SignupForm";
import "./TournamentRegistration.css";

type Props = {
  session: Session | null;
  authReady: boolean;
  authError: string | null;
  onSignOut: () => Promise<void>;
  signInButton: ReactNode;
};

const eventDateFormat = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "long",
  timeZone: "Etc/GMT+3",
});
const calendarDateFormat = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "medium",
  timeZone: "UTC",
});
const feeFormat = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function eventDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "A confirmar" : eventDateFormat.format(date);
}

function calendarDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "A confirmar";
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? "A confirmar" : calendarDateFormat.format(date);
}

function registrationWindow(tournament: Tournament): string {
  if (tournament.new_registrations_closed) return "Novas inscrições encerradas pela organização.";
  if (!tournament.registration_opens_on || !tournament.registration_closes_on) {
    return "Período de inscrição a confirmar.";
  }
  return `De ${calendarDate(tournament.registration_opens_on)} a ${calendarDate(tournament.registration_closes_on)}, inclusive (GMT-3).`;
}

function fee(value: Tournament["inscription_fee_amount"]): string {
  if (value === null) return "A confirmar";
  const amount = Number(value);
  return Number.isFinite(amount) ? feeFormat.format(amount) : "A confirmar";
}

export default function TournamentRegistration({
  session, authReady, authError, onSignOut, signInButton,
}: Props) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadIssue, setLoadIssue] = useState<"missing" | "unauthorized" | "request" | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    getTournamentBySlug(MONOMACHIA_SLUG, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      if (result) setTournament(result);
      else setLoadIssue("missing");
      setLoading(false);
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      const reason = error instanceof Error ? error.message : "";
      setLoadIssue(reason === "http-401" ? "unauthorized" : "request");
      setLoading(false);
    });
    return () => controller.abort();
  }, [retryCount]);

  const retryLoad = () => {
    setTournament(null);
    setLoadIssue(null);
    setLoading(true);
    setRetryCount((count) => count + 1);
  };

  return (
    <div className="registration-page">
      <header className="registration-header">
        <a href="/" className="registration-brand">Karlbrüder</a>
        {authReady && session && (
          <div className="registration-account">
            <span>{session.user.email}</span>
            <button type="button" onClick={onSignOut}>Sair</button>
          </div>
        )}
      </header>
      <main className="registration-main">
        <a className="registration-back" href="/">← Início</a>
        <div className="registration-intro">
          <p className="registration-eyebrow">Monomachia · Karlbrüder</p>
          <h1>Inscrição pessoal</h1>
          <p>Conheça as informações do torneio antes de se inscrever.</p>
        </div>

        {loading ? (
          <p className="registration-notice" role="status">Carregando informações do torneio...</p>
        ) : loadIssue ? (
          <div>
            <p className="registration-notice" role="alert">
              {loadIssue === "missing"
                ? "Este torneio não está disponível."
                : loadIssue === "unauthorized"
                  ? "O acesso aos dados do torneio foi recusado. Entre novamente."
                  : "Não foi possível carregar os dados do torneio. Tente novamente."}
            </p>
            {loadIssue === "request" && (
              <button type="button" onClick={retryLoad}>Tentar novamente</button>
            )}
          </div>
        ) : tournament && (
          <div className="registration-layout">
            <div className="registration-flow">
              {!authReady ? (
                <section className="registration-card" aria-labelledby="registration-next-title">
                  <h2 id="registration-next-title">Sua inscrição</h2>
                  <p role="status">Carregando sua sessão...</p>
                </section>
              ) : !session ? (
                <section className="registration-card" aria-labelledby="registration-next-title">
                  <h2 id="registration-next-title">Sua inscrição</h2>
                  <p>Entre com sua conta para se inscrever neste torneio.</p>
                  {signInButton}
                </section>
              ) : (
                <>
                  <p className="registration-signed-in">Você está conectado como {session.user.email}.</p>
                  {tournament.new_registrations_closed ? (
                    <p className="registration-notice" role="status">Novas inscrições estão encerradas pela organização.</p>
                  ) : !tournament.registration_opens_on || !tournament.registration_closes_on || !tournament.terms_version || !tournament.regulation_version ? (
                    <p className="registration-notice" role="status">A inscrição aguarda a configuração do período e dos termos do torneio.</p>
                  ) : (
                    <SignupForm key={session.user.id} tournament={tournament} session={session} />
                  )}
                </>
              )}
              {authError && <p className="registration-auth-error" role="alert">{authError}</p>}
            </div>

            <aside className="registration-summary">
              <section className="registration-card registration-next" aria-labelledby="event-name">
                <p className="registration-eyebrow">Torneio</p>
                <h2 id="event-name">{tournament.name}</h2>
                <dl className="registration-facts">
                  <div><dt>Data</dt><dd>{eventDate(tournament.starts_at)}</dd></div>
                  <div><dt>Modalidade</dt><dd>{tournament.modality === "longsword" ? "Espada longa (longsword)" : tournament.modality || "A confirmar"}</dd></div>
                  <div><dt>Local</dt><dd>{tournament.location || "A confirmar"}</dd></div>
                  <div><dt>Valor</dt><dd>{fee(tournament.inscription_fee_amount)}</dd></div>
                  <div><dt>Inscrições</dt><dd>{registrationWindow(tournament)}</dd></div>
                </dl>
                <p className="registration-seat-note">O envio da inscrição não confirma uma vaga. A equipe analisará o pagamento e a disponibilidade depois.</p>
              </section>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
