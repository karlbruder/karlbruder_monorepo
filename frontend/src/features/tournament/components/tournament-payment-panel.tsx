import { useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import {
  PaymentProofRequestError,
  requestPaymentProofUploadUrl,
  submitPaymentProof,
  uploadFileToPresignedUrl,
} from "@/features/tournament/api/tournaments";
import type { Tournament } from "@/features/tournament/api/tournaments";
import { ownTournamentRegistrationsQueryKey } from "@/features/tournament/api/use-own-tournament-registrations";
import {
  tournamentRegistrationPaymentQueryKey,
  useTournamentRegistrationPayment,
} from "@/features/tournament/api/use-tournament-registration-payment";
import { validateParentalConsentFormFile } from "@/features/tournament/utils/validate-parental-consent-form-file";
import { appCopy } from "@/utils/app-copy";
import type { AppCopyKey, AppLanguage } from "@/utils/app-copy";

type Props = {
  tournament: Tournament;
  session: Session;
  registrationNumber: string;
  registrationStatus: string;
  onRegistrationRefresh: () => Promise<unknown>;
  language?: AppLanguage;
};

function formatMoney(
  value: Tournament["registration_fee_amount"] | string | number | null,
  language: AppLanguage,
): string {
  if (value === null) return appCopy(language, "A confirmar");
  const amount = Number(value);
  const locale = language === "pt" ? "pt-BR" : "en-US";
  return Number.isFinite(amount)
    ? new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }).format(amount)
    : appCopy(language, "A confirmar");
}

function formatDateTime(value: string | null, language: AppLanguage): string {
  if (!value) return appCopy(language, "A confirmar");
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return appCopy(language, "A confirmar");
  const locale = language === "pt" ? "pt-BR" : "en-US";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Etc/GMT+3",
  }).format(date);
}

function messageForProofRequest(error: unknown): AppCopyKey {
  if (error instanceof PaymentProofRequestError) {
    if (error.status === 413) return "O servidor recusou o comprovante por tamanho. Use um arquivo de até 10 MB.";
    if (error.status === 415) return "O servidor recusou o comprovante. Envie PDF, JPEG ou PNG de até 10 MB.";
    if (error.status === 422) return "Este arquivo não foi aceito. Escolha PDF, JPEG ou PNG de até 10 MB.";
    if (error.status === 409) return "Não foi possível enviar o comprovante agora. Tente novamente mais tarde.";
  }
  if (error instanceof Error && error.message.startsWith("presigned-upload-")) {
    return "Não foi possível enviar o comprovante agora. Tente novamente mais tarde.";
  }
  return "Não foi possível enviar o comprovante agora. Tente novamente mais tarde.";
}

