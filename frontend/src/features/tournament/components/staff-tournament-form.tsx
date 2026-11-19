import { useState, type FormEvent } from "react";
import type { AppLanguage } from "@/utils/app-copy";
import { saveStaffTournament, StaffTournamentError, type StaffTournament } from "@/features/tournament/api/staff-tournaments";

type Field = { key: string; pt: string; en: string; type?: string; required?: boolean; multiline?: boolean };
const fields: Field[] = [
  { key: "name", pt: "Nome", en: "Name", required: true },
  { key: "slug", pt: "Identificador", en: "Slug" },
  { key: "description", pt: "Descrição", en: "Description", multiline: true },
  { key: "discipline", pt: "Modalidade", en: "Discipline" },
  { key: "starts_at", pt: "Início", en: "Start", type: "date", required: true },
  { key: "ends_at", pt: "Término", en: "End", type: "date" },
  { key: "location", pt: "Local", en: "Location" },
  { key: "schedule", pt: "Programação", en: "Schedule", multiline: true },
  { key: "competitor_capacity", pt: "Capacidade de participantes", en: "Competitor capacity", type: "number" },
  { key: "registration_opens_on", pt: "Abertura das inscrições", en: "Registration opens", type: "date" },
  { key: "registration_closes_on", pt: "Encerramento das inscrições", en: "Registration closes", type: "date" },
  { key: "payment_due_at", pt: "Prazo de pagamento", en: "Payment deadline", type: "date" },
  { key: "pix_key", pt: "Chave Pix", en: "Pix key" },
  { key: "equipment_requirements", pt: "Equipamento obrigatório", en: "Required equipment", multiline: true },
];
function initialValues(event?: StaffTournament): Record<string, string> {
  return Object.fromEntries(fields.map(field => {
    const value = event?.[field.key];
    if (value == null) return [field.key, ""];
    if (["starts_at", "ends_at", "payment_due_at"].includes(field.key)) {
      const date = new Date(String(value));
      return [field.key, new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10)];
    }
    return [field.key, String(value)];
  }));
}
function saveErrorMessage(error: unknown, en: boolean): string {
  const generic = en ? "Could not save. Check the fields and try again." : "Não foi possível salvar. Confira os campos e tente novamente.";
  if (!(error instanceof StaffTournamentError)) return generic;
  if (error.status === 401 || error.status === 403) return en ? "Access denied. Sign in again with a staff account." : "Acesso negado. Entre novamente com uma conta da equipe.";
  if (error.status === 409) {
    if (error.detail === "Tournament slug already exists") return en ? "This slug is already in use. Choose another identifier." : "Este identificador já está em uso. Escolha outro.";
    if (error.detail === "Capacity cannot be below confirmed participation") return en ? "Capacity cannot be below confirmed participation." : "A capacidade não pode ser menor que o número de participantes confirmados.";
    return en ? "The tournament conflicts with existing data. Check the slug and capacity." : "O torneio apresenta conflito. Confira o identificador e a capacidade.";
  }
  if (error.status !== 422) return generic;
  if (error.detail === "Refunds require a cancellation policy") return en
    ? "Publish a cancellation policy before enabling refunds."
    : "Publique uma política de cancelamento antes de permitir reembolsos.";
  if (Array.isArray(error.detail)) {
    const names = error.detail.flatMap((item: unknown) => {
      if (!item || typeof item !== "object" || !("loc" in item) || !Array.isArray(item.loc)) return [];
      const location: unknown[] = item.loc;
      const field = fields.find(entry => entry.key === location[location.length - 1]);
      if (field?.key === "slug") return [en ? "Slug (use lowercase words separated by single hyphens)" : "Identificador (use palavras minúsculas separadas por hífens simples)"];
      return field ? [en ? field.en : field.pt] : [];
    });
    if (names.length) return (en ? "Check these fields: " : "Confira estes campos: ") + [...new Set(names)].join(", ") + ".";
    return en ? "Check the fields and date order." : "Confira os campos e a ordem das datas.";
  }
  return generic;
}
export function StaffTournamentForm({ token, event, language, onSaved }: { token: string; event?: StaffTournament; language: AppLanguage; onSaved: (saved: StaffTournament) => void }) {
  const [originalValues] = useState(() => initialValues(event));
  const [values, setValues] = useState(originalValues);
  const [internal, setInternal] = useState(event?.is_internal ?? false);
  const [closed, setClosed] = useState(event?.is_registration_closed ?? false);
  const [refundsAllowed, setRefundsAllowed] = useState(event?.refunds_allowed ?? false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const en = language === "en";
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;
    setPending(true); setError(null);
    try {
      const payload: Record<string, unknown> = {
        is_internal: internal, is_registration_closed: closed, refunds_allowed: refundsAllowed,
      };
      for (const field of fields) {
        const value = values[field.key].trim();
        const timestampField = ["starts_at", "ends_at", "payment_due_at"].includes(field.key);
        const time = field.key === "starts_at" ? "00:00:00" : "23:59:59";
        payload[field.key] = !value ? null : timestampField
          ? event && value === originalValues[field.key] ? event[field.key] : new Date(`${value}T${time}`).toISOString()
          : field.key === "competitor_capacity" ? Number(value) : value;
      }
      onSaved(await saveStaffTournament(token, payload, event ? String(event.id) : undefined));
    } catch (caught) {
      setError(caught);
    } finally { setPending(false); }
  }
  return <form className="staff-tournament-form review-card" onSubmit={submit}>
    <p>{en ? "Leave optional fields empty when not configured." : "Deixe os campos opcionais vazios quando não estiverem configurados."}</p>
    <p>{en ? "Event and payment dates use your browser time zone:" : "As datas do evento e do pagamento usam o fuso horário do navegador:"} {Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
    <div className="staff-form-grid">
    {fields.map(field => <label key={field.key} className={field.multiline ? "staff-field-wide" : undefined}>{en ? field.en : field.pt}{" "}
      {field.multiline ? <textarea value={values[field.key]} onChange={e => setValues({ ...values, [field.key]: e.target.value })} /> : <input type={field.type ?? "text"} required={field.required} min={field.type === "number" ? "0" : undefined} value={values[field.key]} onChange={e => setValues({ ...values, [field.key]: e.target.value })} />}
    </label>)}
    </div>
    <div className="staff-tournament-options">
    <label className="review-check"><input type="checkbox" checked={internal} onChange={e => setInternal(e.target.checked)} /> {en ? "Internal tournament" : "Torneio interno"}</label>
    <label className="review-check"><input type="checkbox" checked={closed} onChange={e => setClosed(e.target.checked)} /> {en ? "Registration closed" : "Inscrições encerradas"}</label>
    <label className="review-check"><input type="checkbox" checked={refundsAllowed} disabled={!event} onChange={e => setRefundsAllowed(e.target.checked)} /> {en ? "Allow refunds under the cancellation policy" : "Permitir reembolsos conforme a política de cancelamento"}</label>
    </div>
    {error != null && <p role="alert">{saveErrorMessage(error, en)}</p>}
    <p><button className="staff-primary-button" disabled={pending}>{pending ? (en ? "Saving..." : "Salvando...") : (en ? "Save tournament" : "Salvar torneio")}</button></p>
  </form>;
}
