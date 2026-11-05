import { useState } from "react";
import { usePaymentReviewQueue, PaymentReviewRequestError } from "@/features/tournament/api/payment-reviews";
import { appCopy, type AppLanguage } from "@/utils/app-copy";

export function PaymentReviewQueue({ token, userId, language, onReview }: {
  token: string; userId: string; language: AppLanguage; onReview: (number: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [offset, setOffset] = useState(0);
  const query = usePaymentReviewQueue(token, userId, filter, offset);
  const t = (key: Parameters<typeof appCopy>[1]) => appCopy(language, key);
  if (query.error instanceof PaymentReviewRequestError && query.error.status === 403) return <p role="alert">{t("Acesso restrito à equipe.")}</p>;
  return <>
    <p>{t("Todos os torneios · acesso administrativo")}</p>
    <form className="review-search" onSubmit={event => { event.preventDefault(); setFilter(search.trim()); setOffset(0); }}>
      <label>{t("Buscar inscrição exata")}<input value={search} onChange={event => setSearch(event.target.value)} /></label>
      <button>{t("Buscar")}</button>
      <button type="button" disabled={query.isFetching} onClick={() => void query.refetch()}>{t("Atualizar fila")}</button>
    </form>
    {query.isPending ? <p role="status">{t("Carregando análises...")}</p> : query.isError ? <p role="alert">{t("Não foi possível carregar as análises.")}</p> : <>
      <p>{t("Comprovantes aguardando análise")}: {query.data.total}</p>
      {query.data.items.length === 0 ? <p>{t("Nenhum comprovante pendente.")}</p> : <ul className="review-queue">
        {query.data.items.map(item => <li key={item.registration_number}>
          <div><strong>{item.full_name}</strong><p>{item.registration_number} · {item.tournament_name}</p><small>{t("Enviado em")}: {new Date(item.submitted_at).toLocaleString(language)}</small></div>
          <button onClick={() => onReview(item.registration_number)} aria-label={`${t("Revisar")} ${item.registration_number}`}>{t("Revisar")}</button>
        </li>)}
      </ul>}
      <nav className="review-actions" aria-label={t("Comprovantes aguardando análise")}>
        <button disabled={offset === 0 || query.isFetching} onClick={() => setOffset(Math.max(0, offset - 20))}>{t("Anterior")}</button>
        <span>{offset + (query.data.total ? 1 : 0)}–{Math.min(offset + query.data.items.length, query.data.total)} / {query.data.total}</span>
        <button disabled={offset + 20 >= query.data.total || query.isFetching} onClick={() => setOffset(offset + 20)}>{t("Próxima")}</button>
      </nav>
    </>}
    <p>{t("Abrir uma análise não reserva vagas.")}</p>
  </>;
}
