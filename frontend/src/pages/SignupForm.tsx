import { useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { createSignup, SignupRequestError } from "../lib/tournaments";
import type { SignupCreate, SignupCreated, Tournament } from "../lib/tournaments";
import { registrationCopy } from "../registrationLanguage";
import type { RegistrationCopyKey, RegistrationLanguage } from "../registrationLanguage";

type Props = {
  tournament: Tournament;
  session: Session;
  language?: RegistrationLanguage;
};

type Errors = Record<string, RegistrationCopyKey>;

const requiredDeclarations = [
  ["accepts_regulation", "Li e aceito o regulamento do torneio."],
  ["accepts_data_processing", "Li as informações sobre o tratamento dos dados e a visibilidade de participação e resultados."],
  ["declares_truthful_information", "Declaro que as informações fornecidas são verdadeiras."],
  ["acknowledges_inherent_risks", "Estou ciente dos riscos da esgrima histórica."],
  ["declares_required_equipment", "Declaro possuir o equipamento obrigatório."],
  ["declares_physically_fit", "Declaro estar fisicamente apto para participar."],
  ["accepts_cancellation_policy", "Li as regras de cancelamento, reembolso e desclassificação."],
] as const;

function readSignup(form: HTMLFormElement, accountEmail: string | undefined): { payload: SignupCreate | null; errors: Errors } {
  const data = new FormData(form);
  const value = (key: string) => String(data.get(key) ?? "").trim();
  const optional = (key: string) => value(key) || null;
  const errors: Errors = {};
  const requiredText = [
    "full_name", "birth_date", "document_id", "phone", "city", "country",
    "emergency_contact_name", "emergency_contact_phone",
  ];
  for (const key of requiredText) {
    if (!value(key)) errors[key] = "Campo obrigatório.";
  }
  if (!accountEmail) errors.email = "Entre com uma conta que tenha e-mail.";

  const documentType = value("document_type");
  if (documentType !== "cpf" && documentType !== "passport") {
    errors.document_type = "Escolha o tipo de documento.";
  }
  const duration = optional("hema_practice_duration");
  const year = value("hema_practice_start_year");
  if (!duration && !year) errors.hema_practice_duration = "Informe o tempo de prática ou o ano de início.";
  if (year && (!/^\d+$/.test(year) || Number(year) < 1 || !Number.isSafeInteger(Number(year)))) {
    errors.hema_practice_start_year = "Informe um ano válido.";
  }
  const priorCount = value("prior_tournaments_count");
  if (!/^\d+$/.test(priorCount) || !Number.isSafeInteger(Number(priorCount))) {
    errors.prior_tournaments_count = "Informe zero ou um número inteiro positivo.";
  }

  const handedness = value("handedness");
  if (handedness && !["right", "left", "ambidextrous"].includes(handedness)) {
    errors.handedness = "Escolha uma opção válida.";
  }
  for (const [key] of requiredDeclarations) {
    if (data.get(key) !== "on") errors[key] = "Esta declaração é obrigatória.";
  }
  const imageChoice = value("image_use_authorized");
  if (imageChoice !== "yes" && imageChoice !== "no") {
    errors.image_use_authorized = "Escolha autorizar ou não autorizar.";
  }

  if (Object.keys(errors).length > 0) return { payload: null, errors };

  return {
    errors,
    payload: {
      full_name: value("full_name"),
      social_name: optional("social_name"),
      birth_date: value("birth_date"),
      document_type: documentType as SignupCreate["document_type"],
      document_id: value("document_id"),
      email: accountEmail!.trim(),
      phone: value("phone"),
      city: value("city"),
      state: optional("state"),
      country: value("country"),
      school_name: optional("school_name"),
      responsible_instructor_name: optional("responsible_instructor_name"),
      hema_practice_duration: duration,
      hema_practice_start_year: year ? Number(year) : null,
      prior_tournaments_count: Number(priorCount),
      hema_ratings_ref: optional("hema_ratings_ref"),
      handedness: (handedness || null) as SignupCreate["handedness"],
      special_category_note: optional("special_category_note"),
      emergency_contact_name: value("emergency_contact_name"),
      emergency_contact_phone: value("emergency_contact_phone"),
      declares_truthful_information: true,
      declares_required_equipment: true,
      declares_physically_fit: true,
      accepts_regulation: true,
      accepts_data_processing: true,
      acknowledges_inherent_risks: true,
      accepts_cancellation_policy: true,
      image_use_authorized: imageChoice === "yes",
    },
  };
}

function messageForRequest(error: unknown): RegistrationCopyKey {
  if (error instanceof SignupRequestError) {
    if (error.status === 401) return "Sua sessão expirou. Saia e entre novamente antes de enviar.";
    if (error.status === 400) {
      if (error.detail === "Registration is closed") return "As inscrições estão encerradas. Nenhum dado foi enviado.";
      if (error.detail === "Registration terms are not configured") return "Os termos do torneio ainda não estão configurados.";
      if (error.detail === "Registration email must match account email") return "O e-mail da inscrição precisa corresponder ao da sua conta.";
      return "Não foi possível aceitar a inscrição. Confira os dados e o período de inscrição.";
    }
    if (error.status === 409) {
      return error.detail === "Registration already exists"
        ? "Já existe uma inscrição ativa para esta conta, e-mail ou documento neste torneio."
        : "Não foi possível criar a inscrição por conflito. Tente novamente mais tarde.";
    }
    if (error.status === 422) return "O servidor recusou um ou mais campos ou declarações. Revise o formulário.";
  }
  return "Não foi possível enviar a inscrição agora. Tente novamente mais tarde.";
}

function Field({ name, label, errors, language, type = "text", required = false, placeholder, min }: {
  name: string;
  label: string;
  errors: Errors;
  language: RegistrationLanguage;
  type?: string;
  required?: boolean;
  placeholder?: string;
  min?: string;
}) {
  const error = errors[name];
  return (
    <div className="signup-field">
      <label htmlFor={name}>{label}{required && " *"}</label>
      <input
        id={name} name={name} type={type} required={required} placeholder={placeholder} min={min}
        aria-invalid={Boolean(error)} aria-describedby={error ? `${name}-error` : undefined}
      />
      {error && <span id={`${name}-error`} className="signup-field-error">{registrationCopy(language, error)}</span>}
    </div>
  );
}

function PolicyContent({ label, value, language }: { label: string; value: string | null; language: RegistrationLanguage }) {
  const t = (key: RegistrationCopyKey) => registrationCopy(language, key);
  if (!value) return <p className="signup-policy-missing">{label}: {t("conteúdo ainda não configurado.")}</p>;
  if (/^https?:\/\//i.test(value)) {
    return <a href={value} target="_blank" rel="noopener noreferrer">{t("Consultar")} {label.toLowerCase()}</a>;
  }
  return <details><summary>{t("Consultar")} {label.toLowerCase()}</summary><p>{value}</p></details>;
}

function Success({ result, tournament, language }: { result: SignupCreated; tournament: Tournament; language: RegistrationLanguage }) {
  const t = (key: RegistrationCopyKey) => registrationCopy(language, key);
  const statusText = result.status === "awaiting_payment" ? t("Aguardando pagamento") : result.status;
  return (
    <section className="registration-card signup-success" aria-labelledby="signup-success-title" role="status">
      <p className="registration-eyebrow">{t("Inscrição recebida")}</p>
      <h2 id="signup-success-title">{t("Guarde seu número de inscrição")}</h2>
      <strong className="signup-number">{result.inscription_number}</strong>
      <dl className="signup-success-facts">
        <div><dt>{t("Torneio")}</dt><dd>{tournament.name}</dd></div>
        <div><dt>{t("Participante")}</dt><dd>{result.full_name}</dd></div>
        <div><dt>{t("E-mail")}</dt><dd>{result.email}</dd></div>
        <div><dt>{t("Situação")}</dt><dd>{statusText}</dd></div>
      </dl>
      {result.status === "awaiting_payment" && (
        <p>{t("Próximo passo: acompanhe as instruções de pagamento do torneio. Sua vaga ainda não está confirmada nem reservada.")}</p>
      )}
    </section>
  );
}

export default function SignupForm({ tournament, session, language = "pt" }: Props) {
  const t = (key: RegistrationCopyKey) => registrationCopy(language, key);
  const [errors, setErrors] = useState<Errors>({});
  const [requestError, setRequestError] = useState<RegistrationCopyKey | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<SignupCreated | null>(null);
  const requestPending = useRef(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (requestPending.current) return;
    const { payload, errors: nextErrors } = readSignup(event.currentTarget, session.user.email);
    setErrors(nextErrors);
    setRequestError(null);
    if (!payload) return;

    requestPending.current = true;
    setPending(true);
    try {
      const created = await createSignup(tournament.id, session.access_token, payload);
      setResult(created);
    } catch (error) {
      setRequestError(messageForRequest(error));
    } finally {
      requestPending.current = false;
      setPending(false);
    }
  };

  if (result) return <Success result={result} tournament={tournament} language={language} />;

  return (
    <form className="signup-form" aria-label={t("Formulário de inscrição")} onSubmit={submit} noValidate>
      <div className="registration-card signup-draft-notice">
        <p className="registration-eyebrow">{t("Conteúdo em preparação")}</p>
        <p>{t("Os textos finais das declarações e da privacidade ainda precisam de aprovação. Este formulário não está pronto para inscrições reais.")}</p>
      </div>
      {Object.keys(errors).length > 0 && <p className="signup-error-summary" role="alert">{t("Revise os campos indicados antes de enviar.")}</p>}
      {requestError && <p className="signup-error-summary" role="alert">{t(requestError)}</p>}

      <fieldset className="signup-fieldset" disabled={pending}>
        <section className="registration-card signup-section" aria-labelledby="signup-personal-title">
          <h2 id="signup-personal-title"><span>01</span> {t("Dados pessoais")}</h2>
          <div className="signup-grid">
            <Field name="full_name" label={t("Nome completo")} errors={errors} language={language} required />
            <Field name="social_name" label={t("Nome social (opcional)")} errors={errors} language={language} />
            <div className="signup-field">
              <label htmlFor="email">{t("E-mail da conta")} *</label>
              <input id="email" name="email" type="email" value={session.user.email ?? ""} readOnly aria-invalid={Boolean(errors.email)} />
              {errors.email && <span className="signup-field-error">{t(errors.email)}</span>}
            </div>
            <Field name="phone" label={t("Telefone")} errors={errors} language={language} type="tel" required />
            <div className="signup-field">
              <label htmlFor="document_type">{t("Documento")} *</label>
              <select id="document_type" name="document_type" required aria-invalid={Boolean(errors.document_type)}>
                <option value="">{t("Selecione")}</option><option value="cpf">CPF</option><option value="passport">{t("Passaporte")}</option>
              </select>
              {errors.document_type && <span className="signup-field-error">{t(errors.document_type)}</span>}
            </div>
            <Field name="document_id" label={t("Número do documento")} errors={errors} language={language} required />
            <Field name="birth_date" label={t("Data de nascimento")} errors={errors} language={language} type="date" required />
            <Field name="country" label={t("País")} errors={errors} language={language} required />
            <Field name="city" label={t("Cidade")} errors={errors} language={language} required />
            <Field name="state" label={t("Estado / província (opcional)")} errors={errors} language={language} />
          </div>
          <p className="signup-help">{t("O e-mail da inscrição deve corresponder ao da sua conta.")}</p>
        </section>

        <section className="registration-card signup-section" aria-labelledby="signup-sport-title">
          <h2 id="signup-sport-title"><span>02</span> {t("Sua experiência")}</h2>
          <div className="signup-grid">
            <Field name="hema_practice_duration" label={t("Tempo de prática em HEMA")} errors={errors} language={language} placeholder={t("Ex.: 2 anos")} />
            <Field name="hema_practice_start_year" label={t("Ano de início em HEMA")} errors={errors} language={language} type="number" min="1" />
            <p className="signup-help signup-grid-wide">{t("Informe o tempo de prática, o ano de início ou ambos.")}</p>
            <Field name="prior_tournaments_count" label={t("Torneios anteriores")} errors={errors} language={language} type="number" min="0" required placeholder={t("0 se nunca participou")} />
            <Field name="school_name" label={t("Escola / equipe (opcional)")} errors={errors} language={language} />
            <Field name="responsible_instructor_name" label={t("Instrutor responsável (opcional)")} errors={errors} language={language} />
            <Field name="hema_ratings_ref" label={t("Referência HEMA Ratings (opcional)")} errors={errors} language={language} />
            <div className="signup-field">
              <label htmlFor="handedness">{t("Lateralidade (opcional)")}</label>
              <select id="handedness" name="handedness" aria-invalid={Boolean(errors.handedness)}>
                <option value="">{t("Não informada")}</option><option value="right">{t("Destra")}</option><option value="left">{t("Canhota")}</option><option value="ambidextrous">{t("Ambidestra")}</option>
              </select>
              {errors.handedness && <span className="signup-field-error">{t(errors.handedness)}</span>}
            </div>
            <div className="signup-field signup-grid-wide">
              <label htmlFor="special_category_note">{t("Categoria / caso especial (opcional)")}</label>
              <textarea id="special_category_note" name="special_category_note" rows={3} />
              <span className="signup-help">{t("A equipe confirma a elegibilidade conforme o regulamento.")}</span>
            </div>
          </div>
        </section>

        <section className="registration-card signup-section" aria-labelledby="signup-safety-title">
          <h2 id="signup-safety-title"><span>03</span> {t("Segurança e participação")}</h2>
          <div className="signup-grid">
            <Field name="emergency_contact_name" label={t("Contato de emergência")} errors={errors} language={language} required />
            <Field name="emergency_contact_phone" label={t("Telefone de emergência")} errors={errors} language={language} type="tel" required />
          </div>
          <div className="signup-documents">
            <PolicyContent label={t("Regulamento")} value={tournament.regulation} language={language} />
            <PolicyContent label={t("Política de cancelamento")} value={tournament.cancellation_policy} language={language} />
            {tournament.equipment_requirements && <PolicyContent label={t("Equipamento obrigatório")} value={tournament.equipment_requirements} language={language} />}
          </div>
          <p className="signup-help">{t("Os termos e o regulamento são registrados pelas versões configuradas para este torneio.")}</p>
          <div className="signup-declarations">
            {requiredDeclarations.map(([name, label]) => (
              <div key={name}>
                <label className="signup-choice">
                  <input type="checkbox" name={name} aria-invalid={Boolean(errors[name])} />
                  <span>{t(label)} *</span>
                </label>
                {errors[name] && <span className="signup-field-error">{t(errors[name])}</span>}
              </div>
            ))}
          </div>
          <fieldset className="signup-image-choice">
            <legend>{t("Uso de imagem")} *</legend>
            <label className="signup-choice"><input type="radio" name="image_use_authorized" value="yes" /> {t("Autorizo o uso da minha imagem.")}</label>
            <label className="signup-choice"><input type="radio" name="image_use_authorized" value="no" /> {t("Não autorizo o uso da minha imagem.")}</label>
            {errors.image_use_authorized && <span className="signup-field-error">{t(errors.image_use_authorized)}</span>}
          </fieldset>
        </section>

        <div className="signup-submit-row">
          <button className="signup-submit" type="submit" disabled={pending}>{t(pending ? "Enviando inscrição..." : "Enviar minha inscrição")}</button>
          <p>{t("Ao enviar, você ainda não terá uma vaga confirmada ou reservada.")}</p>
        </div>
      </fieldset>
    </form>
  );
}
