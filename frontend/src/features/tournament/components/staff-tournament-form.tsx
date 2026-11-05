import { useState, type FormEvent } from "react";
import type { AppLanguage } from "@/utils/app-copy";
import { saveStaffTournament, StaffTournamentError, type StaffTournament } from "@/features/tournament/api/staff-tournaments";

type Field = { key: string; pt: string; en: string; type?: string; required?: boolean; multiline?: boolean };
const fields: Field[] = [
  { key: "name", pt: "Nome", en: "Name", required: true },
  { key: "slug", pt: "Identificador", en: "Slug" },
  { key: "description", pt: "Descrição", en: "Description", multiline: true },
  { key: "discipline", pt: "Modalidade", en: "Discipline" },
  { key: "starts_at", pt: "Início", en: "Start", type: "datetime-local", required: true },
  { key: "ends_at", pt: "Término", en: "End", type: "datetime-local" },
  { key: "location", pt: "Local", en: "Location" },
  { key: "schedule", pt: "Programação", en: "Schedule", multiline: true },
  { key: "competitor_capacity", pt: "Capacidade de participantes", en: "Competitor capacity", type: "number" },
  { key: "registration_opens_on", pt: "Abertura das inscrições", en: "Registration opens", type: "date" },
  { key: "registration_closes_on", pt: "Encerramento das inscrições", en: "Registration closes", type: "date" },
  { key: "registration_fee_amount", pt: "Valor da inscrição (BRL)", en: "Registration fee (BRL)", type: "number" },
  { key: "payment_due_at", pt: "Prazo de pagamento", en: "Payment deadline", type: "datetime-local" },
  { key: "pix_key", pt: "Chave Pix", en: "Pix key" },
  { key: "rules_text", pt: "Texto do regulamento", en: "Rules text", multiline: true },
  { key: "rules_url", pt: "Link do regulamento", en: "Rules URL", type: "url" },
  { key: "rules_version", pt: "Versão do regulamento", en: "Rules version" },
  { key: "terms_version", pt: "Versão dos termos", en: "Terms version" },
  { key: "equipment_requirements", pt: "Equipamento obrigatório", en: "Required equipment", multiline: true },
  { key: "cancellation_policy_text", pt: "Política de cancelamento", en: "Cancellation policy", multiline: true },
  { key: "cancellation_policy_url", pt: "Link da política de cancelamento", en: "Cancellation policy URL", type: "url" },
];
function initialValues(event?: StaffTournament): Record<string, string> {
  return Object.fromEntries(fields.map(field => {
    const value = event?.[field.key];
    if (value == null) return [field.key, ""];
    if (field.type === "datetime-local") {
      const date = new Date(String(value));
      return [field.key, new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 19)];
    }
    return [field.key, String(value)];
  }));
}
export function StaffTournamentForm({ token, event, language, onSaved }: { token: string; event?: StaffTournament; language: AppLanguage; onSaved: () => void }) {
  const [values, setValues] = useState(() => initialValues(event));
  const [internal, setInternal] = useState(event?.is_internal ?? false);
  const [closed, setClosed] = useState(event?.is_registration_closed ?? false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const en = language === "en";
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;
    setPending(true); setError("");
    try {
      const payload: Record<string, unknown> = { is_internal: internal, is_registration_closed: closed };
      for (const field of fields) {
        const value = values[field.key].trim();
        payload[field.key] = !value ? null : field.type === "datetime-local" ? new Date(value).toISOString() : field.key === "competitor_capacity" ? Number(value) : value;
      }
      await saveStaffTournament(token, payload, event ? String(event.id) : undefined);
      onSaved();
    } catch (caught) {
      const status = caught instanceof StaffTournamentError ? caught.status : 0;
      setError(status === 401 || status === 403 ? (en ? "Access denied. Sign in again with a staff account." : "Acesso negado. Entre novamente com uma conta da equipe.") : status === 409 ? (en ? "The slug is already in use or capacity is below confirmed participation." : "O identificador já está em uso ou a capacidade é menor que o número de participantes confirmados.") : status === 422 ? (en ? "Check the fields, dates, and policy links." : "Confira os campos, as datas e os links das políticas.") : (en ? "Could not save. Check policy links and try again." : "Não foi possível salvar. Confira os links das políticas e tente novamente."));
    } finally { setPending(false); }
  }
  return <form onSubmit={submit}>
    <p>{en ? "Leave optional fields empty when not configured. Saving captures linked policies again." : "Deixe os campos opcionais vazios quando não estiverem configurados. Salvar captura novamente as políticas vinculadas."}</p>
    {fields.map(field => <label key={field.key} style={{ display: "block", margin: "1rem 0" }}>{en ? field.en : field.pt}{" "}
      {field.multiline ? <textarea value={values[field.key]} onChange={e => setValues({ ...values, [field.key]: e.target.value })} /> : <input type={field.type ?? "text"} required={field.required} min={field.type === "number" ? "0" : undefined} step={field.key === "registration_fee_amount" ? "0.01" : field.type === "datetime-local" ? "1" : undefined} value={values[field.key]} onChange={e => setValues({ ...values, [field.key]: e.target.value })} />}
    </label>)}
    <label><input type="checkbox" checked={internal} onChange={e => setInternal(e.target.checked)} /> {en ? "Internal tournament" : "Torneio interno"}</label>{" "}
    <label><input type="checkbox" checked={closed} onChange={e => setClosed(e.target.checked)} /> {en ? "Registration closed" : "Inscrições encerradas"}</label>
    {error && <p role="alert">{error}</p>}
    <p><button disabled={pending}>{pending ? (en ? "Saving..." : "Salvando...") : (en ? "Save tournament" : "Salvar torneio")}</button></p>
  </form>;
}
