import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { decidePaymentReview, getReviewDocument, PaymentReviewRequestError, usePaymentReview, type ReviewDetail, type ReviewDecision } from "@/features/tournament/api/payment-reviews";
import { appCopy, type AppLanguage, type AppCopyKey } from "@/utils/app-copy";

function ReviewDocument({ token, number, document, language }: {
  token: string; number: string; document: ReviewDetail["documents"][number]; language: AppLanguage;
}) {
  const t = (key: AppCopyKey) => appCopy(language, key);
  const link = useMutation({ mutationFn: () => getReviewDocument(token, number, document.id) });
  return <li>
    <strong>{document.original_file_name}</strong> · #{document.id}
    <p>{document.content_type} · {Math.ceil(document.size_bytes / 1024)} KB · {new Date(document.submitted_at).toLocaleString(language)}</p>
    <button disabled={link.isPending} onClick={() => link.mutate()}>{t(link.isPending ? "Preparando link..." : link.data ? "Renovar link" : "Abrir documento")}</button>
    {link.isError && <p role="alert">{t(link.error instanceof PaymentReviewRequestError && link.error.status === 403 ? "Acesso restrito à equipe." : "Não foi possível abrir o documento. Tente novamente.")}</p>}
    {link.data && !link.isError && !link.isPending && <a data-sentry-block href={link.data.download_url} target="_blank" rel="noopener noreferrer">{t("Consultar documento")} · {document.original_file_name}</a>}
  </li>;
}

export function PaymentReviewPanel({ token, userId, number, language }: {
  token: string; userId: string; number: string; language: AppLanguage;
}) {
  const query = usePaymentReview(token, userId, number);
  const t = (key: AppCopyKey) => appCopy(language, key);
  if (query.isPending) return <p role="status">{t("Carregando análises...")}</p>;
  if (query.isError && (!query.data || (query.error instanceof PaymentReviewRequestError && [403, 404].includes(query.error.status)))) return <>
    <p role="alert">{t(query.error instanceof PaymentReviewRequestError && query.error.status === 403 ? "Acesso restrito à equipe." : query.error instanceof PaymentReviewRequestError && query.error.status === 404 ? "Análise não encontrada." : "Não foi possível carregar as análises.")}</p>
    <button onClick={() => void query.refetch()}>{t("Tentar novamente")}</button>
  </>;
  if (!query.data) return null;
  return <>{query.isError && <p role="alert">{t("Não foi possível carregar as análises.")}</p>}<ReviewForm key={number} detail={query.data} token={token} language={language} reload={async () => { const result = await query.refetch(); return result.isError ? undefined : result.data; }} /></>;
}

