import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { confirmWaitlist, getWaitlist, WaitlistError } from "@/features/tournament/api/waitlist";
import { cancelRegistration, getRegistrationRefund } from "@/features/tournament/api/registration-refunds";
import { TagPills } from "@/features/tournament/components/tournament-tags";
import "@/features/tournament/components/tournament-registration.css";
import "@/features/tournament/components/waitlist.css";

type Props = { token: string; userId: string; tournamentId: string; language: "pt" | "en" };
type Action = { number: string; name: string; type: "confirm" | "cancel" };

export function Waitlist({ token, userId, tournamentId, language }: Props) {
  const en = language === "en";
  const query = useQuery({ queryKey: ["waitlist", userId, tournamentId], queryFn: ({ signal }) => getWaitlist(token, tournamentId, signal), refetchOnMount: "always" });
  const [action, setAction] = useState<Action | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ message: string; refund?: boolean } | null>(null);
  const remaining = query.data?.competitor_capacity == null ? null : Math.max(0, query.data.competitor_capacity - query.data.confirmed_count);

  async function submit() {
    if (!action || pending) return;
    setPending(true); setError(""); setResult(null);
    try {
      if (action.type === "confirm") {
        await confirmWaitlist(token, tournamentId, action.number);
        setResult({ message: en ? `${action.name}: participation confirmed.` : `${action.name}: participação confirmada.` });
      } else {
        await cancelRegistration(token, Number(tournamentId), action.number);
        try {
          const refund = await getRegistrationRefund(token, Number(tournamentId), action.number);
          setResult(refund?.refund_status === "awaiting_refund"
            ? { message: en ? `${action.name}: registration cancelled. A refund is awaiting processing.` : `${action.name}: inscrição cancelada. Há um reembolso aguardando processamento.`, refund: true }
            : { message: en ? `${action.name}: registration cancelled without an awaiting refund.` : `${action.name}: inscrição cancelada sem reembolso pendente.` });
        } catch {
          setResult({ message: en ? `${action.name}: registration cancelled. Could not check the refund; check the refund queue.` : `${action.name}: inscrição cancelada. Não foi possível consultar o reembolso; verifique a fila de reembolsos.`, refund: true });
        }
      }
      setAction(null);
      await query.refetch();
    } catch (caught) {
      setError(action.type === "confirm" && caught instanceof WaitlistError && caught.status === 422
        ? (en ? "The signed parental consent form is required before confirmation." : "O termo de responsabilidade assinado é necessário antes da confirmação.")
        : action.type === "confirm" && caught instanceof WaitlistError && caught.status === 409
          ? (en ? "No seat is available or this registration is no longer waitlisted. Refresh and try again." : "Não há vaga disponível ou esta inscrição não está mais na lista de espera. Atualize e tente novamente.")
          : (en ? "Could not save the change. Refresh and try again." : "Não foi possível salvar a alteração. Atualize e tente novamente."));
    } finally { setPending(false); }
  }

  return <section aria-labelledby="waitlist-title">
    <Link to={`/staff/tournaments/${tournamentId}`}>← {en ? "Tournament" : "Torneio"}</Link>
    <h1 id="waitlist-title">{en ? "Participants on the waitlist" : "Participantes em espera"}</h1>
    <p className="muted">{en ? "Payments are already approved. Selection is a staff decision." : "Pagamentos já aprovados. A seleção é uma decisão da equipe."}</p>
    {query.isPending && <p role="status">{en ? "Loading waitlist..." : "Carregando lista de espera..."}</p>}
    {query.isError && !query.data && <p role="alert">{en ? "Could not load the waitlist." : "Não foi possível carregar a lista de espera."} <button onClick={() => void query.refetch()}>{en ? "Try again" : "Tentar novamente"}</button></p>}
    {query.data && <>
      <div className="waitlist-facts">
        <div><strong>{query.data.confirmed_count}{query.data.competitor_capacity !== null && ` / ${query.data.competitor_capacity}`}</strong><span>{en ? "Confirmed participants" : "Participantes confirmados"}</span></div>
        <div><strong>{query.data.registrations.length}</strong><span>{en ? "Participants waiting" : "Participantes em espera"}</span></div>
        <div><strong>{remaining === null ? (en ? "Unlimited" : "Ilimitada") : remaining}</strong><span>{en ? "Available seats" : "Vagas disponíveis"}</span></div>
      </div>
      <div className="registration-notice"><strong>{en ? "No automatic promotion" : "Nenhuma promoção automática"}</strong><p>{en ? "A free seat does not change a registration. Staff explicitly selects whom to confirm." : "O surgimento de uma vaga não muda nenhuma inscrição. A equipe seleciona explicitamente quem confirmar."}</p></div>
      <button type="button" onClick={() => void query.refetch()} disabled={query.isFetching}>{en ? "Refresh" : "Atualizar"}</button>
      {result && <p role="status" className="registration-notice registration-notice-success">{result.message} {result.refund && <Link to="/staff/refunds">{en ? "Open refund queue" : "Abrir fila de reembolsos"}</Link>}</p>}
      {query.isError && <p role="alert">{en ? "Could not refresh the waitlist." : "Não foi possível atualizar a lista de espera."}</p>}
      {query.data.registrations.length === 0 ? <div className="operational-empty"><p>{en ? "No paid registrations are waiting." : "Nenhuma inscrição paga está em espera."}</p></div> : <div className="review-table-scroll" role="region" aria-labelledby="waitlist-title" tabIndex={0}>
        <table className="review-table waitlist-table"><thead><tr><th scope="col">{en ? "Participant" : "Participante"}</th><th scope="col">{en ? "Registration" : "Inscrição"}</th><th scope="col">Tags</th><th scope="col">{en ? "Payment" : "Pagamento"}</th><th scope="col">{en ? "Actions" : "Ações"}</th></tr></thead><tbody>
          {query.data.registrations.map(item => <tr key={item.registration_number}><th scope="row">{item.social_name || item.full_name}</th><td>{item.registration_number}{item.parental_consent_required && <p>{en ? "Parental consent form required" : "Termo de responsabilidade pendente"}</p>}</td><td><TagPills tags={item.tags} language={language} /></td><td>{en ? "Approved" : "Aprovado"}</td><td><div className="waitlist-actions"><button type="button" disabled={remaining === 0 || pending} onClick={() => { setError(""); setAction({ number: item.registration_number, name: item.social_name || item.full_name, type: "confirm" }); }}>{en ? "Confirm participation" : "Confirmar participação"}</button><button type="button" disabled={pending} onClick={() => { setError(""); setAction({ number: item.registration_number, name: item.social_name || item.full_name, type: "cancel" }); }}>{en ? "Cancel registration" : "Cancelar inscrição"}</button></div></td></tr>)}
        </tbody></table></div>}
      <p className="muted">{en ? "Table order does not indicate priority. Confirmation checks eligibility and capacity when saved." : "A ordem da tabela não representa prioridade. A confirmação verifica elegibilidade e capacidade ao salvar."}</p>
      {action && <div className="review-card" aria-labelledby="waitlist-action-title"><h2 id="waitlist-action-title">{action.type === "confirm" ? (en ? "Confirm participation?" : "Confirmar participação?") : (en ? "Cancel registration?" : "Cancelar inscrição?")}</h2><p>{action.name} · {action.number}</p><p>{action.type === "confirm" ? (en ? "Payment is already approved. Eligibility and an available seat are checked when you confirm." : "O pagamento já foi aprovado. A elegibilidade e a vaga serão verificadas ao confirmar.") : (en ? "Cancellation ends participation. A verified payment may create a refund obligation according to tournament rules." : "O cancelamento encerra a participação. Um pagamento verificado pode gerar uma obrigação de reembolso conforme as regras do torneio.")}</p>{error && <p role="alert">{error}</p>}<button type="button" disabled={pending} onClick={() => void submit()}>{action.type === "confirm" ? (en ? "Confirm participation" : "Confirmar participação") : (en ? "Confirm cancellation" : "Confirmar cancelamento")}</button>{" "}<button type="button" disabled={pending} onClick={() => { setAction(null); setError(""); }}>{en ? "Go back" : "Voltar"}</button>{error && <> {" "}<button type="button" onClick={() => void query.refetch()}>{en ? "Refresh" : "Atualizar"}</button></>}</div>}
    </>}
  </section>;
}
