import { useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  createRegistration,
  getTournament,
  requestParentalConsentFormUploadUrl,
  RegistrationRequestError,
  uploadFileToPresignedUrl,
} from "@/features/tournament/api/tournaments";
import type { RegistrationCreate, RegistrationCreated, Tournament } from "@/features/tournament/api/tournaments";
import { isMinorAtTournamentStart } from "@/features/tournament/utils/is-minor-at-tournament-start";
import { validateParentalConsentFormFile } from "@/features/tournament/utils/validate-parental-consent-form-file";
import { appCopy } from "@/utils/app-copy";
import type { AppCopyKey, AppLanguage } from "@/utils/app-copy";
import { RegistrationProgress } from "@/features/tournament/components/registration-progress";

type Props = {
  tournament: Tournament;
  session: Session;
  language?: AppLanguage;
  onRegistrationCreated?: (registration: RegistrationCreated) => void;
};

type Errors = Record<string, AppCopyKey>;

const requiredDeclarations = [
  ["accepts_rules"],
  ["accepts_data_processing"],
  ["declares_truthful_information"],
  ["acknowledges_inherent_risks"],
  ["declares_has_required_equipment"],
  ["declares_physically_fit"],
  ["accepts_cancellation_policy"],
] as const;

function readRegistration(
  form: HTMLFormElement,
  accountEmail: string | undefined,
  tournamentStartsAt: string,
  birthDateFallback: string,
  acceptanceToken: string,
  acceptanceLanguage: AppLanguage,
): { payload: RegistrationCreate | null; errors: Errors; parentalConsentFormFile: File | null } {
  const data = new FormData(form);
  const value = (key: string) => String(data.get(key) ?? "").trim();
  const optional = (key: string) => value(key) || null;
  const errors: Errors = {};
  const requiredText = [
    "full_name", "birth_date", "identity_document_number", "phone", "city", "country",
    "emergency_contact_name", "emergency_contact_phone",
  ];
  for (const key of requiredText) {
    if (key === "birth_date") continue;
    if (!value(key)) errors[key] = "Campo obrigatório.";
  }
  const birthDate = value("birth_date") || birthDateFallback.trim();
  if (!birthDate) errors.birth_date = "Campo obrigatório.";
  if (!accountEmail) errors.email = "Entre com uma conta que tenha e-mail.";

  const documentType = value("identity_document_type");
  if (documentType !== "cpf" && documentType !== "passport") {
    errors.identity_document_type = "Escolha o tipo de documento.";
  }
  const duration = optional("hema_experience_description");
  const year = value("hema_started_year");
  if (!duration && !year) errors.hema_experience_description = "Informe o tempo de prática ou o ano de início.";
  if (year && (!/^\d+$/.test(year) || Number(year) < 1 || !Number.isSafeInteger(Number(year)))) {
    errors.hema_started_year = "Informe um ano válido.";
  }
  const priorCount = value("previous_tournament_count");
  if (!/^\d+$/.test(priorCount) || !Number.isSafeInteger(Number(priorCount))) {
    errors.previous_tournament_count = "Informe zero ou um número inteiro positivo.";
  }

  const handedness = value("handedness");
  if (handedness && !["right", "left", "ambidextrous"].includes(handedness)) {
    errors.handedness = "Escolha uma opção válida.";
  }
  for (const [key] of requiredDeclarations) {
    if (data.get(key) !== "on") errors[key] = "Esta declaração é obrigatória.";
  }
  const imageChoice = value("authorizes_image_use");
  if (imageChoice !== "yes" && imageChoice !== "no") {
    errors.authorizes_image_use = "Escolha autorizar ou não autorizar.";
  }

  const needsParentalConsentForm = Boolean(birthDate) && isMinorAtTournamentStart(birthDate, tournamentStartsAt);
  let parentalConsentFormFile: File | null = null;
  if (needsParentalConsentForm) {
    const fileInput = form.elements.namedItem("parental_consent_form");
    const fileFromInput =
      fileInput instanceof HTMLInputElement && fileInput.files && fileInput.files.length > 0
        ? fileInput.files[0]
        : null;
    const fileFromFormData = data.get("parental_consent_form");
    const resolvedFile =
      fileFromInput && fileFromInput.size > 0
        ? fileFromInput
        : fileFromFormData instanceof File && fileFromFormData.size > 0
          ? fileFromFormData
          : null;
    if (!resolvedFile) {
      errors.parental_consent_form = "Envie o termo de responsabilidade assinado em PDF ou imagem (JPEG ou PNG).";
    } else {
      parentalConsentFormFile = resolvedFile;
    }
  }

  if (Object.keys(errors).length > 0) return { payload: null, errors, parentalConsentFormFile: null };

  return {
    errors,
    parentalConsentFormFile,
    payload: {
      acceptance_token: acceptanceToken,
      acceptance_language: acceptanceLanguage,
      full_name: value("full_name"),
      social_name: optional("social_name"),
      birth_date: birthDate,
      identity_document_type: documentType as RegistrationCreate["identity_document_type"],
      identity_document_number: value("identity_document_number"),
      email: accountEmail!.trim(),
      phone: value("phone"),
      city: value("city"),
      state_or_province: optional("state_or_province"),
      country: value("country"),
      school_or_team_name: optional("school_or_team_name"),
      instructor_name: optional("instructor_name"),
      hema_experience_description: duration,
      hema_started_year: year ? Number(year) : null,
      previous_tournament_count: Number(priorCount),
      hema_ratings_reference: optional("hema_ratings_reference"),
      handedness: (handedness || null) as RegistrationCreate["handedness"],
      category_or_eligibility_note: optional("category_or_eligibility_note"),
      emergency_contact_name: value("emergency_contact_name"),
      emergency_contact_phone: value("emergency_contact_phone"),
      declares_truthful_information: true,
      declares_has_required_equipment: true,
      declares_physically_fit: true,
      accepts_rules: true,
      accepts_data_processing: true,
      acknowledges_inherent_risks: true,
      accepts_cancellation_policy: true,
      authorizes_image_use: imageChoice === "yes",
    },
  };
}

