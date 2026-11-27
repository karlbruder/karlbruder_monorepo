import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ApplicationFooter } from "@/components/application-footer";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { listPersonalRegistrations } from "@/features/tournament/api/tournaments";
import { useLanguage } from "@/hooks/use-language";
import { RegistrationStatus } from "@/features/tournament/components/registration-status";
import "@/features/tournament/components/tournament-registration.css";

function nextStep(status: string, en: boolean): string {
  switch (status) {
    case "awaiting_payment": return en ? "Submit your payment proof. Your place is not reserved yet." : "Envie seu comprovante de pagamento. Sua vaga ainda não está reservada.";
    case "awaiting_payment_confirmation": return en ? "Your payment proof is under review. Your place is not reserved yet." : "Seu comprovante está em análise. Sua vaga ainda não está reservada.";
    case "confirmed": return en ? "Your participation is confirmed." : "Sua participação está confirmada.";
    case "waitlist": return en ? "Your payment was approved. You are on the waitlist without a reserved place." : "Seu pagamento foi aprovado. Você está na lista de espera, sem vaga reservada.";
    case "cancelled": return en ? "This registration was cancelled." : "Esta inscrição foi cancelada.";
    default: return en ? "Open the registration for details." : "Abra a inscrição para consultar os detalhes.";
  }
}

export function PersonalRegistrationsRoute() {
  const { session } = useAuthSession();
  const { language } = useLanguage();
  const en = language === "en";
  const query = useQuery({ queryKey: ["personal-registrations", session!.user.id], queryFn: ({ signal }) => listPersonalRegistrations(session!.user.id, signal), refetchOnMount: "always" });
  return (
    <div className="application-page" lang={en ? "en-US" : "pt-BR"}>
      <main className="application-body">
        <div className="page-intro">
          <p className="eyebrow">{en ? "Personal area" : "Área pessoal"}</p>
          <h1>{en ? "My registrations" : "Minhas inscrições"}</h1>
          <p className="muted">{en ? "Follow your payments and participation." : "Acompanhe seus pagamentos e sua participação."}</p>
        </div>
        {query.isPending && <p className="registration-notice" role="status">{en ? "Loading registrations..." : "Carregando inscrições..."}</p>}
        {query.isError && <div className="error-message" role="alert">
          <p>{en ? "Could not load your registrations." : "Não foi possível carregar suas inscrições."}</p>
          <button className="secondary-button" type="button" onClick={() => void query.refetch()}>{en ? "Try again" : "Tentar novamente"}</button>
        </div>}
        {query.data?.length === 0 && <section className="operational-empty">
          <h2>{en ? "No registrations yet." : "Nenhuma inscrição ainda."}</h2>
          <p>{en ? "Your registrations will appear here." : "Suas inscrições aparecerão aqui."}</p>
          <Link className="secondary-link" to="/tournaments/registration">{en ? "Explore tournaments" : "Explorar torneios"}</Link>
        </section>}
        {query.data && query.data.length > 0 && (
          <ul className="home-registrations">
            {query.data.map(item => (
              <li key={item.registration_number}>
                <article className="home-registration">
                  <div className="home-registration-heading">
                    <p className="eyebrow">{item.registration_number}</p>
                    <RegistrationStatus status={item.registration_status} language={language} />
                  </div>
                  <h2>{item.tournament_name}</h2>
                  <p className="home-next">{nextStep(item.registration_status, en)}</p>
                  <Link className="screen-link" to={`/tournaments/registration?tournament_id=${item.tournament_id}&registration_number=${encodeURIComponent(item.registration_number)}`}>
                    {en ? "View registration" : "Acompanhar inscrição"} <span aria-hidden="true">→</span>
                  </Link>
                </article>
              </li>
            ))}
          </ul>
        )}
      </main>
      <ApplicationFooter />
    </div>
  );
}
