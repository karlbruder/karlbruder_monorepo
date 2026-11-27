import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { getOwnRegistration, getTournament, getStaffRegistrationTotals, listStaffRegistrations } from "@/features/tournament/api/tournaments";
import { RegistrationStatus } from "@/features/tournament/components/registration-status";
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
  const query = useQuery({ queryKey: ["staff-registrations", session!.user.id, tournamentId], queryFn: ({ signal }) => listStaffRegistrations(session!.user.id, tournamentId, signal), refetchOnMount: "always", enabled: !registrationNumber });
  const totals = useQuery({ queryKey: ["staff-registration-totals", session!.user.id, tournamentId], queryFn: ({ signal }) => getStaffRegistrationTotals(session!.user.id, tournamentId, signal), refetchOnMount: "always", enabled: !registrationNumber });
  const details = useQuery({
    queryKey: ["staff-registration", session!.user.id, tournamentId, registrationNumber],
    queryFn: ({ signal }) => getOwnRegistration(Number(tournamentId), registrationNumber!, session!.user.id, signal),
    enabled: !!registrationNumber,
  });
  const tournament = useQuery({
    queryKey: ["staff-registration-tournament", session!.user.id, tournamentId],
    queryFn: ({ signal }) => getTournament(Number(tournamentId), session!.user.id, signal),
    enabled: !!registrationNumber,
  });
  const matches = query.data?.filter(item => `${item.full_name} ${item.social_name ?? ""} ${item.registration_number}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  if (registrationNumber) return <section>
    {(details.isPending || tournament.isPending) && <p role="status">{en ? "Loading registration..." : "Carregando inscrição..."}</p>}
    {(details.isError || tournament.isError) && <p role="alert">{en ? "Could not load registration." : "Não foi possível carregar a inscrição."} <button type="button" onClick={() => { void details.refetch(); void tournament.refetch(); }}>{en ? "Try again" : "Tentar novamente"}</button></p>}
    {(details.isError || tournament.isError) && <button type="button" onClick={() => navigate(`/staff/tournaments/${tournamentId}/athletes`)}>{en ? "Back" : "Voltar"}</button>}
    {details.data && tournament.data && <RegistrationEdit staff registration={details.data} tournament={tournament.data} user={session!.user} language={language} onBack={() => navigate(`/staff/tournaments/${tournamentId}/athletes`)} onSaved={() => { void details.refetch(); void query.refetch(); }} />}
  </section>;
  const title = en ? "Tournament athletes" : "Atletas do torneio";
  return (
    <section aria-labelledby="tournament-athletes-title">
      <Link to={`/staff/tournaments/${tournamentId}`}>← {en ? "Tournament" : "Torneio"}</Link>
      <h1 id="tournament-athletes-title">{title}</h1>
      {totals.isPending && <p role="status">{en ? "Loading tournament totals..." : "Carregando totais do torneio..."}</p>}
      {totals.isError && <p role="alert">{en ? "Could not load tournament totals." : "Não foi possível carregar os totais do torneio."} <button type="button" onClick={() => void totals.refetch()}>{en ? "Try again" : "Tentar novamente"}</button></p>}
      {totals.data && <div className="review-card"><p><strong>{en ? "Total registrations" : "Inscrições totais"}: {totals.data.total}</strong> · {en ? "Confirmed" : "Confirmadas"}: {totals.data.confirmed_count} · {en ? "Capacity" : "Capacidade"}: {totals.data.competitor_capacity ?? (en ? "Unlimited" : "Ilimitada")}</p><p className="muted">{en ? "Totals include cancellations. Only confirmed registrations occupy seats." : "O total inclui cancelamentos. Somente inscrições confirmadas ocupam vagas."}</p></div>}
      {query.isPending && <p role="status">{en ? "Loading athletes..." : "Carregando atletas..."}</p>}
      {query.isError && <p role="alert">{en ? "Could not load athletes." : "Não foi possível carregar os atletas."} <button type="button" onClick={() => void query.refetch()}>{en ? "Try again" : "Tentar novamente"}</button></p>}
      {query.data && (
        <>
          <p className="muted">{en ? "Find a registration to manage the athlete’s details and tags." : "Encontre uma inscrição para gerenciar os dados e as tags do atleta."}</p>
          <div className="review-search">
            <label>
              {en ? "Search by name or registration number" : "Buscar por nome ou número da inscrição"}
              <input value={search} onChange={event => setSearch(event.target.value)} />
            </label>
          </div>
          {matches?.length === 0 ? (
            <div className="operational-empty">
              <p>{query.data.length === 0 ? (en ? "No registrations yet." : "Nenhuma inscrição encontrada.") : (en ? "No athletes match your search." : "Nenhum atleta encontrado para esta busca.")}</p>
            </div>
          ) : (
            <div className="review-table-scroll" role="region" aria-labelledby="tournament-athletes-title" tabIndex={0}>
              <table className="review-table">
                <thead>
                  <tr>
                    <th scope="col">{en ? "Athlete" : "Atleta"}</th>
                    <th scope="col">{en ? "Registration" : "Inscrição"}</th>
                    <th scope="col">{en ? "Registration type" : "Tipo de inscrição"}</th>
                    <th scope="col">Tags</th>
                    <th scope="col">{en ? "Action" : "Ação"}</th>
                  </tr>
                </thead>
                <tbody>
                  {matches?.map(item => (
                    <tr key={item.registration_number}>
                      <th scope="row">{item.social_name || item.full_name}</th>
                      <td>
                        <strong>{item.registration_number}</strong>
                        <div className="review-table-status"><RegistrationStatus status={item.registration_status} language={language} /></div>
                        {item.parental_consent_required && <p className="registration-notice" role="status">{en ? "Signed parental consent form missing. Verify before participation." : "Termo de responsabilidade assinado pendente. Verifique antes da participação."}</p>}
                      </td>
                      <td>{item.product_name ?? (en ? "Unavailable" : "Indisponível")}</td>
                      <td><TagPills tags={item.tags} language={language} /></td>
                      <td><Link className="secondary-button" to={`/staff/tournaments/${encodeURIComponent(tournamentId)}/athletes/${encodeURIComponent(item.registration_number)}`}>{en ? "Manage registration" : "Gerenciar inscrição"}</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
