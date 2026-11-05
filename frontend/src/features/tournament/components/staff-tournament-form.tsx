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
function saveErrorMessage(error: unknown, en: boolean): string {
  const generic = en ? "Could not save. Check the fields and policy links, then try again." : "Não foi possível salvar. Confira os campos e os links das políticas e tente novamente.";
  if (!(error instanceof StaffTournamentError)) return generic;
  if (error.status === 401 || error.status === 403) return en ? "Access denied. Sign in again with a staff account." : "Acesso negado. Entre novamente com uma conta da equipe.";
  if (error.status === 409) {
    if (error.detail === "Tournament slug already exists") return en ? "This slug is already in use. Choose another identifier." : "Este identificador já está em uso. Escolha outro.";
    if (error.detail === "Capacity cannot be below confirmed participation") return en ? "Capacity cannot be below confirmed participation." : "A capacidade não pode ser menor que o número de participantes confirmados.";
    return en ? "The tournament conflicts with existing data. Check the slug and capacity." : "O torneio apresenta conflito. Confira o identificador e a capacidade.";
  }
  if (error.status !== 422) return generic;
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
  const detail = error.detail;
  if (detail === "Policy exceeds 10 MiB") return en ? "A linked policy exceeds 10 MiB. Check the rules and cancellation policy links." : "Uma política vinculada excede 10 MiB. Confira os links do regulamento e da política de cancelamento.";
  if (detail === "Policy must be PDF, plain text or HTML" || detail === "Policy content does not match PDF type" || detail === "Compressed policy responses are not supported") return en ? "A linked policy has an unsupported or invalid format. Use an uncompressed PDF, plain text, or HTML document." : "Uma política vinculada tem formato inválido ou não suportado. Use PDF, texto ou HTML sem compressão.";
  if (typeof detail === "string" && (detail.startsWith("Policy ") || detail === "Invalid policy URL")) return en ? "Could not capture a linked policy. Check both policy links and try again." : "Não foi possível capturar uma política vinculada. Confira os dois links das políticas e tente novamente.";
  return generic;
}
export function StaffTournamentForm({ token, event, language, onSaved }: { token: string; event?: StaffTournament; language: AppLanguage; onSaved: () => void }) {
  const [originalValues] = useState(() => initialValues(event));
  const [values, setValues] = useState(originalValues);
  const [internal, setInternal] = useState(event?.is_internal ?? false);
  const [closed, setClosed] = useState(event?.is_registration_closed ?? false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [invalidTime, setInvalidTime] = useState<string | null>(null);
  const en = language === "en";
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;
    setPending(true); setError(null); setInvalidTime(null);
    try {
      const payload: Record<string, unknown> = { is_internal: internal, is_registration_closed: closed };
      for (const field of fields) {
        const value = values[field.key].trim();
        if (value && field.type === "datetime-local" && !(event && value === originalValues[field.key])) {
          const date = new Date(value);
          const entered = value.length === 16 ? `${value}:00` : value;
          const roundTrip = Number.isNaN(date.getTime()) ? "" : new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
          if (roundTrip !== entered) {
            setInvalidTime(field.key);
            return;
          }
        }
        payload[field.key] = !value ? null : field.type === "datetime-local" ? event && value === originalValues[field.key] ? event[field.key] : new Date(value).toISOString() : field.key === "competitor_capacity" ? Number(value) : value;
      }
      await saveStaffTournament(token, payload, event ? String(event.id) : undefined);
      onSaved();
    } catch (caught) {
      setError(caught);
    } finally { setPending(false); }
  }
  return <form onSubmit={submit}>
    <p>{en ? "Leave optional fields empty when not configured. Saving captures linked policies again." : "Deixe os campos opcionais vazios quando não estiverem configurados. Salvar captura novamente as políticas vinculadas."}</p>
    <p>{en ? "Date and time fields use your browser time zone:" : "Os campos de data e hora usam o fuso horário do navegador:"} {Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
    {fields.map(field => <label key={field.key} style={{ display: "block", margin: "1rem 0" }}>{en ? field.en : field.pt}{" "}
      {field.multiline ? <textarea value={values[field.key]} onChange={e => setValues({ ...values, [field.key]: e.target.value })} /> : <input type={field.type ?? "text"} required={field.required} min={field.type === "number" ? "0" : undefined} step={field.key === "registration_fee_amount" ? "0.01" : field.type === "datetime-local" ? "1" : undefined} value={values[field.key]} onChange={e => setValues({ ...values, [field.key]: e.target.value })} />}
    </label>)}
    <label><input type="checkbox" checked={internal} onChange={e => setInternal(e.target.checked)} /> {en ? "Internal tournament" : "Torneio interno"}</label>{" "}
    <label><input type="checkbox" checked={closed} onChange={e => setClosed(e.target.checked)} /> {en ? "Registration closed" : "Inscrições encerradas"}</label>
    {invalidTime && <p role="alert">{en ? "This local time does not exist. Choose another time for" : "Este horário local não existe. Escolha outro horário para"} {en ? fields.find(field => field.key === invalidTime)?.en : fields.find(field => field.key === invalidTime)?.pt}.</p>}
    {error != null && <p role="alert">{saveErrorMessage(error, en)}</p>}
    <p><button disabled={pending}>{pending ? (en ? "Saving..." : "Salvando...") : (en ? "Save tournament" : "Salvar torneio")}</button></p>
  </form>;
}
