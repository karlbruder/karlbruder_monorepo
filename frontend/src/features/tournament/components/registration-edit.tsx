import { useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { RegistrationRequestError, updateRegistrationDetails } from "@/features/tournament/api/tournaments";
import { cancelRegistration } from "@/features/tournament/api/registration-refunds";
import { RegistrationTags } from "@/features/tournament/components/tournament-tags";
import type { OwnerRegistration, Tournament } from "@/features/tournament/api/tournaments";
import { legalRoutes } from "@/config/legal-routes";
import type { AppLanguage } from "@/utils/app-copy";

type Field = { key: string; pt: string; en: string; type?: string; required?: boolean };
const personal: Field[] = [
  { key: "full_name", pt: "Nome completo", en: "Full name", required: true },
  { key: "social_name", pt: "Nome social", en: "Social name" },
  { key: "email", pt: "E-mail da inscrição", en: "Registration email", type: "email", required: true },
  { key: "phone", pt: "Telefone", en: "Phone", required: true },
  { key: "identity_document_number", pt: "Número do documento", en: "Document number", required: true },
  { key: "birth_date", pt: "Data de nascimento", en: "Date of birth", type: "date", required: true },
  { key: "country", pt: "País", en: "Country", required: true },
  { key: "city", pt: "Cidade", en: "City", required: true },
  { key: "state_or_province", pt: "Estado / província", en: "State / province" },
];
const experience: Field[] = [
  { key: "hema_experience_description", pt: "Tempo de prática em HEMA", en: "HEMA practice duration" },
  { key: "hema_started_year", pt: "Ano de início em HEMA", en: "HEMA start year", type: "number" },
  { key: "previous_tournament_count", pt: "Torneios anteriores", en: "Previous tournaments", type: "number", required: true },
  { key: "school_or_team_name", pt: "Escola / equipe", en: "School / team" },
  { key: "instructor_name", pt: "Instrutor responsável", en: "Instructor" },
  { key: "hema_ratings_reference", pt: "Referência HEMA Ratings", en: "HEMA Ratings reference" },
  { key: "category_or_eligibility_note", pt: "Categoria / caso especial", en: "Category / special case" },
];
const emergency: Field[] = [
  { key: "emergency_contact_name", pt: "Contato de emergência", en: "Emergency contact", required: true },
  { key: "emergency_contact_phone", pt: "Telefone de emergência", en: "Emergency contact phone", required: true },
];
const allFields = [...personal, ...experience, ...emergency];

export function RegistrationEdit({ registration, tournament, session, language, onBack, onSaved, staff = false }: {
  registration: OwnerRegistration; tournament: Tournament; session: Session; language: AppLanguage;
  onBack: () => void; onSaved: () => void; staff?: boolean;
}) {
  const en = language === "en";
  const record = registration as unknown as Record<string, unknown>;
  const [values, setValues] = useState(() => Object.fromEntries([...allFields.map(field => field.key), "identity_document_type", "handedness"].map(key => [key, String(record[key] ?? "")])));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelPending, setCancelPending] = useState(false);
  const [cancelError, setCancelError] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const today = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const tagsClosed = tournament.is_registration_closed || !tournament.registration_opens_on || !tournament.registration_closes_on || today < tournament.registration_opens_on || today > tournament.registration_closes_on;
  function field(item: Field) {
    return <div className="registration-field" key={item.key}><label htmlFor={`edit-${item.key}`}>{en ? item.en : item.pt}{item.required ? " *" : ""}</label><input id={`edit-${item.key}`} type={item.type ?? "text"} min={item.type === "number" ? (item.key === "hema_started_year" ? 1 : 0) : undefined} required={item.required} value={values[item.key]} onChange={event => { setSaved(false); setValues(current => ({ ...current, [item.key]: event.target.value })); }} /></div>;
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (pending) return;
    if (!values.hema_experience_description.trim() && !values.hema_started_year) { setError(en ? "Enter your practice duration or start year." : "Informe o tempo de prática ou o ano de início."); return; }
    setPending(true); setError(""); setSaved(false);
    const payload: Record<string, string | number | null> = {};
    for (const item of allFields) {
      const value = values[item.key].trim();
      payload[item.key] = !value ? null : item.type === "number" ? Number(value) : value;
    }
    payload.identity_document_type = values.identity_document_type;
    payload.handedness = values.handedness || null;
    try {
      await updateRegistrationDetails(tournament.id, registration.registration_number, session.access_token, payload);
      setSaved(true); onSaved();
    } catch (caught) { setError(caught instanceof RegistrationRequestError && caught.status === 409 ? (en ? "This information conflicts with another registration, or this registration is closed." : "Estes dados entram em conflito com outra inscrição, ou a inscrição está encerrada.") : (en ? "Could not save the registration details. Check the fields and try again." : "Não foi possível salvar os dados da inscrição. Confira os campos e tente novamente.")); }
    finally { setPending(false); }
  }
  async function cancel() {
    if (cancelPending) return;
    setCancelPending(true); setCancelError(false);
    try {
      await cancelRegistration(session.access_token, tournament.id, registration.registration_number);
      setCancelled(true); setConfirmCancel(false); onSaved();
    } catch {
      setCancelError(true); onSaved();
    } finally { setCancelPending(false); }
  }
  return <div className="registration-edit"><button type="button" onClick={onBack}>← {staff ? (en ? "Tournament athletes" : "Atletas do torneio") : (en ? "Registration status" : "Acompanhar inscrição")}</button><h2>{staff ? (en ? "Manage registration" : "Gerenciar inscrição") : (en ? "My registration details" : "Meus dados da inscrição")}</h2>{staff && <p>{registration.full_name} · {registration.registration_number}</p>}<p>{en ? "Corrections keep the same owner, tournament and registration number." : "Correções mantêm o mesmo titular, torneio e número."}</p><p>{registration.product_name && <>{en ? "Registration type" : "Tipo de inscrição"}: {registration.product_name}</>}</p>
    {staff && registration.parental_consent_required && !cancelled && <p className="registration-notice" role="status">{en ? "Signed parental consent form missing. Verify before participation." : "Termo de responsabilidade assinado pendente. Verifique antes da participação."}</p>}
    {staff && <section className="registration-card"><h3>{en ? "Participation" : "Participação"}</h3>
      {cancelled || registration.registration_status === "cancelled" ? <p role="status">{en ? "Registration cancelled." : "Inscrição cancelada."}</p> : confirmCancel ? <>
        <p>{en ? "Cancellation ends participation and releases any occupied seat immediately." : "O cancelamento encerra a participação e libera qualquer vaga ocupada imediatamente."}</p>
        <p>{tournament.refunds_allowed ? (en ? "A verified payment creates a refund obligation." : "Um pagamento verificado gera uma obrigação de reembolso.") : (en ? "This tournament does not allow refunds." : "Este torneio não permite reembolsos.")}</p>
        {cancelError && <p role="alert">{en ? "Could not cancel the registration. Refresh and try again." : "Não foi possível cancelar a inscrição. Atualize e tente novamente."}</p>}
        <button type="button" className="registration-danger" disabled={cancelPending} onClick={() => void cancel()}>{en ? "Confirm cancellation" : "Confirmar cancelamento"}</button>{" "}<button type="button" disabled={cancelPending} onClick={() => { setConfirmCancel(false); setCancelError(false); }}>{en ? "Keep registration" : "Manter inscrição"}</button>
      </> : <button type="button" className="registration-danger" onClick={() => setConfirmCancel(true)}>{en ? "Cancel participation" : "Cancelar participação"}</button>}
    </section>}
    <form onSubmit={submit}>
      <section className="registration-card"><h3>{en ? "Personal details" : "Dados pessoais"}</h3><div className="registration-grid">{personal.map(field)}<div className="registration-field"><label htmlFor="edit-document">{en ? "Identity document" : "Documento"} *</label><select id="edit-document" value={values.identity_document_type} onChange={event => setValues(current => ({ ...current, identity_document_type: event.target.value }))}><option value="cpf">CPF</option><option value="passport">{en ? "Passport" : "Passaporte"}</option></select></div></div></section>
      <section className="registration-card"><h3>{en ? "Experience and team" : "Experiência e equipe"}</h3><div className="registration-grid">{experience.map(field)}<div className="registration-field"><label htmlFor="edit-handedness">{en ? "Handedness" : "Lateralidade"}</label><select id="edit-handedness" value={values.handedness} onChange={event => setValues(current => ({ ...current, handedness: event.target.value }))}><option value="">{en ? "Not specified" : "Não informada"}</option><option value="right">{en ? "Right" : "Destra"}</option><option value="left">{en ? "Left" : "Canhota"}</option><option value="ambidextrous">{en ? "Ambidextrous" : "Ambidestra"}</option></select></div></div></section>
      <section className="registration-card"><h3>{en ? "Emergency contact" : "Contato de emergência"}</h3><div className="registration-grid">{emergency.map(field)}</div></section>
      {error && <p role="alert">{error}</p>}{saved && <p role="status">{en ? "Registration details saved." : "Dados da inscrição salvos."}</p>}
      <button className="registration-submit" type="submit" disabled={pending}>{en ? "Save changes" : "Salvar alterações"}</button>
    </form>
    <RegistrationTags token={session.access_token} userId={session.user.id} tournamentId={tournament.id} number={registration.registration_number} language={language} staff={staff} closed={!staff && tagsClosed} />
    {!staff && <details className="registration-card"><summary>{en ? "Review my declarations" : "Rever minhas declarações"}</summary><p>{en ? "Your recorded declarations remain attached to this registration." : "Suas declarações registradas permanecem vinculadas a esta inscrição."}</p><ul>{[
      ["declares_truthful_information", "Informações verdadeiras", "Truthful information"],
      ["declares_has_required_equipment", "Equipamento obrigatório", "Required equipment"],
      ["declares_physically_fit", "Aptidão física", "Physical fitness"],
      ["accepts_rules", "Regulamento", "Tournament rules"],
      ["accepts_data_processing", "Tratamento de dados", "Data processing"],
      ["acknowledges_inherent_risks", "Ciência dos riscos", "Acknowledgment of risks"],
      ["accepts_cancellation_policy", "Política de cancelamento", "Cancellation policy"],
     ].map(([key, pt, english]) => <li key={key}>{en ? english : pt}: {record[key] ? (en ? "Accepted" : "Aceita") : (en ? "Not accepted" : "Não aceita")}</li>)}</ul>
      <p>{en ? "If your circumstances change or you have questions about your declarations, contact the organizers at " : "Se suas circunstâncias mudarem ou você tiver dúvidas sobre suas declarações, entre em contato com a organização: "}<a href="mailto:suporte@karlbruder.com">suporte@karlbruder.com</a>.</p>
      <p>{en ? "For requests about personal data, see the " : "Para solicitações sobre dados pessoais, consulte a "}<a href={legalRoutes.privacy}>{en ? "Privacy Policy" : "Política de Privacidade"}</a>.</p>
    </details>}
  </div>;
}