function messageForRequest(error: unknown): AppCopyKey {
  if (error instanceof RegistrationRequestError) {
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
    <div className="registration-field">
      <label htmlFor={name}>{label}{required && " *"}</label>
      <input
        id={name} name={name} type={type} required={required} placeholder={placeholder} min={min}
        aria-invalid={Boolean(error)} aria-describedby={error ? `${name}-error` : undefined}
      />
      {error && <span id={`${name}-error`} className="registration-field-error">{appCopy(language, error)}</span>}
    </div>
  );
}

function PolicyContent({ label, text, url, language }: { label: string; text: string | null; url?: string | null; language: AppLanguage }) {
  const t = (key: AppCopyKey) => appCopy(language, key);
  if (!text && !url) return <p className="registration-policy-missing">{label}: {t("conteúdo ainda não configurado.")}</p>;
  return (
    <div>
      {text && <details><summary>{t("Consultar")} {label.toLowerCase()}</summary><p>{text}</p></details>}
      {url && <a href={url} target="_blank" rel="noopener noreferrer">{t("Consultar")} {label.toLowerCase()}</a>}
    </div>
  );
}

function Success({ result, tournament, language }: { result: RegistrationCreated; tournament: Tournament; language: AppLanguage }) {
  const t = (key: AppCopyKey) => appCopy(language, key);
  const statusText = result.registration_status === "awaiting_payment" ? t("Aguardando pagamento") : result.registration_status;
  return (
    <section className="registration-card registration-success" aria-labelledby="registration-success-title" role="status">
      <p className="registration-eyebrow">{t("Inscrição recebida")}</p>
      <h2 id="registration-success-title">{t("Guarde seu número de inscrição")}</h2>
      <strong className="registration-number">{result.registration_number}</strong>
      <dl className="registration-success-facts">
        <div><dt>{t("Torneio")}</dt><dd>{tournament.name}</dd></div>
        <div><dt>{t("Participante")}</dt><dd>{result.full_name}</dd></div>
        <div><dt>{t("E-mail")}</dt><dd>{result.email}</dd></div>
        <div><dt>{t("Situação")}</dt><dd>{statusText}</dd></div>
      </dl>
      {result.registration_status === "awaiting_payment" && (
        <p>{t("Próximo passo: acompanhe as instruções de pagamento do torneio. Sua vaga ainda não está confirmada nem reservada.")}</p>
      )}
    </section>
  );
}

