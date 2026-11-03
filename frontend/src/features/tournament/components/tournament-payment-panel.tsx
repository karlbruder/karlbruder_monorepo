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
import { useTournamentSignupPayment } from "@/features/tournament/api/use-tournament-signup-payment";
import { validateParentalTermFile } from "@/features/tournament/utils/validate-parental-term-file";
import { appCopy } from "@/utils/app-copy";
import type { AppCopyKey, AppLanguage } from "@/utils/app-copy";

type Props = {
  tournament: Tournament;
  session: Session;
  inscriptionNumber: string;
  language?: AppLanguage;
};

function formatMoney(
  value: Tournament["inscription_fee_amount"] | string | number | null,
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

function statusLabel(status: string, language: AppLanguage): string {
  if (status === "awaiting_payment") return appCopy(language, "Aguardando pagamento");
  if (status === "payment_in_review") return appCopy(language, "Pagamento em análise");
  return status;
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
  inscriptionNumber,
  language = "pt",
}: Props) {
  const t = (key: AppCopyKey) => appCopy(language, key);
  const queryClient = useQueryClient();
  const requestPending = useRef(false);
  const [fileError, setFileError] = useState<AppCopyKey | null>(null);
  const [requestError, setRequestError] = useState<AppCopyKey | null>(null);
  const [pending, setPending] = useState(false);
  const [replaceMode, setReplaceMode] = useState(false);

  const { data: payment, error, isFetching, refetch } = useTournamentSignupPayment(
    tournament.id,
    inscriptionNumber,
    session.access_token,
  );

  const canUpload =
    payment?.status === "awaiting_payment" || payment?.status === "payment_in_review";
  const showReplaceForm =
    canUpload && (replaceMode || payment?.status === "awaiting_payment" || !payment?.latest_payment_proof);

  const invalidatePayment = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["tournaments", tournament.id, "signups", inscriptionNumber, "payment"],
    });
    await queryClient.invalidateQueries({ queryKey: ["tournaments", tournament.id, "signups", "own"] });
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
    const validationError = await validateParentalTermFile(file);
    if (validationError) {
      setFileError("Este arquivo não foi aceito. Escolha PDF, JPEG ou PNG de até 10 MB.");
      return;
    }

    requestPending.current = true;
    setPending(true);
    try {
      const uploadInfo = await requestPaymentProofUploadUrl(
        tournament.id,
        inscriptionNumber,
        session.access_token,
      );
      await uploadFileToPresignedUrl(uploadInfo.upload_url, file, uploadInfo.required_headers);
      await submitPaymentProof(tournament.id, inscriptionNumber, session.access_token, {
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
          {t("Não foi possível carregar as instruções de pagamento. Tente novamente.")}
        </p>
        <button type="button" onClick={() => void refetch()}>{t("Tentar novamente")}</button>
      </section>
    );
  }

  const feeAmount = payment.inscription_fee_amount ?? tournament.inscription_fee_amount;

  return (
    <section className="registration-card signup-payment-panel" aria-labelledby="payment-panel-title">
      <p className="registration-eyebrow">{t("Inscrição")}</p>
      <h2 id="payment-panel-title">{t("Pagamento da inscrição")}</h2>
      <strong className="signup-number">{payment.inscription_number}</strong>
      <dl className="signup-success-facts">
        <div><dt>{t("Situação")}</dt><dd>{statusLabel(payment.status, language)}</dd></div>
        <div><dt>{t("Valor da inscrição")}</dt><dd>{formatMoney(feeAmount, language)}</dd></div>
        <div><dt>{t("Prazo para pagamento")}</dt><dd>{formatDateTime(payment.payment_due_at, language)}</dd></div>
        <div><dt>{t("Chave Pix")}</dt><dd>{payment.payment_options.pix.pix_key ?? t("A chave Pix deste torneio ainda não foi configurada.")}</dd></div>
      </dl>
      <p className="signup-help">{t("Faça o Pix fora da plataforma e envie o comprovante abaixo. Enviar o arquivo não transfere dinheiro nem reserva vaga.")}</p>

      {payment.status === "payment_in_review" && (
        <p className="registration-notice" role="status">
          {t("Seu comprovante foi recebido e está aguardando análise da equipe. Nenhuma vaga foi reservada.")}
        </p>
      )}

      <div className="signup-payment-proof-summary">
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
        <button type="button" className="signup-submit" onClick={() => setReplaceMode(true)}>
          {t("Substituir comprovante")}
        </button>
      )}

      {showReplaceForm && (
        <form className="signup-payment-proof-form" aria-label={t("Comprovante de pagamento")} onSubmit={submitProof}>
          {fileError && <p className="signup-field-error" role="alert">{t(fileError)}</p>}
          {requestError && <p className="signup-error-summary" role="alert">{t(requestError)}</p>}
          <div className="signup-field">
            <label htmlFor="payment_proof">{t("Comprovante de pagamento")}</label>
            <input
              id="payment_proof"
              name="payment_proof"
              type="file"
              accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
              disabled={pending}
            />
            <span className="signup-help">{t("Escolha PDF, JPEG ou PNG de até 10 MB.")}</span>
          </div>
          <button className="signup-submit" type="submit" disabled={pending}>
            {t(pending ? "Enviando comprovante..." : payment.latest_payment_proof ? "Substituir comprovante" : "Enviar comprovante")}
          </button>
        </form>
      )}

      <p className="registration-seat-note">{t("O envio da inscrição não confirma uma vaga. A equipe analisará o pagamento e a disponibilidade depois.")}</p>
    </section>
  );
}
