import { currentSessionGeneration } from "@/lib/session-generation";
import { useEffect, useId, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { useLanguage } from "@/hooks/use-language";
import { deleteStaffTournament, StaffTournamentError, useStaffTournament, useStaffTournaments } from "@/features/tournament/api/staff-tournaments";
import { StaffTournamentForm } from "@/features/tournament/components/staff-tournament-form";
import { TournamentProducts } from "@/features/tournament/components/tournament-products";
import { StaffTournamentDocuments } from "@/features/tournament/components/staff-tournament-documents";
import { StaffTagConfiguration } from "@/features/tournament/components/tournament-tags";

function useActiveVisit() {
  const { key } = useLocation();
  const activeKey = useRef<string | null>(null);
  useEffect(() => {
    activeKey.current = key;
    return () => { activeKey.current = null; };
  }, [key]);
  return () => activeKey.current === key;
}

export function StaffTournamentListRoute() {
  const { session } = useAuthSession();
  const { language } = useLanguage();
  const [offset, setOffset] = useState(0);
  const query = useStaffTournaments(session!.user.id, offset);
  const en = language === "en";
  return <section className="staff-tournaments">
    <div className="staff-page-heading"><h1>{en ? "Tournaments" : "Torneios"}</h1>
    <Link className="staff-primary-button" to="/staff/tournaments/new">{en ? "Create tournament" : "Criar torneio"}</Link></div>
    {query.isLoading && <p role="status">{en ? "Loading tournaments..." : "Carregando torneios..."}</p>}
    {query.isError && <p role="alert">{en ? "Could not load tournaments." : "Não foi possível carregar os torneios."} <button onClick={() => query.refetch()}>{en ? "Try again" : "Tentar novamente"}</button></p>}
    {query.data && <><ul className="staff-tournament-list">{query.data.items.map(event => <li key={event.id}><Link to={`/staff/tournaments/${event.id}`}><strong>{event.name}</strong><span aria-hidden="true">→</span></Link></li>)}</ul>
      {query.data.items.length === 0 && <div className="operational-empty"><p>{en ? "No tournaments found." : "Nenhum torneio encontrado."}</p></div>}
      <div className="staff-pagination"><button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 20))}>{en ? "Previous" : "Anterior"}</button>{" "}
      <button disabled={offset + 20 >= query.data.total} onClick={() => setOffset(offset + 20)}>{en ? "Next" : "Próxima"}</button></div></>}
  </section>;
}
export function StaffTournamentCreateRoute() {
  const { session } = useAuthSession();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const client = useQueryClient();
  const isActiveVisit = useActiveVisit();
  const en = language === "en";
  return <section>
    <h1>{en ? "Create tournament" : "Criar torneio"}</h1>
    <StaffTournamentForm userId={session!.user.id} language={language} onSaved={(saved) => {
      void client.invalidateQueries({ queryKey: ["staff-tournaments"] });
      if (isActiveVisit()) navigate(`/staff/tournaments/${saved.id}`);
    }} />
    <section className="review-card staff-tournament-documents">
      <h2>{en ? "Tournament documents" : "Documentos do torneio"}</h2>
      <p>{en ? "Save the tournament to upload its documents." : "Salve o torneio para enviar os documentos."}</p>
    </section>
  </section>;
}
export function StaffTournamentDetailRoute() {
  const { tournamentId = "" } = useParams();
  const { session } = useAuthSession();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const client = useQueryClient();
  const isActiveVisit = useActiveVisit();
  const visitId = useId();
  const query = useStaffTournament(session!.user.id, tournamentId, visitId);
  const missing = query.error instanceof StaffTournamentError && query.error.status === 404;
  const [deleting, setDeleting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const en = language === "en";
  async function remove() {
    if (deleting) return;
    const generation = currentSessionGeneration();
    setDeleting(true); setError("");
    try {
      await deleteStaffTournament(session!.user.id, tournamentId);
      if (generation !== currentSessionGeneration()) return;
      client.invalidateQueries({ queryKey: ["staff-tournament", session!.user.id, tournamentId], refetchType: "none" });
      await client.invalidateQueries({ queryKey: ["staff-tournaments"] });
      if (generation === currentSessionGeneration() && isActiveVisit()) navigate("/staff/tournaments");
    } catch (caught) {
      if (generation !== currentSessionGeneration()) return;
      setError(caught instanceof StaffTournamentError && caught.status === 409 ? (en ? "This tournament has registrations and cannot be deleted." : "Este torneio possui inscrições e não pode ser excluído.") : (en ? "Could not delete the tournament. Try again." : "Não foi possível excluir o torneio. Tente novamente."));
    } finally { setDeleting(false); }
  }
  return <section><Link to="/staff/tournaments">← {en ? "Tournaments" : "Torneios"}</Link>
    {query.isLoading && <p role="status">{en ? "Loading tournament..." : "Carregando torneio..."}</p>}
    {query.isError && <p role="alert">{en ? "Could not load this tournament." : "Não foi possível carregar este torneio."} <button onClick={() => query.refetch()}>{en ? "Try again" : "Tentar novamente"}</button></p>}
    {query.data && !missing && <><h1>{query.data.name}</h1><p><Link to={`/staff/tournaments/${tournamentId}/athletes`}>{en ? "Manage athletes" : "Gerenciar atletas"}</Link>{" · "}<Link to={`/staff/tournaments/${tournamentId}/waitlist`}>{en ? "Waitlist" : "Lista de espera"}</Link>{" · "}<Link to="/staff/payment-reviews">{en ? "Payment review" : "Conferência de pagamentos"}</Link></p><StaffTournamentForm key={query.data.id} userId={session!.user.id} event={query.data} language={language} onSaved={() => { client.invalidateQueries({ queryKey: ["staff-tournaments"] }); client.invalidateQueries({ queryKey: ["staff-tournament", session!.user.id, tournamentId], refetchType: "none" }); if (isActiveVisit()) navigate("/staff/tournaments"); }} />
      <TournamentProducts userId={session!.user.id} tournamentId={tournamentId} language={language} />
      <StaffTagConfiguration userId={session!.user.id} tournamentId={tournamentId} language={language} />
      <StaffTournamentDocuments key={`policies-${query.data.id}`} userId={session!.user.id} tournamentId={query.data.id} language={language} />
      <div className="review-card staff-delete-panel">
      {!confirming ? <button className="staff-danger-button" onClick={() => setConfirming(true)}>{en ? "Delete tournament" : "Excluir torneio"}</button> : <div><p>{en ? "Delete this tournament? This cannot be undone." : "Excluir este torneio? Esta ação não pode ser desfeita."}</p><button className="staff-danger-button" disabled={deleting} onClick={remove}>{en ? "Confirm deletion" : "Confirmar exclusão"}</button>{" "}<button disabled={deleting} onClick={() => setConfirming(false)}>{en ? "Cancel" : "Cancelar"}</button></div>}
      </div>
      {error && <p role="alert">{error}</p>}</>}
  </section>;
}
