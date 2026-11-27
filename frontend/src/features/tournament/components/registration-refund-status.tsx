import { useQuery } from "@tanstack/react-query";
import { getRegistrationRefund } from "@/features/tournament/api/registration-refunds";
import { formatRefundAmount, formatRefundDeadline, formatRefundTime } from "@/features/tournament/utils/format-refund";
import { appCopy, type AppCopyKey, type AppLanguage } from "@/utils/app-copy";

export function RegistrationRefundStatus({ userId, tournamentId, number, language }: {
  userId: string; tournamentId: number; number: string; language: AppLanguage;
}) {
  const t = (key: AppCopyKey) => appCopy(language, key);
  const query = useQuery({
    queryKey: ["tournaments", tournamentId, "registrations", number, "refund", userId],
    queryFn: ({ signal }) => getRegistrationRefund(userId, tournamentId, number, signal),
  });
  const refund = query.data;
  return <section className="registration-card">
    <h2>{t("Reembolso")}</h2>
    {query.isPending ? <p role="status">{t("Carregando reembolso...")}</p> :
      query.isError ? <p role="alert">{t("Não foi possível carregar o reembolso.")} <button type="button" onClick={() => void query.refetch()}>{t("Tentar novamente")}</button></p> :
      !refund ? <p role="status">{t("Nenhum reembolso registrado para esta inscrição.")}</p> :
      <dl className="registration-status-facts">
        <div><dt>{t("Situação do reembolso")}</dt><dd><span className={`registration-status ${refund.refund_status === "completed" ? "registration-status-confirmed" : "registration-status-awaiting_payment"}`}>{t(refund.refund_status === "completed" ? "Reembolso concluído" : "Aguardando reembolso")}</span></dd></div>
        <div><dt>{t("Valor do reembolso")}</dt><dd>{formatRefundAmount(refund.amount_owed, language)}</dd></div>
        <div><dt>{t("Prazo do reembolso")}</dt><dd>{formatRefundDeadline(refund.due_on, language)}</dd></div>
        {refund.completed_at && <div><dt>{t("Transferência realizada em (UTC−03:00)")}</dt><dd>{formatRefundTime(refund.completed_at, language)}</dd></div>}
      </dl>}
  </section>;
}
