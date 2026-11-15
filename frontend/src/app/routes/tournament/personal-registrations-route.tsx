import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ApplicationHeader } from "@/components/application-header";
import { ApplicationFooter } from "@/components/application-footer";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { listPersonalRegistrations } from "@/features/tournament/api/tournaments";
import { useLanguage } from "@/hooks/use-language";
import { appCopy } from "@/utils/app-copy";
import type { AppCopyKey } from "@/utils/app-copy";

const statusLabels: Record<string, AppCopyKey> = {
  awaiting_payment: "Aguardando pagamento", awaiting_payment_confirmation: "Aguardando confirmação do pagamento",
  confirmed: "Confirmada", waitlist: "Lista de espera", cancelled: "Cancelada",
};

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
  const { language, changeLanguage } = useLanguage();
  const en = language === "en";
  const query = useQuery({ queryKey: ["personal-registrations", session!.user.id], queryFn: ({ signal }) => listPersonalRegistrations(session!.access_token, signal), refetchOnMount: "always" });
  return <div className="application-page" lang={en ? "en-US" : "pt-BR"}>
    <ApplicationHeader language={language} onLanguageChange={changeLanguage} />
    <main className="application-body"><p className="eyebrow">{en ? "Personal area" : "Área pessoal"}</p><h1>{en ? "My registrations" : "Minhas inscrições"}</h1><p>{en ? "Follow your payments and participation." : "Acompanhe seus pagamentos e sua participação."}</p>
      {query.isPending && <p role="status">{en ? "Loading registrations..." : "Carregando inscrições..."}</p>}
      {query.isError && <p role="alert">{en ? "Could not load your registrations." : "Não foi possível carregar suas inscrições."} <button type="button" onClick={() => void query.refetch()}>{en ? "Try again" : "Tentar novamente"}</button></p>}
      {query.data?.length === 0 && <section className="home-registration"><h2>{en ? "No registrations yet." : "Nenhuma inscrição ainda."}</h2><p>{en ? "Your registrations will appear here." : "Suas inscrições aparecerão aqui."}</p><Link to="/tournaments/registration">{en ? "Explore tournaments" : "Explorar torneios"}</Link></section>}
      {query.data && query.data.length > 0 && <ul className="home-registrations">{query.data.map(item => <li key={item.registration_number}><article className="home-registration"><p className="eyebrow">{item.registration_number}</p><h2>{item.tournament_name}</h2><p>{appCopy(language, statusLabels[item.registration_status] ?? "Situação indisponível")}</p><p>{nextStep(item.registration_status, en)}</p><Link className="screen-link" to={`/tournaments/registration?tournament_id=${item.tournament_id}&registration_number=${encodeURIComponent(item.registration_number)}`}>{en ? "View registration" : "Acompanhar inscrição"} →</Link></article></li>)}</ul>}
    </main><ApplicationFooter language={language} />
  </div>;
}
