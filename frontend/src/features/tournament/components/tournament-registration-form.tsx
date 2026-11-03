import { useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  createSignup,
  requestParentalTermUploadUrl,
  SignupRequestError,
  uploadFileToPresignedUrl,
} from "@/features/tournament/api/tournaments";
import type { SignupCreate, SignupCreated, Tournament } from "@/features/tournament/api/tournaments";
import { isMinorAtTournamentStart } from "@/features/tournament/utils/is-minor-at-tournament-start";
import { validateParentalTermFile } from "@/features/tournament/utils/validate-parental-term-file";
import { appCopy } from "@/utils/app-copy";
import type { AppCopyKey, AppLanguage } from "@/utils/app-copy";

type Props = {
  tournament: Tournament;
  session: Session;
  language?: AppLanguage;
};

type Errors = Record<string, AppCopyKey>;

const requiredDeclarations = [
  ["accepts_regulation", "Li e aceito o regulamento do torneio."],
  ["accepts_data_processing", "Li as informações sobre o tratamento dos dados e a visibilidade de participação e resultados."],
  ["declares_truthful_information", "Declaro que as informações fornecidas são verdadeiras."],
  ["acknowledges_inherent_risks", "Estou ciente dos riscos da esgrima histórica."],
  ["declares_required_equipment", "Declaro possuir o equipamento obrigatório."],
  ["declares_physically_fit", "Declaro estar fisicamente apto para participar."],
  ["accepts_cancellation_policy", "Li as regras de cancelamento, reembolso e desclassificação."],
] as const;

