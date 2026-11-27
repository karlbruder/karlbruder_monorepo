import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { getOwnRegistration, stageParentalConsentForm, submitParentalConsentForm } from "@/features/tournament/api/tournaments";
import type { OwnerRegistration, Tournament } from "@/features/tournament/api/tournaments";
import { ownTournamentRegistrationsQueryKey } from "@/features/tournament/api/use-own-tournament-registrations";
import TournamentPaymentPanel from "@/features/tournament/components/tournament-payment-panel";
import { validateParentalConsentFormFile } from "@/features/tournament/utils/validate-parental-consent-form-file";
import { appCopy, type AppCopyKey, type AppLanguage } from "@/utils/app-copy";
import { RegistrationStatus } from "@/features/tournament/components/registration-status";
import { RegistrationProgress } from "@/features/tournament/components/registration-progress";
import { cancelRegistration } from "@/features/tournament/api/registration-refunds";
import { RegistrationRefundStatus } from "@/features/tournament/components/registration-refund-status";
import { RegistrationEdit } from "@/features/tournament/components/registration-edit";
import { captureSessionScope } from "@/lib/session-scope";

function isTransientRefreshError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (!(error instanceof Error)) return false;
  const match = /^http-(\d{3})$/.exec(error.message);
  if (!match) return false;
  const status = Number(match[1]);
  return status === 408 || status === 429 || status >= 500;
}

