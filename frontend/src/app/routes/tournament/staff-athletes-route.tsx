import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { getAthletes } from "@/features/tournament/api/tournament-tags";
import { getOwnRegistration, getTournament } from "@/features/tournament/api/tournaments";
import { RegistrationEdit } from "@/features/tournament/components/registration-edit";
import "@/features/tournament/components/tournament-registration.css";
import { TagPills } from "@/features/tournament/components/tournament-tags";
import { useLanguage } from "@/hooks/use-language";

export function StaffAthletesRoute() {
  const { tournamentId = "", registrationNumber } = useParams();
  const { session } = useAuthSession();
  const { language } = useLanguage();
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const en = language === "en";
  const query = useQuery({ queryKey: ["staff-athletes", session!.user.id, tournamentId], queryFn: ({ signal }) => getAthletes(session!.access_token, tournamentId, signal), refetchOnMount: "always", enabled: !registrationNumber });
  const details = useQuery({
    queryKey: ["staff-registration", session!.user.id, tournamentId, registrationNumber],
    queryFn: ({ signal }) => getOwnRegistration(Number(tournamentId), registrationNumber!, session!.access_token, signal),
    enabled: !!registrationNumber,
  });
  const tournament = useQuery({
    queryKey: ["staff-registration-tournament", session!.user.id, tournamentId],
    queryFn: ({ signal }) => getTournament(Number(tournamentId), session!.access_token, signal),
    enabled: !!registrationNumber,
  });
  const matches = query.data?.filter(item => `${item.full_name} ${item.social_name ?? ""} ${item.registration_number}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  if (registrationNumber) return <section>
    {(details.isPending || tournament.isPending) && <p role="status">{en ? "Loading registration..." : "Carregando inscrição..."}</p>}
    {(details.isError || tournament.isError) && <p role="alert">{en ? "Could not load registration." : "Não foi possível carregar a inscrição."} <button type="button" onClick={() => { void details.refetch(); void tournament.refetch(); }}>{en ? "Try again" : "Tentar novamente"}</button></p>}
    {(details.isError || tournament.isError) && <button type="button" onClick={() => navigate(`/staff/tournaments/${tournamentId}/athletes`)}>{en ? "Back" : "Voltar"}</button>}
    {details.data && tournament.data && <RegistrationEdit staff registration={details.data} tournament={tournament.data} session={session!} language={language} onBack={() => navigate(`/staff/tournaments/${tournamentId}/athletes`)} onSaved={() => { void details.refetch(); void query.refetch(); }} />}
  </section>;
  return <section><Link to={registrationNumber ? `/staff/tournaments/${tournamentId}/athletes` : `/staff/tournaments/${tournamentId}`}>← {registrationNumber ? (en ? "Tournament athletes" : "Atletas do torneio") : (en ? "Tournament" : "Torneio")}</Link>
    <h1>{en ? "Tournament athletes" : "Atletas do torneio"}</h1>
    {query.isPending && <p role="status">{en ? "Loading athletes..." : "Carregando atletas..."}</p>}
    {query.isError && <p role="alert">{en ? "Could not load athletes." : "Não foi possível carregar os atletas."} <button type="button" onClick={() => void query.refetch()}>{en ? "Try again" : "Tentar novamente"}</button></p>}
    {!registrationNumber && query.data && <><p>{en ? "Find a registration to manage the athlete’s details and tags." : "Encontre uma inscrição para gerenciar os dados e as tags do atleta."}</p><label>{en ? "Search by name or registration number" : "Buscar por nome ou número da inscrição"}<input value={search} onChange={event => setSearch(event.target.value)} /></label>
      {matches?.length === 0 && <p>{query.data.length === 0 ? (en ? "No registrations yet." : "Nenhuma inscrição encontrada.") : (en ? "No athletes match your search." : "Nenhum atleta encontrado para esta busca.")}</p>}
      <ul className="tag-athletes">{matches?.map(item => <li key={item.registration_number}><strong>{item.social_name || item.full_name}</strong><p>{item.registration_number} · {item.registration_status}</p>{item.parental_consent_required && <p className="registration-notice" role="status">{en ? "Signed parental consent form missing. Verify before participation." : "Termo de responsabilidade assinado pendente. Verifique antes da participação."}</p>}<TagPills tags={item.tags} language={language} /><p><Link to={`/staff/tournaments/${encodeURIComponent(tournamentId)}/athletes/${encodeURIComponent(item.registration_number)}`}>{en ? "Manage registration" : "Gerenciar inscrição"}</Link></p></li>)}</ul></>}
  </section>;
}