function readSignup(
  form: HTMLFormElement,
  accountEmail: string | undefined,
  tournamentStartsAt: string,
  birthDateFallback = "",
): { payload: SignupCreate | null; errors: Errors; parentalTermFile: File | null } {
  const data = new FormData(form);
  const value = (key: string) => String(data.get(key) ?? "").trim();
  const optional = (key: string) => value(key) || null;
  const errors: Errors = {};
  const requiredText = [
    "full_name", "birth_date", "document_id", "phone", "city", "country",
    "emergency_contact_name", "emergency_contact_phone",
  ];
  for (const key of requiredText) {
    if (key === "birth_date") continue;
    if (!value(key)) errors[key] = "Campo obrigatório.";
  }
  const birthDate = value("birth_date") || birthDateFallback.trim();
  if (!birthDate) errors.birth_date = "Campo obrigatório.";
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

  const needsParentalTerm = Boolean(birthDate) && isMinorAtTournamentStart(birthDate, tournamentStartsAt);
  let parentalTermFile: File | null = null;
  if (needsParentalTerm) {
    const fileInput = form.elements.namedItem("parental_term");
    const fileFromInput =
      fileInput instanceof HTMLInputElement && fileInput.files && fileInput.files.length > 0
        ? fileInput.files[0]
        : null;
    const fileFromFormData = data.get("parental_term");
    const resolvedFile =
      fileFromInput && fileFromInput.size > 0
        ? fileFromInput
        : fileFromFormData instanceof File && fileFromFormData.size > 0
          ? fileFromFormData
          : null;
    if (!resolvedFile) {
      errors.parental_term = "Envie o termo de responsabilidade assinado em PDF ou imagem (JPEG ou PNG).";
    } else {
      parentalTermFile = resolvedFile;
    }
  }

  if (Object.keys(errors).length > 0) return { payload: null, errors, parentalTermFile: null };

  return {
    errors,
    parentalTermFile,
    payload: {
      full_name: value("full_name"),
      social_name: optional("social_name"),
      birth_date: birthDate,
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

function messageForRequest(error: unknown): AppCopyKey {
  if (error instanceof SignupRequestError) {
    if (error.status === 401) return "Sua sessão expirou. Saia e entre novamente antes de enviar.";
    if (error.status === 413) {
      return "O servidor recusou o termo por tamanho. Use um arquivo de até 10 MB.";
    }
    if (error.status === 415) {
      return "O servidor recusou o termo de responsabilidade. Envie PDF, JPEG ou PNG de até 10 MB.";
    }
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
  language: AppLanguage;
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
      {error && <span id={`${name}-error`} className="signup-field-error">{appCopy(language, error)}</span>}
    </div>
  );
}

function PolicyContent({ label, value, language }: { label: string; value: string | null; language: AppLanguage }) {
  const t = (key: AppCopyKey) => appCopy(language, key);
  if (!value) return <p className="signup-policy-missing">{label}: {t("conteúdo ainda não configurado.")}</p>;
  if (/^https?:\/\//i.test(value)) {
    return <a href={value} target="_blank" rel="noopener noreferrer">{t("Consultar")} {label.toLowerCase()}</a>;
  }
  return <details><summary>{t("Consultar")} {label.toLowerCase()}</summary><p>{value}</p></details>;
}

function Success({ result, tournament, language }: { result: SignupCreated; tournament: Tournament; language: AppLanguage }) {
  const t = (key: AppCopyKey) => appCopy(language, key);
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

export default function TournamentRegistrationForm({ tournament, session, language = "pt" }: Props) {
  const t = (key: AppCopyKey) => appCopy(language, key);
  const [errors, setErrors] = useState<Errors>({});
  const [requestError, setRequestError] = useState<AppCopyKey | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<SignupCreated | null>(null);
  const [birthDateForDisplay, setBirthDateForDisplay] = useState("");
  const requestPending = useRef(false);

  const showParentalTermField = Boolean(birthDateForDisplay)
    && isMinorAtTournamentStart(birthDateForDisplay, tournament.starts_at);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (requestPending.current) return;
    const { payload, errors: nextErrors, parentalTermFile } = readSignup(
      event.currentTarget,
      session.user.email,
      tournament.starts_at,
      birthDateForDisplay,
    );
    setErrors(nextErrors);
    setRequestError(null);
    if (!payload) return;

    if (parentalTermFile) {
      const clientFileError = await validateParentalTermFile(parentalTermFile);
      if (clientFileError) {
        setErrors(previous => ({ ...previous, parental_term: clientFileError }));
        return;
      }
    }

    requestPending.current = true;
    setPending(true);
    try {
      let signupPayload = payload;
      if (parentalTermFile) {
        const uploadInfo = await requestParentalTermUploadUrl(tournament.id, session.access_token);
        await uploadFileToPresignedUrl(
          uploadInfo.upload_url,
          parentalTermFile,
          uploadInfo.required_headers,
        );
        signupPayload = {
          ...payload,
          parental_term_storage_key: uploadInfo.storage_key,
          parental_term_original_file_name: parentalTermFile.name,
        };
      }
      const created = await createSignup(tournament.id, session.access_token, signupPayload);
      setResult(created);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("presigned-upload-")) {
        setRequestError("Não foi possível enviar o termo de responsabilidade. Tente novamente.");
      } else if (error instanceof Error && error.message.startsWith("http-")) {
        setRequestError("Não foi possível enviar o termo de responsabilidade. Tente novamente.");
      } else {
        setRequestError(messageForRequest(error));
      }
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
            <div className="signup-field">
              <label htmlFor="birth_date">{t("Data de nascimento")} *</label>
              <input
                id="birth_date"
                name="birth_date"
                type="date"
                required
                value={birthDateForDisplay}
                onChange={(event) => setBirthDateForDisplay(event.target.value)}
                aria-invalid={Boolean(errors.birth_date)}
                aria-describedby={errors.birth_date ? "birth_date-error" : undefined}
              />
              {errors.birth_date && (
                <span id="birth_date-error" className="signup-field-error">{t(errors.birth_date)}</span>
              )}
            </div>
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
          {showParentalTermField && (
            <div className="signup-minor-panel">
              <p className="signup-help signup-grid-wide">{t("Participação de menor de idade")}</p>
              <p className="signup-help signup-grid-wide">
                {t("Envie o termo assinado pelo responsável. No evento, você deverá estar acompanhado e ambos apresentarão documentos para conferência.")}
              </p>
              <p className="signup-help signup-grid-wide">
                {t("A idade no dia do torneio orienta este campo. O servidor confirma se o envio é obrigatório.")}
              </p>
              <div className="signup-field signup-grid-wide">
                <label htmlFor="parental_term">{t("Termo de responsabilidade assinado")} *</label>
                <input
                  id="parental_term"
                  name="parental_term"
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
                  aria-invalid={Boolean(errors.parental_term)}
                  aria-describedby={errors.parental_term ? "parental_term-error" : undefined}
                />
                {errors.parental_term && (
                  <span id="parental_term-error" className="signup-field-error">{t(errors.parental_term)}</span>
                )}
              </div>
            </div>
          )}
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
