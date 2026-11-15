import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { getAthletes } from "@/features/tournament/api/tournament-tags";
import { RegistrationTags, TagPills } from "@/features/tournament/components/tournament-tags";
import { useLanguage } from "@/hooks/use-language";

export function StaffAthletesRoute() {
  const { tournamentId = "", registrationNumber } = useParams();
  const { session } = useAuthSession();
  const { language } = useLanguage();
  const [search, setSearch] = useState("");
  const en = language === "en";
  const query = useQuery({ queryKey: ["staff-athletes", session!.user.id, tournamentId], queryFn: ({ signal }) => getAthletes(session!.access_token, tournamentId, signal), refetchOnMount: "always" });
  const athlete = query.data?.find(item => item.registration_number === registrationNumber);
  const matches = query.data?.filter(item => `${item.full_name} ${item.social_name ?? ""} ${item.registration_number}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  return <section><Link to={registrationNumber ? `/staff/tournaments/${tournamentId}/athletes` : `/staff/tournaments/${tournamentId}`}>← {registrationNumber ? (en ? "Tournament athletes" : "Atletas do torneio") : (en ? "Tournament" : "Torneio")}</Link>
    <h1>{registrationNumber ? (en ? "Manage tags" : "Conferir tags") : (en ? "Tournament athletes" : "Atletas do torneio")}</h1>
    {query.isPending && <p role="status">{en ? "Loading athletes..." : "Carregando atletas..."}</p>}
    {query.isError && <p role="alert">{en ? "Could not load athletes." : "Não foi possível carregar os atletas."} <button type="button" onClick={() => void query.refetch()}>{en ? "Try again" : "Tentar novamente"}</button></p>}
    {registrationNumber && query.data && !athlete && <p role="alert">{en ? "Registration not found." : "Inscrição não encontrada."}</p>}
    {registrationNumber && athlete && <><p>{athlete.social_name || athlete.full_name} · {athlete.registration_number}</p><RegistrationTags token={session!.access_token} userId={session!.user.id} tournamentId={tournamentId} number={registrationNumber} language={language} staff /></>}
    {!registrationNumber && query.data && <><p>{en ? "Find a registration to review and change the athlete’s tags." : "Encontre uma inscrição para conferir e alterar as tags do atleta."}</p><label>{en ? "Search by name or registration number" : "Buscar por nome ou número da inscrição"}<input value={search} onChange={event => setSearch(event.target.value)} /></label>
      {matches?.length === 0 && <p>{query.data.length === 0 ? (en ? "No registrations yet." : "Nenhuma inscrição encontrada.") : (en ? "No athletes match your search." : "Nenhum atleta encontrado para esta busca.")}</p>}
      <ul className="tag-athletes">{matches?.map(item => <li key={item.registration_number}><strong>{item.social_name || item.full_name}</strong><p>{item.registration_number} · {item.registration_status}</p><TagPills tags={item.tags} language={language} /><p><Link to={`/staff/tournaments/${encodeURIComponent(tournamentId)}/athletes/${encodeURIComponent(item.registration_number)}`}>{en ? "Manage tags" : "Gerenciar tags"}</Link></p></li>)}</ul></>}
  </section>;
}