export default function TournamentPaymentPanel({
  tournament,
  session,
  registrationNumber,
  registrationStatus,
  onRegistrationRefresh,
  language = "pt",
}: Props) {
  const t = (key: AppCopyKey) => appCopy(language, key);
  const queryClient = useQueryClient();
  const requestPending = useRef(false);
  const [fileError, setFileError] = useState<AppCopyKey | null>(null);
  const [requestError, setRequestError] = useState<AppCopyKey | null>(null);
  const [pending, setPending] = useState(false);
  const [replaceMode, setReplaceMode] = useState(false);

  const { data: payment, error, isFetching, refetch } = useTournamentRegistrationPayment(
    tournament.id,
    registrationNumber,
    session.access_token,
  );

  const canUpload =
    registrationStatus === "awaiting_payment" || registrationStatus === "awaiting_payment_confirmation";
  const showReplaceForm =
    canUpload && (replaceMode || registrationStatus === "awaiting_payment" || !payment?.latest_payment_proof);

  const invalidatePayment = async () => {
    await queryClient.invalidateQueries({
      queryKey: tournamentRegistrationPaymentQueryKey(tournament.id, registrationNumber),
    });
    await queryClient.invalidateQueries({
      queryKey: ownTournamentRegistrationsQueryKey(tournament.id),
    });
    await onRegistrationRefresh();
  };

  const submitProof = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (requestPending.current || !canUpload) return;
    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("payment_proof");
    const file =
      fileInput instanceof HTMLInputElement && fileInput.files && fileInput.files.length > 0
        ? fileInput.files[0]
        : null;
    setFileError(null);
    setRequestError(null);
    if (!file) {
      setFileError("Escolha PDF, JPEG ou PNG de até 10 MB.");
      return;
    }
    const validationError = await validateParentalConsentFormFile(file);
    if (validationError) {
      setFileError("Este arquivo não foi aceito. Escolha PDF, JPEG ou PNG de até 10 MB.");
      return;
    }

    if (requestPending.current) return;
    requestPending.current = true;
    setPending(true);
    try {
      const uploadInfo = await requestPaymentProofUploadUrl(
        tournament.id,
        registrationNumber,
        session.access_token,
      );
      await uploadFileToPresignedUrl(uploadInfo.upload_url, file, uploadInfo.required_headers);
      await submitPaymentProof(tournament.id, registrationNumber, session.access_token, {
        storage_key: uploadInfo.storage_key,
        original_file_name: file.name,
      });
      form.reset();
      setReplaceMode(false);
      await invalidatePayment();
    } catch (submitError) {
      setRequestError(messageForProofRequest(submitError));
    } finally {
      requestPending.current = false;
      setPending(false);
    }
  };

  if (isFetching && !payment) {
    return (
      <section className="registration-card" aria-labelledby="payment-panel-title">
        <p role="status">{t("Carregando informações do torneio...")}</p>
      </section>
    );
  }

  if (error || !payment) {
    return (
      <section className="registration-card" aria-labelledby="payment-panel-title">
        <p className="registration-notice" role="alert">
          {t(error instanceof Error && error.message === "http-404" ? "Inscrição não encontrada ou sem acesso para esta conta." : "Não foi possível carregar as instruções de pagamento. Tente novamente.")}
        </p>
        <button type="button" onClick={() => void refetch()}>{t("Tentar novamente")}</button>
      </section>
    );
  }

  const feeAmount = payment.registration_fee_amount ?? tournament.registration_fee_amount;
  const amountReceived = payment.amount_received;

  return (
    <section className="registration-card registration-payment-panel" aria-labelledby="payment-panel-title">
      <p className="registration-eyebrow">{t("Inscrição")}</p>
      <h2 id="payment-panel-title">{t("Pagamento da inscrição")}</h2>
      <dl className="registration-success-facts">
        {(registrationStatus === "confirmed" || registrationStatus === "waitlist") && (
          <div><dt>{t("Pagamento da inscrição")}</dt><dd>{t("Pagamento confirmado")}</dd></div>
        )}
        <div><dt>{t(amountReceived == null ? "Valor da inscrição" : "Valor recebido")}</dt><dd>{formatMoney(amountReceived ?? feeAmount, language)}</dd></div>
        <div><dt>{t("Prazo para pagamento")}</dt><dd>{formatDateTime(payment.payment_due_at, language)}</dd></div>
        {canUpload && <div><dt>{t("Chave Pix")}</dt><dd>{payment.payment_options.pix.pix_key ?? t("A chave Pix deste torneio ainda não foi configurada.")}</dd></div>}
      </dl>
      {canUpload && registrationStatus === "awaiting_payment" && payment.current_review?.decision !== "rejected" && <p className="registration-help">{t("Faça o Pix fora da plataforma e envie o comprovante abaixo. Enviar o arquivo não transfere dinheiro nem reserva vaga.")}</p>}
      {registrationStatus === "awaiting_payment" && payment.current_review?.decision === "rejected" && <div className="registration-notice" role="status">
        <h3>{t("Comprovante rejeitado")}</h3>
        <p>{payment.current_review.rejection_reason}</p>
        <p>{t("Sua inscrição não foi cancelada. Envie um novo comprovante para análise. Nenhuma vaga está reservada.")}</p>
      </div>}
      {registrationStatus === "waitlist" && <p className="registration-notice" role="status">{t("Seu pagamento foi aprovado, mas você não tem uma vaga confirmada. Não pague novamente. A equipe escolhe e confirma participantes da lista de espera. Não há promoção automática.")}</p>}
      {registrationStatus === "cancelled" && <p className="registration-notice" role="status">{t("Esta inscrição está cancelada e não permite envio de comprovantes.")}</p>}

      {registrationStatus === "awaiting_payment_confirmation" && (
        <p className="registration-notice" role="status">
          {t("Recebemos seu comprovante. Nossa equipe confere o pagamento manualmente. Essa conferência pode levar de 1 a 2 dias úteis. Nenhuma vaga foi reservada.")}
        </p>
      )}

      <div className="registration-payment-proof-summary">
        <h3>{t("Resumo do comprovante")}</h3>
        {payment.latest_payment_proof ? (
          <p>
            {t("Último comprovante enviado")}: {payment.latest_payment_proof.original_file_name}
            <br />
            {t("Enviado em")} {formatDateTime(payment.latest_payment_proof.submitted_at, language)}
          </p>
        ) : (
          <p>{t("Nenhum comprovante enviado ainda.")}</p>
        )}
      </div>

      {canUpload && payment.latest_payment_proof && !showReplaceForm && (
        <button type="button" className="registration-submit" onClick={() => setReplaceMode(true)}>
          {t("Substituir comprovante")}
        </button>
      )}

      {showReplaceForm && (
        <form className="registration-payment-proof-form" aria-label={t("Comprovante de pagamento")} onSubmit={submitProof}>
          {fileError && <p className="registration-field-error" role="alert">{t(fileError)}</p>}
          {requestError && <p className="registration-error-summary" role="alert">{t(requestError)}</p>}
          <div className="registration-field">
            <label htmlFor="payment_proof">{t("Comprovante de pagamento")}</label>
            <input
              id="payment_proof"
              name="payment_proof"
              type="file"
              accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
              disabled={pending}
            />
            <span className="registration-help">{t("Escolha PDF, JPEG ou PNG de até 10 MB.")}</span>
          </div>
          <button className="registration-submit" type="submit" disabled={pending}>
            {t(pending ? "Enviando comprovante..." : payment.latest_payment_proof ? "Substituir comprovante" : "Enviar comprovante")}
          </button>
        </form>
      )}

      {canUpload && <p className="registration-seat-note">{t("O envio da inscrição não confirma uma vaga. A equipe analisará o pagamento e a disponibilidade depois.")}</p>}
      <button type="button" className="registration-submit" disabled={isFetching || pending} onClick={() => { void refetch(); void onRegistrationRefresh(); }}>{t("Atualizar situação")}</button>
    </section>
  );
}
