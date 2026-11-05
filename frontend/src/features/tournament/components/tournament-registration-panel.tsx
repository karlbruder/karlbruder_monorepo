import { useRef, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { getOwnRegistration, requestParentalConsentFormUploadUrl, submitParentalConsentForm, uploadFileToPresignedUrl } from "@/features/tournament/api/tournaments";
import type { Tournament } from "@/features/tournament/api/tournaments";
import { ownTournamentRegistrationsQueryKey } from "@/features/tournament/api/use-own-tournament-registrations";
import TournamentPaymentPanel from "@/features/tournament/components/tournament-payment-panel";
import { validateParentalConsentFormFile } from "@/features/tournament/utils/validate-parental-consent-form-file";
import { appCopy, type AppCopyKey, type AppLanguage } from "@/utils/app-copy";

function statusLabel(status: string): AppCopyKey {
  if (status === "awaiting_payment") return "Aguardando pagamento";
  if (status === "awaiting_payment_confirmation") return "Aguardando confirmação do pagamento";
  if (status === "confirmed") return "Confirmada";
  if (status === "waitlist") return "Lista de espera";
  if (status === "cancelled") return "Cancelada";
  return "Situação indisponível";
}

export default function TournamentRegistrationPanel({ tournament, session, registrationNumber, language }: {
  tournament: Tournament; session: Session; registrationNumber: string; language: AppLanguage;
}) {
  const t = (key: AppCopyKey) => appCopy(language, key);
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["tournaments", tournament.id, "registrations", registrationNumber, "owner", session.user.id],
    queryFn: ({ signal }) => getOwnRegistration(tournament.id, registrationNumber, session.access_token, signal),
  });
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const busy = useRef(false);
  const registration = query.data;
  async function submitConsent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || !registration?.parental_consent_required) return;
    const form = event.currentTarget;
    const input = form.elements.namedItem("parental_consent_form");
    const file = input instanceof HTMLInputElement ? input.files?.[0] : undefined;
    busy.current = true; setPending(true); setFailed(false);
    try {
      if (!file || await validateParentalConsentFormFile(file)) throw new Error("invalid file");
      const upload = await requestParentalConsentFormUploadUrl(tournament.id, session.access_token);
      await uploadFileToPresignedUrl(upload.upload_url, file, upload.required_headers);
      await submitParentalConsentForm(tournament.id, registrationNumber, session.access_token, { storage_key: upload.storage_key, original_file_name: file.name });
      form.reset();
      await Promise.all([query.refetch(), client.invalidateQueries({ queryKey: ownTournamentRegistrationsQueryKey(tournament.id) })]);
    } catch { setFailed(true); } finally { busy.current = false; setPending(false); }
  }
  if (query.isPending) return <p role="status">{t("Carregando informações do torneio...")}</p>;
  if (query.isError || !registration || (registration.user_id && registration.user_id !== session.user.id)) return <section className="registration-card"><p role="alert">{t(query.error instanceof Error && query.error.message === "http-404" || registration?.user_id && registration.user_id !== session.user.id ? "Inscrição não encontrada ou sem acesso para esta conta." : "Não foi possível carregar sua inscrição.")}</p><button onClick={() => void query.refetch()}>{t("Tentar novamente")}</button></section>;
  return <>
    <section className="registration-card" aria-label={t("Sua inscrição")}>
      <h2>{t("Sua inscrição")}</h2><strong>{registration.registration_number}</strong>
      <dl><div><dt>{t("Situação")}</dt><dd>{t(statusLabel(registration.registration_status))}</dd></div></dl>
      {registration.parental_consent_required && <form onSubmit={submitConsent}>
        <p role="status">{t("O termo assinado pelo responsável é necessário para participar. Envie-o antes do evento.")}</p>
        <label htmlFor="parental_consent_form_existing">{t("Termo de responsabilidade assinado")}</label>
        <input id="parental_consent_form_existing" name="parental_consent_form" type="file" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" disabled={pending} />
        <p>{t("Envie o termo de responsabilidade assinado em PDF ou imagem (JPEG ou PNG).")}</p>
        {failed && <p role="alert">{t("Não foi possível enviar o termo de responsabilidade. Tente novamente.")}</p>}
        <button type="submit" disabled={pending}>{t(pending ? "Enviando termo..." : "Enviar termo")}</button>
      </form>}
      {registration.registration_status === "confirmed" && !registration.parental_consent_required && <p role="status">{t("Sua participação está confirmada. Você tem uma vaga. Não é necessário pagar novamente.")}</p>}
    </section>
    <TournamentPaymentPanel tournament={tournament} session={session} registrationNumber={registrationNumber} registrationStatus={registration.registration_status} onRegistrationRefresh={() => query.refetch()} language={language} />
  </>;
}