export default function TournamentRegistrationForm({
  tournament: initialTournament,
  session,
  language = "pt",
  onRegistrationCreated,
}: Props) {
  const t = (key: AppCopyKey) => appCopy(language, key);
  const [tournament, setTournament] = useState(initialTournament);
  const [errors, setErrors] = useState<Errors>({});
  const [requestError, setRequestError] = useState<AppCopyKey | null>(null);
  const [pending, setPending] = useState(false);
  const [renewingPolicyLinks, setRenewingPolicyLinks] = useState(false);
  const [result, setResult] = useState<RegistrationCreated | null>(null);
  const [birthDateForDisplay, setBirthDateForDisplay] = useState("");
  const requestPending = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  const showParentalConsentFormField = Boolean(birthDateForDisplay)
    && isMinorAtTournamentStart(birthDateForDisplay, tournament.starts_at);

  const refreshPolicies = async (form: HTMLFormElement, requireAcceptance = false) => {
    const refreshed = await getTournament(tournament.id, session.access_token);
    setTournament(refreshed);
    if (requireAcceptance || refreshed.acceptance_tokens[language] !== tournament.acceptance_tokens[language]) {
      form.querySelectorAll<HTMLInputElement>('.registration-declarations input, .registration-image-choice input').forEach(input => { input.checked = false; });
      setRequestError("Os termos mudaram. Leia o conteúdo atualizado e confirme suas escolhas novamente.");
    }
  };

  const renewPolicyLinks = async () => {
    const form = formRef.current;
    if (!form || requestPending.current) return;
    requestPending.current = true;
    setRenewingPolicyLinks(true);
    setRequestError(null);
    try {
      await refreshPolicies(form);
    } catch {
      setRequestError("Não foi possível renovar os links. Tente novamente.");
    } finally {
      requestPending.current = false;
      setRenewingPolicyLinks(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (requestPending.current) return;
    const form = event.currentTarget;
    const { payload, errors: nextErrors, parentalConsentFormFile } = readRegistration(
      event.currentTarget,
      session.user.email,
      tournament.starts_at,
      birthDateForDisplay,
      tournament.acceptance_tokens[language],
      language,
    );
    setErrors(nextErrors);
    setRequestError(null);
    if (!payload) return;

    if (parentalConsentFormFile) {
      const clientFileError = await validateParentalConsentFormFile(parentalConsentFormFile);
      if (clientFileError) {
        setErrors(previous => ({ ...previous, parental_consent_form: clientFileError }));
        return;
      }
    }

    requestPending.current = true;
    setPending(true);
    try {
      let registrationPayload = payload;
      if (parentalConsentFormFile) {
        const uploadInfo = await requestParentalConsentFormUploadUrl(tournament.id, session.access_token);
        await uploadFileToPresignedUrl(
          uploadInfo.upload_url,
          parentalConsentFormFile,
          uploadInfo.required_headers,
        );
        registrationPayload = {
          ...payload,
          parental_consent_form_storage_key: uploadInfo.storage_key,
          parental_consent_form_original_file_name: parentalConsentFormFile.name,
        };
      }
      const created = await createRegistration(tournament.id, session.access_token, registrationPayload);
      if (onRegistrationCreated) {
        onRegistrationCreated(created);
      } else {
        setResult(created);
      }
    } catch (error) {
      if (error instanceof RegistrationRequestError && error.status === 409 && error.detail === "Registration terms changed; refresh before accepting") {
        try {
          await refreshPolicies(form, true);
        } catch {
          setRequestError("Não foi possível atualizar os termos. Tente enviar novamente para atualizar.");
        }
      } else if (error instanceof Error && error.message.startsWith("presigned-upload-")) {
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
    <form ref={formRef} className="registration-form" aria-label={t("Formulário de inscrição")} onSubmit={submit} noValidate>
      <RegistrationProgress current={1} language={language} />
      <div className="registration-card registration-draft-notice">
        <p className="registration-eyebrow">{t("Conteúdo em preparação")}</p>
        <p>{t("Os textos finais das declarações e da privacidade ainda precisam de aprovação. Este formulário não está pronto para inscrições reais.")}</p>
      </div>
      {Object.keys(errors).length > 0 && <p className="registration-error-summary" role="alert">{t("Revise os campos indicados antes de enviar.")}</p>}
      {requestError && <p className="registration-error-summary" role="alert">{t(requestError)}</p>}

      <fieldset className="registration-fieldset" disabled={pending || renewingPolicyLinks}>
        <section className="registration-card registration-section" aria-labelledby="registration-personal-title">
          <h2 id="registration-personal-title"><span>01</span> {t("Dados pessoais")}</h2>
          <div className="registration-grid">
            <Field name="full_name" label={t("Nome completo")} errors={errors} language={language} required />
            <Field name="social_name" label={t("Nome social (opcional)")} errors={errors} language={language} />
            <div className="registration-field">
              <label htmlFor="email">{t("E-mail da conta")} *</label>
              <input id="email" name="email" type="email" value={session.user.email ?? ""} readOnly aria-invalid={Boolean(errors.email)} />
              {errors.email && <span className="registration-field-error">{t(errors.email)}</span>}
            </div>
            <Field name="phone" label={t("Telefone")} errors={errors} language={language} type="tel" required />
            <div className="registration-field">
              <label htmlFor="identity_document_type">{t("Documento")} *</label>
              <select id="identity_document_type" name="identity_document_type" required aria-invalid={Boolean(errors.identity_document_type)}>
                <option value="">{t("Selecione")}</option><option value="cpf">CPF</option><option value="passport">{t("Passaporte")}</option>
              </select>
              {errors.identity_document_type && <span className="registration-field-error">{t(errors.identity_document_type)}</span>}
            </div>
            <Field name="identity_document_number" label={t("Número do documento")} errors={errors} language={language} required />
            <div className="registration-field">
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
                <span id="birth_date-error" className="registration-field-error">{t(errors.birth_date)}</span>
              )}
            </div>
            <Field name="country" label={t("País")} errors={errors} language={language} required />
            <Field name="city" label={t("Cidade")} errors={errors} language={language} required />
            <Field name="state_or_province" label={t("Estado / província (opcional)")} errors={errors} language={language} />
          </div>
          <p className="registration-help">{t("O e-mail da inscrição deve corresponder ao da sua conta.")}</p>
        </section>

        <section className="registration-card registration-section" aria-labelledby="registration-sport-title">
          <h2 id="registration-sport-title"><span>02</span> {t("Sua experiência")}</h2>
          <div className="registration-grid">
            <Field name="hema_experience_description" label={t("Tempo de prática em HEMA")} errors={errors} language={language} placeholder={t("Ex.: 2 anos")} />
            <Field name="hema_started_year" label={t("Ano de início em HEMA")} errors={errors} language={language} type="number" min="1" />
            <p className="registration-help registration-grid-wide">{t("Informe o tempo de prática, o ano de início ou ambos.")}</p>
            <Field name="previous_tournament_count" label={t("Torneios anteriores")} errors={errors} language={language} type="number" min="0" required placeholder={t("0 se nunca participou")} />
            <Field name="school_or_team_name" label={t("Escola / equipe (opcional)")} errors={errors} language={language} />
            <Field name="instructor_name" label={t("Instrutor responsável (opcional)")} errors={errors} language={language} />
            <Field name="hema_ratings_reference" label={t("Referência HEMA Ratings (opcional)")} errors={errors} language={language} />
            <div className="registration-field">
              <label htmlFor="handedness">{t("Lateralidade (opcional)")}</label>
              <select id="handedness" name="handedness" aria-invalid={Boolean(errors.handedness)}>
                <option value="">{t("Não informada")}</option><option value="right">{t("Destra")}</option><option value="left">{t("Canhota")}</option><option value="ambidextrous">{t("Ambidestra")}</option>
              </select>
              {errors.handedness && <span className="registration-field-error">{t(errors.handedness)}</span>}
            </div>
            <div className="registration-field registration-grid-wide">
              <label htmlFor="category_or_eligibility_note">{t("Categoria / caso especial (opcional)")}</label>
              <textarea id="category_or_eligibility_note" name="category_or_eligibility_note" rows={3} />
              <span className="registration-help">{t("A equipe confirma a elegibilidade conforme o regulamento.")}</span>
            </div>
          </div>
        </section>

        <section className="registration-card registration-section" aria-labelledby="registration-safety-title">
          <h2 id="registration-safety-title"><span>03</span> {t("Segurança e participação")}</h2>
          <div className="registration-grid">
            <Field name="emergency_contact_name" label={t("Contato de emergência")} errors={errors} language={language} required />
            <Field name="emergency_contact_phone" label={t("Telefone de emergência")} errors={errors} language={language} type="tel" required />
          </div>
          {showParentalConsentFormField && (
            <div className="registration-minor-panel">
              <p className="registration-help registration-grid-wide">{t("Participação de menor de idade")}</p>
              <p className="registration-help registration-grid-wide">
                {t("Envie o termo assinado pelo responsável. No evento, você deverá estar acompanhado e ambos apresentarão documentos para conferência.")}
              </p>
              <p className="registration-help registration-grid-wide">
                {t("A idade no dia do torneio orienta este campo. O servidor confirma se o envio é obrigatório.")}
              </p>
              <div className="registration-field registration-grid-wide">
                <label htmlFor="parental_consent_form">{t("Termo de responsabilidade assinado")} *</label>
                <input
                  id="parental_consent_form"
                  name="parental_consent_form"
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
                  aria-invalid={Boolean(errors.parental_consent_form)}
                  aria-describedby={errors.parental_consent_form ? "parental_consent_form-error" : undefined}
                />
                {errors.parental_consent_form && (
                  <span id="parental_consent_form-error" className="registration-field-error">{t(errors.parental_consent_form)}</span>
                )}
              </div>
            </div>
          )}
          <div className="registration-documents">
            <PolicyContent label={t("Regulamento")} text={tournament.rules_text} url={tournament.rules_archive_url} language={language} />
            <PolicyContent label={t("Política de cancelamento")} text={tournament.cancellation_policy_text} url={tournament.cancellation_policy_archive_url} language={language} />
            {tournament.equipment_requirements && <PolicyContent label={t("Equipamento obrigatório")} text={tournament.equipment_requirements} language={language} />}
          </div>
          {(tournament.rules_archive_url || tournament.cancellation_policy_archive_url) && (
            <div>
              <p className="registration-help">{t("O link do documento expirou? Renove os links sem perder suas respostas.")}</p>
              <button className="registration-policy-renewal" type="button" onClick={renewPolicyLinks} disabled={pending || renewingPolicyLinks}>
                {t(renewingPolicyLinks ? "Renovando links..." : "Renovar links dos documentos")}
              </button>
            </div>
          )}
          <p className="registration-help">{t("Os termos e o regulamento são registrados pelas versões configuradas para este torneio.")}</p>
          <div className="registration-declarations">
            {requiredDeclarations.map(([name]) => (
              <div key={name}>
                <label className="registration-choice">
                  <input type="checkbox" name={name} aria-invalid={Boolean(errors[name])} />
                  <span>{tournament.acceptance_content[language].declarations[name]} *</span>
                </label>
                {errors[name] && <span className="registration-field-error">{t(errors[name])}</span>}
              </div>
            ))}
          </div>
          <fieldset className="registration-image-choice">
            <legend>{t("Uso de imagem")} *</legend>
            <label className="registration-choice"><input type="radio" name="authorizes_image_use" value="yes" /> {tournament.acceptance_content[language].declarations.image_use_choices.yes}</label>
            <label className="registration-choice"><input type="radio" name="authorizes_image_use" value="no" /> {tournament.acceptance_content[language].declarations.image_use_choices.no}</label>
            {errors.authorizes_image_use && <span className="registration-field-error">{t(errors.authorizes_image_use)}</span>}
          </fieldset>
        </section>

        <div className="registration-submit-row">
          <button className="registration-submit" type="submit" disabled={pending || renewingPolicyLinks}>{t(pending ? "Enviando inscrição..." : "Enviar minha inscrição")}</button>
          <p>{t("Ao enviar, você ainda não terá uma vaga confirmada ou reservada.")}</p>
        </div>
      </fieldset>
    </form>
  );
}
