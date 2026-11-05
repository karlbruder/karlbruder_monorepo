import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { useLanguage } from "@/hooks/use-language";
import { deleteStaffTournament, StaffTournamentError, useStaffTournament, useStaffTournaments } from "@/features/tournament/api/staff-tournaments";
import { StaffTournamentForm } from "@/features/tournament/components/staff-tournament-form";

export function StaffTournamentListRoute() {
  const { session } = useAuthSession();
  const { language } = useLanguage();
  const [offset, setOffset] = useState(0);
  const query = useStaffTournaments(session!.access_token, session!.user.id, offset);
  const en = language === "en";
  return <section><h1>{en ? "Tournaments" : "Torneios"}</h1>
    <Link to="/staff/tournaments/new">{en ? "Create tournament" : "Criar torneio"}</Link>
    {query.isLoading && <p role="status">{en ? "Loading tournaments..." : "Carregando torneios..."}</p>}
    {query.isError && <p role="alert">{en ? "Could not load tournaments." : "Não foi possível carregar os torneios."} <button onClick={() => query.refetch()}>{en ? "Try again" : "Tentar novamente"}</button></p>}
    {query.data && <><ul>{query.data.items.map(event => <li key={event.id}><Link to={`/staff/tournaments/${event.id}`}>{event.name}</Link></li>)}</ul>
      {query.data.items.length === 0 && <p>{en ? "No tournaments found." : "Nenhum torneio encontrado."}</p>}
      <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 20))}>{en ? "Previous" : "Anterior"}</button>{" "}
      <button disabled={offset + 20 >= query.data.total} onClick={() => setOffset(offset + 20)}>{en ? "Next" : "Próxima"}</button></>}
  </section>;
}
export function StaffTournamentCreateRoute() {
  const { session } = useAuthSession();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const client = useQueryClient();
  return <section><h1>{language === "en" ? "Create tournament" : "Criar torneio"}</h1><StaffTournamentForm token={session!.access_token} language={language} onSaved={() => { client.invalidateQueries({ queryKey: ["staff-tournaments"] }); navigate("/staff/tournaments"); }} /></section>;
}
export function StaffTournamentDetailRoute() {
  const { tournamentId = "" } = useParams();
  const { session } = useAuthSession();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const client = useQueryClient();
  const query = useStaffTournament(session!.access_token, session!.user.id, tournamentId);
  const [deleting, setDeleting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const en = language === "en";
  async function remove() {
    if (deleting) return;
    setDeleting(true); setError("");
    try {
      await deleteStaffTournament(session!.access_token, tournamentId);
      await client.invalidateQueries({ queryKey: ["staff-tournaments"] });
      navigate("/staff/tournaments");
    } catch (caught) {
      setError(caught instanceof StaffTournamentError && caught.status === 409 ? (en ? "This tournament has registrations and cannot be deleted." : "Este torneio possui inscrições e não pode ser excluído.") : (en ? "Could not delete the tournament. Try again." : "Não foi possível excluir o torneio. Tente novamente."));
    } finally { setDeleting(false); }
  }
  return <section><Link to="/staff/tournaments">← {en ? "Tournaments" : "Torneios"}</Link>
    {query.isLoading && <p role="status">{en ? "Loading tournament..." : "Carregando torneio..."}</p>}
    {query.isError && <p role="alert">{en ? "Could not load this tournament." : "Não foi possível carregar este torneio."} <button onClick={() => query.refetch()}>{en ? "Try again" : "Tentar novamente"}</button></p>}
    {query.data && <><h1>{query.data.name}</h1><StaffTournamentForm key={query.data.id} token={session!.access_token} event={query.data} language={language} onSaved={() => { client.invalidateQueries({ queryKey: ["staff-tournaments"] }); client.invalidateQueries({ queryKey: ["staff-tournament", session!.user.id, tournamentId] }); navigate("/staff/tournaments"); }} />
      {!confirming ? <button onClick={() => setConfirming(true)}>{en ? "Delete tournament" : "Excluir torneio"}</button> : <div><p>{en ? "Delete this tournament? This cannot be undone." : "Excluir este torneio? Esta ação não pode ser desfeita."}</p><button disabled={deleting} onClick={remove}>{en ? "Confirm deletion" : "Confirmar exclusão"}</button>{" "}<button disabled={deleting} onClick={() => setConfirming(false)}>{en ? "Cancel" : "Cancelar"}</button></div>}
      {error && <p role="alert">{error}</p>}</>}
  </section>;
}