function ReviewForm({ detail, token, language, reload }: {
  detail: ReviewDetail; token: string; language: AppLanguage; reload: () => Promise<ReviewDetail | undefined>;
}) {
  const t = (key: AppCopyKey) => appCopy(language, key);
  const client = useQueryClient();
  const [documentId, setDocumentId] = useState(detail.latest_document_id);
  const [amount, setAmount] = useState("");
  const [received, setReceived] = useState(false);
  const [requirements, setRequirements] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<AppCopyKey | null>(null);
  const [stale, setStale] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshed, setRefreshed] = useState(false);
  const [openedAt] = useState(() => Date.now());
  const mutation = useMutation({
    mutationFn: (payload: ReviewDecision) => decidePaymentReview(token, detail.registration.registration_number, payload),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["payment-reviews"] });
      void client.invalidateQueries({ queryKey: ["tournaments", detail.registration.tournament_id] });
    },
    onError: failure => {
      if (failure instanceof PaymentReviewRequestError && failure.status === 409) setStale(true);
      else setError("Não foi possível registrar a análise. Confira os dados e tente novamente.");
    },
  });
  const r = detail.registration;
  const forbidden = mutation.error instanceof PaymentReviewRequestError && mutation.error.status === 403;
  const changed = stale || documentId !== detail.latest_document_id;
  const reviewable = r.registration_status === "awaiting_payment_confirmation" && documentId !== null && !detail.reviews.some(review => review.document_id === documentId);
  const busy = mutation.isPending || refreshing;
  const yes = (value: boolean) => t(value ? "Sim" : "Não");
  const fact = (label: AppCopyKey, value: string | number | null) => <div><dt>{t(label)}</dt><dd>{value ?? t("Não informado")}</dd></div>;
  const money = (value: string | number | null) => value === null ? t("A confirmar") : new Intl.NumberFormat(language, { style: "currency", currency: "BRL" }).format(Number(value));
  async function refresh() {
    setRefreshing(true);
    const current = await reload();
    setRefreshing(false);
    if (current) {
      setDocumentId(current.latest_document_id); setStale(false); setReceived(false); setRequirements(false); setError(null); setRefreshed(true);
    }
  }
  function submit(decision: "approved" | "rejected") {
    if (busy || changed || !reviewable || documentId === null) return;
    setError(null); setRefreshed(false);
    if (decision === "approved") {
      const normalized = amount.trim().replace(",", ".");
      if (!/^\d{1,10}(\.\d{1,2})?$/.test(normalized) || Number(normalized) > 9999999999.99) { setError("Informe um valor válido, não negativo, com até duas casas decimais."); return; }
      if (!received || !requirements) { setError("Confira o recebimento e os requisitos antes de aprovar."); return; }
      mutation.mutate({ document_id: documentId, decision, amount_received: normalized, requirements_checked: true });
    } else {
      if (!reason.trim()) { setError("Informe o motivo da recusa."); return; }
      mutation.mutate({ document_id: documentId, decision, rejection_reason: reason.trim() });
    }
  }
  if (forbidden) return <p role="alert">{t("Acesso restrito à equipe.")}</p>;
  return <>
    <h2>{r.full_name}</h2><p>{r.registration_number} · {detail.tournament_name}</p>
    {mutation.data && <section role="status" className="review-notice">
      <h2>{t("Análise registrada.")}</h2>
      <p>{t(mutation.data.registration_status === "confirmed" ? "Participação confirmada." : mutation.data.registration_status === "waitlist" ? "Pagamento aprovado. Lista de espera, sem vaga confirmada." : "Comprovante rejeitado. Aguardando novo envio.")}</p>
      {mutation.data.notification_result === "sent" && <p>{t("E-mail enviado.")}</p>}
      {!["sent", "not_required"].includes(mutation.data.notification_result) && <p>{t("A análise foi registrada, mas o e-mail não foi enviado.")}</p>}
    </section>}
    <div className="review-columns"><div>
      <section className="review-card"><h2>{t("Comprovante mais recente")}</h2>
        <ul className="review-documents">{detail.documents.filter(doc => doc.id === detail.latest_document_id).map(doc => <ReviewDocument key={doc.id} token={token} number={r.registration_number} document={doc} language={language} />)}</ul>
        {!detail.latest_document_id && <p>{t("Nenhum documento disponível.")}</p>}
        <h3>{t("Termo do responsável")}</h3>
        <ul className="review-documents">{detail.documents.filter(doc => doc.document_type === "parental_consent_form").map(doc => <ReviewDocument key={doc.id} token={token} number={r.registration_number} document={doc} language={language} />)}</ul>
        <details><summary>{t("Histórico de documentos")}</summary><ul className="review-documents">{detail.documents.filter(doc => doc.document_type === "payment_proof" && doc.id !== detail.latest_document_id).map(doc => <ReviewDocument key={doc.id} token={token} number={r.registration_number} document={doc} language={language} />)}</ul></details>
      </section>
      <section className="review-card"><h2>{t("Dados e elegibilidade")}</h2><dl>
        {fact("Nome completo", r.full_name)}{fact("Data de nascimento", r.birth_date)}{fact("Equipe", r.school_or_team_name)}{fact("Instrutor responsável (opcional)", r.instructor_name)}
        {fact("Experiência HEMA", r.hema_experience_description)}{fact("Ano de início", r.hema_started_year)}{fact("Torneios anteriores", r.previous_tournament_count)}{fact("Categoria / caso especial", r.category_or_eligibility_note)}
        {fact("Equipamento obrigatório", detail.equipment_requirements)}{fact("Declara equipamento obrigatório", yes(r.declares_has_required_equipment))}{fact("Declara aptidão física", yes(r.declares_physically_fit))}{fact("Aceitou o regulamento", yes(r.accepts_rules))}
      </dl><p>{t("Confira a documentação aplicável pela data de nascimento. Para menores, confira o termo assinado. No evento, confira os documentos e o acompanhamento do responsável.")}</p>
        <details><summary>{t("Dados restritos")}</summary><dl>{fact("Documento", `${r.identity_document_type}: ${r.identity_document_number}`)}{fact("Nota de segurança", r.staff_safety_note)}</dl></details>
      </section>
      <section className="review-card"><h2>{t("Histórico de análise dos comprovantes")}</h2><ul>{detail.reviews.map(review => <li key={review.id}>
        {t(review.decision === "approved" ? "Aprovado" : "Rejeitado")} · {t("Documento analisado")} #{review.document_id} · {new Date(review.reviewed_at).toLocaleString(language)}
        <p>{t("Responsável")}: {review.reviewed_by_user_id}</p>{review.rejection_reason && <p>{review.rejection_reason}</p>}
      </li>)}</ul></section>
    </div><aside className="review-card"><h2>{t("Conferência do pagamento")}</h2><dl>
      {fact("Valor da inscrição", money(detail.registration_fee_amount))}{fact("Prazo para pagamento", detail.payment_due_at ? new Date(detail.payment_due_at).toLocaleString(language) : null)}
      {fact("Confirmados", detail.confirmed_count)}{fact("Capacidade", detail.competitor_capacity ?? t("Sem limite"))}
    </dl><p>{t("A capacidade será conferida novamente ao salvar.")}</p>
      {detail.competitor_capacity !== null && detail.confirmed_count >= detail.competitor_capacity && <p className="review-notice">{t("Sem vaga disponível. Aprovar inclui na lista de espera, sem confirmar vaga.")}</p>}
      {detail.payment_due_at && Date.parse(detail.payment_due_at) < openedAt && <p>{t("O prazo passou. A equipe ainda pode analisar. Rejeitar comprovante não cancela participação nem registra reembolso.")}</p>}
      {changed && !mutation.data && <p role="alert">{t("O comprovante ou a análise mudou. Atualize e confira a evidência antes de tentar novamente.")}</p>}
      {!mutation.data && <button disabled={busy} onClick={() => void refresh()}>{t("Atualizar análise")}</button>}
      {refreshed && <p role="status">{t("Atualização concluída. Confira o comprovante novamente.")}</p>}
      {!mutation.data && (reviewable ? <fieldset disabled={busy || changed}>
        <legend>{t("Documento analisado")} #{documentId}</legend>
        <label>{t("Valor recebido (BRL)")}<input inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} /></label>
        <p>{t("Informe o valor real recebido, mesmo se diferente da inscrição.")}</p>
        <label className="review-check"><input type="checkbox" checked={received} onChange={event => setReceived(event.target.checked)} />{t("Conferi o recebimento e o valor do pagamento.")}</label>
        <label className="review-check"><input type="checkbox" checked={requirements} onChange={event => setRequirements(event.target.checked)} />{t("Conferi os requisitos de participação e a documentação aplicável.")}</label>
        <button onClick={() => submit("approved")}>{t("Aprovar pagamento")}</button>
        <label>{t("Motivo da recusa")}<textarea value={reason} onChange={event => setReason(event.target.value)} /></label>
        <p>{t("O motivo será mostrado ao participante e enviado por e-mail.")}</p>
        <button className="review-reject" onClick={() => submit("rejected")}>{t("Recusar comprovante e solicitar novo envio")}</button>
      </fieldset> : <p>{t("Esta evidência já foi decidida ou não está em análise.")}</p>)}
      {busy && <p role="status">{t(refreshing ? "Carregando análises..." : "Registrando análise...")}</p>}{error && <p role="alert">{t(error)}</p>}
    </aside></div>
  </>;
}
