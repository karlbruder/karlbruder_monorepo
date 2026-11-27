import { captureSessionScope } from "@/lib/session-scope";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { completeRegistrationRefund, listPendingRefunds, type StaffRegistrationRefund } from "@/features/tournament/api/registration-refunds";
import { formatRefundAmount, formatRefundDeadline, formatRefundTime } from "@/features/tournament/utils/format-refund";
import { appCopy, type AppCopyKey, type AppLanguage } from "@/utils/app-copy";

function RefundCompletionForm({ refund, userId, language, onRecorded, onClose }: {
  refund: StaffRegistrationRefund;
  userId: string;
  language: AppLanguage;
  onRecorded: (notificationSent: boolean) => void;
  onClose: () => void;
}) {
  const t = (key: AppCopyKey) => appCopy(language, key);
  const [invalidTime, setInvalidTime] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);

  const completion = useMutation({
    onMutate: () => captureSessionScope(),
    mutationFn: (completedAt: string) => completeRegistrationRefund(userId, refund, completedAt),
    onSuccess: (result, _completedAt, scope) => { if (scope.isCurrent()) onRecorded(result.notification_result === "sent"); },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (completion.isPending) return;
    const form = new FormData(event.currentTarget);
    if (!form.has("transferred")) return;
    const completedAt = new Date(`${form.get("completedAt")}-03:00`);
    if (!Number.isFinite(completedAt.getTime()) ||
      completedAt.getTime() < Date.parse(refund.obligated_at) || completedAt.getTime() > Date.now()) {
      setInvalidTime(true);
      return;
    }
    setInvalidTime(false);
    completion.mutate(completedAt.toISOString());
  }

  return <div className="review-columns refund-completion">
    <aside className="review-notice">{t("Faça a transferência fora da plataforma antes de registrar a devolução.")}</aside>
    <form className="review-card" onSubmit={submit}>
      <h2 ref={heading} tabIndex={-1}>{t("Registrar reembolso realizado")}</h2>
      <p>{refund.full_name} · {refund.tournament_name}</p>
      <dl>
        <div><dt>{t("Inscrição")}</dt><dd>{refund.registration_number}</dd></div>
        <div><dt>{t("Situação")}</dt><dd>{t("Cancelada")}</dd></div>
        <div><dt>{t("Situação do reembolso")}</dt><dd>{t("Aguardando reembolso")}</dd></div>
        <div><dt>{t("Valor do reembolso")}</dt><dd>{formatRefundAmount(refund.amount_owed, language)}</dd></div>
        <div><dt>{t("Prazo do reembolso")}</dt><dd>{formatRefundDeadline(refund.due_on, language)}</dd></div>
        <div><dt>{t("Cancelamento registrado em (UTC−03:00)")}</dt><dd>{formatRefundTime(refund.obligated_at, language)}</dd></div>
      </dl>
      <fieldset disabled={completion.isPending}>
        <label>{t("Transferência realizada em (UTC−03:00)")}
          <input name="completedAt" type="datetime-local" step="1" required onChange={() => setInvalidTime(false)} />
        </label>
        <label className="review-check"><input name="transferred" type="checkbox" required /> {t("Confirmei a transferência do valor integral.")}</label>
        {invalidTime && <p role="alert">{t("A devolução deve ter ocorrido entre o cancelamento e o momento atual.")}</p>}
        {completion.isError && <p role="alert">{t("Não foi possível registrar a devolução. Atualize a fila e tente novamente.")}</p>}
        <button type="submit">{t(completion.isPending ? "Registrando..." : "Registrar devolução concluída")}</button>
      </fieldset>
      <div className="refund-form-actions">
        <button type="button" disabled={completion.isPending} onClick={onClose}>{t("Voltar aos reembolsos")}</button>
        <a href={`/staff/payment-reviews/${encodeURIComponent(refund.registration_number)}`}>{t("Ver evidência de pagamento")}</a>
      </div>
    </form>
  </div>;
}

export function RegistrationRefundQueue({ userId, language }: {
  userId: string; language: AppLanguage;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<StaffRegistrationRefund>();
  const [notice, setNotice] = useState<AppCopyKey>();
  const t = (key: AppCopyKey) => appCopy(language, key);
  const query = useQuery({
    queryKey: ["registration-refunds", userId, filter, offset],
    queryFn: ({ signal }) => listPendingRefunds(userId, filter, offset, signal),
  });

  if (selected) return <RefundCompletionForm refund={selected} userId={userId} language={language}
    onClose={() => { setSelected(undefined); void query.refetch(); }}
    onRecorded={sent => {
      setSelected(undefined);
      setNotice(sent ? "Reembolso registrado." : "Reembolso registrado. O e-mail de confirmação não foi enviado.");
      void query.refetch();
    }}
  />;

  return <>
    <p>{t("Todos os torneios · acesso administrativo")}</p>
    {notice && <p className="review-notice" role="status">{t(notice)}</p>}
    <form className="review-search" onSubmit={event => {
      event.preventDefault();
      setFilter(search.trim());
      setOffset(0);
    }}>
      <label>{t("Buscar inscrição exata")}<input value={search} onChange={event => setSearch(event.target.value)} maxLength={50} /></label>
      <button type="submit">{t("Buscar")}</button>
      <button type="button" disabled={query.isFetching} onClick={() => void query.refetch()}>{t("Atualizar fila")}</button>
    </form>
    {query.isPending ? <p role="status">{t("Carregando reembolsos...")}</p> :
      query.isError ? <p role="alert">{t("Não foi possível carregar os reembolsos.")}</p> :
      <>
        {query.data.items.length === 0 ? (
          <div className="operational-empty"><p>{t("Nenhum reembolso pendente.")}</p></div>
        ) : (
          <div className="review-table-scroll" role="region" aria-label={t("Reembolsos pendentes")} tabIndex={0}>
            <table className="review-table">
              <thead>
                <tr>
                  <th scope="col">{language === "en" ? "Athlete" : "Atleta"}</th>
                  <th scope="col">{language === "en" ? "Registration" : "Inscrição"}</th>
                  <th scope="col">{t("Prazo do reembolso")}</th>
                  <th scope="col">{language === "en" ? "Action" : "Ação"}</th>
                </tr>
              </thead>
              <tbody>
                {query.data.items.map(refund => (
                  <tr key={refund.registration_number}>
                    <th scope="row">{refund.full_name}</th>
                    <td><strong>{refund.registration_number}</strong><small>{refund.tournament_name}</small></td>
                    <td><strong>{formatRefundAmount(refund.amount_owed, language)}</strong><small>{formatRefundDeadline(refund.due_on, language)}</small></td>
                    <td>
                      <button type="button" disabled={query.isFetching} onClick={() => { setNotice(undefined); setSelected(refund); }}
                        aria-label={`${t("Registrar reembolso realizado")} ${refund.registration_number}`}>{t("Registrar reembolso realizado")}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {(offset > 0 || offset + query.data.limit < query.data.total) &&
          <nav className="review-actions" aria-label={t("Reembolsos pendentes")}>
            <button type="button" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - query.data.limit))}>{t("Anterior")}</button>
            <button type="button" disabled={offset + query.data.limit >= query.data.total} onClick={() => setOffset(offset + query.data.limit)}>{t("Próxima")}</button>
          </nav>}
      </>}
  </>;
}