export default function TournamentRegistrationPanel({ tournament, user, registrationNumber, language, onCancelled }: {
  tournament: Tournament; user: User; registrationNumber: string; language: AppLanguage;
  onCancelled?: () => void;
}) {
  const t = (key: AppCopyKey) => appCopy(language, key);
  const client = useQueryClient();
  const registrationQueryKey = ["tournaments", tournament.id, "registrations", registrationNumber, "owner", user.id] as const;
  const query = useQuery({
    queryKey: registrationQueryKey,
    queryFn: ({ signal }) => getOwnRegistration(tournament.id, registrationNumber, user.id, signal),
  });
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [confirmCancellation, setConfirmCancellation] = useState(false);
  const [editing, setEditing] = useState(false);
  const confirmingCancellation = tournament.refunds_allowed === true && confirmCancellation;
  const cancellationHeading = useRef<HTMLHeadingElement>(null);
  const busy = useRef(false);
  const registration = query.data;
  useEffect(() => {
    if (confirmingCancellation) cancellationHeading.current?.focus();
  }, [confirmingCancellation]);

  const cancellation = useMutation({
    onMutate: () => captureSessionScope(),
    mutationFn: () => cancelRegistration(user.id, tournament.id, registrationNumber),
    onSuccess: async (_result, _variables, scope) => {
      if (!scope.isCurrent()) return;
      onCancelled?.();
      await client.cancelQueries({ queryKey: registrationQueryKey });
      if (!scope?.isCurrent()) return;
      client.setQueryData<typeof registration>(registrationQueryKey, current =>
        current ? { ...current, registration_status: "cancelled" } : current,
      );
      await client.invalidateQueries({ queryKey: ownTournamentRegistrationsQueryKey(tournament.id) });
    },
    onError: async (_error, _variables, scope) => {
      if (!scope?.isCurrent()) return;
      const refreshed = await query.refetch();
      if (!scope?.isCurrent()) return;
      if (refreshed.data?.registration_status === "cancelled") {
        onCancelled?.();
        await client.invalidateQueries({ queryKey: ownTournamentRegistrationsQueryKey(tournament.id) });
      }
    },
  });
  function updateSubmittedStatus(submitted: OwnerRegistration) {
    if (submitted.tournament_id !== tournament.id || submitted.registration_number !== registrationNumber ||
        (submitted.user_id && submitted.user_id !== user.id) || submitted.registration_status !== "awaiting_payment_confirmation") return;
    const state = client.getQueryState(registrationQueryKey);
    if (state?.status === "error" && !isTransientRefreshError(state.error)) return;
    client.setQueryData<typeof registration>(registrationQueryKey, current =>
      current?.registration_status === "awaiting_payment"
        ? { ...current, registration_status: submitted.registration_status }
        : current,
    );
  }
  async function submitConsent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || !registration?.parental_consent_required) return;
    const form = event.currentTarget;
    const input = form.elements.namedItem("parental_consent_form");
    const file = input instanceof HTMLInputElement ? input.files?.[0] : undefined;
    busy.current = true; setPending(true); setFailed(false);
    const scope = captureSessionScope();
    try {
      if (!file || await validateParentalConsentFormFile(file)) throw new Error("invalid file");
      scope.throwIfChanged();
      const storageKey = await stageParentalConsentForm(tournament.id, user.id, file);
      scope.throwIfChanged();
      await submitParentalConsentForm(tournament.id, registrationNumber, user.id, { storage_key: storageKey, original_file_name: file.name });
      form.reset();
      await Promise.all([query.refetch(), client.invalidateQueries({ queryKey: ownTournamentRegistrationsQueryKey(tournament.id) })]);
    } catch { if (scope.isCurrent()) setFailed(true); } finally { busy.current = false; setPending(false); }
  }
  if (query.isPending) return <p role="status">{t("Carregando informações do torneio...")}</p>;
  const transientRefreshError = query.isError && Boolean(registration) && isTransientRefreshError(query.error);
  if ((query.isError && !transientRefreshError) || !registration || (registration.user_id && registration.user_id !== user.id)) return <section className="registration-card"><p role="alert">{t(query.error instanceof Error && query.error.message === "http-404" || registration?.user_id && registration.user_id !== user.id ? "Inscrição não encontrada ou sem acesso para esta conta." : "Não foi possível carregar sua inscrição.")}</p><button onClick={() => void query.refetch()}>{t("Tentar novamente")}</button></section>;
  const cancelled = registration.registration_status === "cancelled";
  if (editing && !cancelled) return <RegistrationEdit registration={registration} tournament={tournament} user={user} language={language} onBack={() => setEditing(false)} onSaved={() => { void query.refetch(); }} />;
  return <>
    {!cancelled && <RegistrationProgress current={registration.registration_status === "awaiting_payment" ? 2 : 3} language={language} />}
    <section className="registration-card" aria-label={t("Sua inscrição")}>
      <h2>{t("Sua inscrição")}</h2><strong>{registration.registration_number}</strong>
      {transientRefreshError && <p role="alert">{t("Não foi possível atualizar sua inscrição. Tente novamente.")} <button type="button" onClick={() => void query.refetch()}>{t("Tentar novamente")}</button></p>}
      <dl className="registration-status-facts">
        {registration.product_name && <div><dt>{language === "en" ? "Registration type" : "Tipo de inscrição"}</dt><dd>{registration.product_name}</dd></div>}
        <div><dt>{t("Situação")}</dt><dd><RegistrationStatus status={registration.registration_status} language={language} /></dd></div>
      </dl>
      {registration.product_description && <p>{registration.product_description}</p>}
      {!cancelled && <button type="button" onClick={() => setEditing(true)}>{language === "en" ? "Edit registration details" : "Editar dados da inscrição"}</button>}
      {!cancelled && !confirmingCancellation && registration.parental_consent_required && <form onSubmit={submitConsent}>
        <p role="status">{t("O termo assinado pelo responsável é necessário para participar. Envie-o antes do evento.")}</p>
        <label htmlFor="parental_consent_form_existing">{t("Termo de responsabilidade assinado")}</label>
        <input id="parental_consent_form_existing" name="parental_consent_form" type="file" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" disabled={pending} />
        <p>{t("Envie o termo de responsabilidade assinado em PDF ou imagem (JPEG ou PNG).")}</p>
        {failed && <p role="alert">{t("Não foi possível enviar o termo de responsabilidade. Tente novamente.")}</p>}
        <button type="submit" disabled={pending}>{t(pending ? "Enviando termo..." : "Enviar termo")}</button>
      </form>}
      {registration.registration_status === "confirmed" && !registration.parental_consent_required && <p className="registration-notice registration-notice-success" role="status">{t("Sua participação está confirmada. Você tem uma vaga. Não é necessário pagar novamente.")}</p>}
    </section>
    {cancelled ? <RegistrationRefundStatus userId={user.id} tournamentId={tournament.id} number={registrationNumber} language={language} /> : <>
      {!confirmingCancellation && <TournamentPaymentPanel tournament={tournament} user={user} registrationNumber={registrationNumber} registrationStatus={registration.registration_status} onProofSubmitted={updateSubmittedStatus} onRegistrationRefresh={() => query.refetch()} language={language} />}
      {tournament.refunds_allowed === true && <section className="registration-card">
        {confirmingCancellation ? <>
          <h2 ref={cancellationHeading} tabIndex={-1}>{t("Cancelar participação")}</h2>
          <p className="registration-notice">{t("O cancelamento encerra a participação e libera qualquer vaga ocupada imediatamente.")}</p>
          <p>{t("A guilda devolve o valor integral do pagamento verificado em até 10 dias úteis.")}</p>
          {(registration.registration_status === "awaiting_payment" || registration.registration_status === "awaiting_payment_confirmation") &&
            <p>{t("Se você já fez um Pix que ainda não foi confirmado, fale com a equipe antes de cancelar.")}</p>}
          {cancellation.isError && <p role="alert">{t("Não foi possível confirmar o cancelamento. Atualize a inscrição e tente novamente.")}</p>}
          <div className="registration-refund-actions">
            <button type="button" className="registration-danger" disabled={cancellation.isPending} onClick={() => cancellation.mutate()}>{t(cancellation.isPending ? "Cancelando..." : "Confirmar cancelamento")}</button>
            <button type="button" disabled={cancellation.isPending} onClick={() => { cancellation.reset(); setConfirmCancellation(false); }}>{t("Manter participação")}</button>
          </div>
        </> : <button type="button" className="registration-danger" disabled={pending} onClick={() => setConfirmCancellation(true)}>{t("Cancelar participação")}</button>}
      </section>}
    </>}
  </>;
}
