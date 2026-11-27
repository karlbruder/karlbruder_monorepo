import type { TournamentTag } from "@/features/tournament/api/tournament-tags";
import { apiFetch } from "@/lib/api-fetch";
import { backendFetch } from "@/lib/backend-api-client";
import { assertSessionGeneration, currentSessionGeneration } from "@/lib/session-generation";
import { apiBaseUrl } from "@/config/environment";

export type PolicyPurpose = "rules" | "cancellation_policy";

export type AdditionalTournamentDocument = {
  id: number;
  title: string;
  original_file_name: string;
  content_type: string;
};

export type PolicyVersion = {
  version_id: number;
  original_file_name: string;
  content_type: string;
};

export type AcceptanceContent = {
  policies: Record<PolicyPurpose, { document: PolicyVersion | null }>;
  declarations: {
    accepts_rules: string; accepts_data_processing: string; declares_truthful_information: string;
    acknowledges_inherent_risks: string; declares_has_required_equipment: string;
    declares_physically_fit: string; accepts_cancellation_policy: string;
  };
};

export type Tournament = {
  acceptance_content: Record<"pt" | "en", AcceptanceContent>;
  acceptance_tokens: Record<"pt" | "en", string>;
  id: number;
  name: string;
  slug: string;
  discipline: string | null;
  starts_at: string;
  ends_at?: string | null;
  location: string | null;
  registration_opens_on: string | null;
  registration_closes_on: string | null;
  is_registration_closed: boolean;
  refunds_allowed?: boolean;
  equipment_requirements: string | null;
};

export type TournamentProduct = {
  id: number;
  product_id: number;
  name: string;
  description: string;
  price_id: number | null;
  amount: string | number | null;
  currency: string | null;
};

export async function getTournamentProducts(id: number, userId?: string, signal?: AbortSignal): Promise<TournamentProduct[]> {
  const response = await backendFetch(`/tournaments/${id}/products`, { signal }, { authentication: "optional", expectedAccountId: userId });
  if (!response.ok) throw new Error(`http-${response.status}`);
  const body: unknown = await response.json();
  if (!Array.isArray(body) || !body.every((option: unknown) => {
    if (!option || typeof option !== "object") return false;
    const item = option as Record<string, unknown>;
    return Number.isSafeInteger(item.id) && Number.isSafeInteger(item.product_id)
      && typeof item.name === "string" && typeof item.description === "string"
      && (item.price_id === null || Number.isSafeInteger(item.price_id))
      && (item.amount === null || typeof item.amount === "string" || typeof item.amount === "number")
      && (item.currency === null || typeof item.currency === "string");
  })) throw new Error("invalid-tournament-products");
  return body as TournamentProduct[];
}

export type RegistrationCreate = {
  tag_ids?: number[];
  tournament_product_id: number;
  price_id: number;
  acceptance_language: "pt" | "en";
  acceptance_token: string;
  full_name: string;
  social_name: string | null;
  birth_date: string;
  identity_document_type: "cpf" | "passport";
  identity_document_number: string;
  email: string;
  phone: string;
  city: string;
  state_or_province: string | null;
  country: string;
  school_or_team_name: string | null;
  instructor_name: string | null;
  hema_experience_description: string | null;
  hema_started_year: number | null;
  previous_tournament_count: number;
  hema_ratings_reference: string | null;
  handedness: "right" | "left" | "ambidextrous" | null;
  category_or_eligibility_note: string | null;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  declares_truthful_information: boolean;
  declares_has_required_equipment: boolean;
  declares_physically_fit: boolean;
  accepts_rules: boolean;
  accepts_data_processing: boolean;
  acknowledges_inherent_risks: boolean;
  accepts_cancellation_policy: boolean;
  parental_consent_form_storage_key?: string | null;
  parental_consent_form_original_file_name?: string | null;
};

export type ParentalConsentFormUploadUrl = {
  storage_key: string;
  upload_url: string;
  expires_in_seconds: number;
  required_headers: Record<string, string>;
};

export type RegistrationCreated = {
  registration_number: string;
  registration_status: string;
  full_name: string;
  email: string;
  tournament_id: number;
  product_name?: string | null;
  product_description?: string | null;
};

export type OwnerRegistration = RegistrationCreated & {
  parental_consent_required?: boolean;
  user_id?: string;
  rules_version_id?: number | null;
  cancellation_policy_version_id?: number | null;
};

export async function updateRegistrationDetails(
  tournamentId: number, number: string, userId: string,
  details: Record<string, string | number | null>,
): Promise<void> {
  const response = await backendFetch(`/tournaments/${tournamentId}/registrations/${encodeURIComponent(number)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(details),
  }, { authentication: "required", expectedAccountId: userId });
  if (!response.ok) throw new RegistrationRequestError(response.status, null);
}

export type PaymentProofSummary = {
  original_file_name: string;
  content_type: string;
  size_bytes: number;
  submitted_at: string;
};

export type RegistrationPaymentInstructions = {
  registration_number: string;
  registration_fee_amount: string | number | null;
  amount_received?: string | number | null;
  payment_due_at: string | null;
  payment_options: {
    pix: {
      pix_key: string | null;
    };
  };
  latest_payment_proof: PaymentProofSummary | null;
  current_review?: { document_id: number; decision: "approved" | "rejected"; rejection_reason: string | null; reviewed_at: string } | null;
};

export type PaymentProofUploadUrl = ParentalConsentFormUploadUrl;

export class RegistrationRequestError extends Error {
  readonly status: number;
  readonly detail: string | null;

  constructor(status: number, detail: string | null) {
    super(`Registration request failed with HTTP ${status}`);
    this.status = status;
    this.detail = detail;
  }
}

export class PaymentProofRequestError extends Error {
  readonly status: number;
  readonly detail: string | null;

  constructor(status: number, detail: string | null) {
    super(`Payment proof request failed with HTTP ${status}`);
    this.status = status;
    this.detail = detail;
  }
}

export const MONOMACHIA_NAME = "Monomachia";
export const MONOMACHIA_STARTS_FROM = "2027-01-01";
export const MONOMACHIA_STARTS_TO = "2027-12-31";



function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isVersionId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isPolicyVersion(value: unknown): value is PolicyVersion | null {
  if (value === null) return true;
  if (!value || typeof value !== "object") return false;
  const { version_id, original_file_name, content_type } = value as Partial<PolicyVersion>;
  return isVersionId(version_id)
    && typeof original_file_name === "string" && original_file_name.trim().length > 0
    && typeof content_type === "string" && content_type.length > 0;
}

function isAcceptanceEvidence(event: Partial<Tournament>): boolean {
  return ["pt", "en"].every(language => {
    const key = language as "pt" | "en";
    const content = event.acceptance_content?.[key];
    const declarations = content?.declarations;
    return typeof event.acceptance_tokens?.[key] === "string"
      && /^[a-f0-9]{64}$/.test(event.acceptance_tokens[key])
      && isPolicyVersion(content?.policies?.rules?.document)
      && isPolicyVersion(content?.policies?.cancellation_policy?.document)
      && declarations !== undefined
      && ["accepts_rules", "accepts_data_processing", "declares_truthful_information", "acknowledges_inherent_risks", "declares_has_required_equipment", "declares_physically_fit", "accepts_cancellation_policy"].every(name => typeof declarations[name as keyof typeof declarations] === "string");
  });
}

export async function downloadTournamentDocument(
  tournamentId: number, purpose: PolicyPurpose | undefined, versionId: number, userId: string,
): Promise<Blob> {
  const generation = currentSessionGeneration();
  const collection = purpose ? `policy-documents/${purpose}` : "documents";
  const response = await backendFetch(
    `/tournaments/${tournamentId}/${collection}/${versionId}/download-url`,
    {}, { authentication: "required", expectedAccountId: userId },
  );
  if (!response.ok) throw new Error(`http-${response.status}`);
  const body = await response.json();
  if (typeof body?.download_url !== "string") throw new Error("invalid-policy-download-url");
  const url = new URL(body.download_url);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("invalid-policy-download-url");
  assertSessionGeneration(generation);

  const download = await fetch(url.href, { credentials: "omit" });
  if (!download.ok) throw new Error(`policy-download-${download.status}`);
  const file = await download.blob();
  assertSessionGeneration(generation);
  if (!file.size || !["application/pdf", "image/jpeg", "image/png"].includes(file.type)) {
    throw new Error("invalid-policy-document");
  }
  return file;
}

export async function getTournament(id: number, userId?: string, signal?: AbortSignal): Promise<Tournament> {
  const response = await backendFetch(`/tournaments/${id}`, { signal }, { authentication: "optional", expectedAccountId: userId });
  if (!response.ok) throw new Error(`http-${response.status}`);
  const body: unknown = await response.json();
  if (!isTournament(body) || body.id !== id) throw new Error("invalid-tournament");
  return body;
}

function isTournament(value: unknown): value is Tournament {
  if (value === null || typeof value !== "object") return false;
  const event = value as Record<string, unknown>;
  return (
    typeof event.id === "number" && Number.isSafeInteger(event.id) && event.id > 0 &&
    typeof event.slug === "string" && event.slug.length > 0 &&
    typeof event.name === "string" && event.name.trim().length > 0 &&
    typeof event.starts_at === "string" &&
    (event.ends_at === undefined || isNullableString(event.ends_at)) &&
    isAcceptanceEvidence(event) &&
    typeof event.is_registration_closed === "boolean" &&
    (event.refunds_allowed === undefined || typeof event.refunds_allowed === "boolean") &&
    isNullableString(event.discipline) &&
    isNullableString(event.location) &&
    isNullableString(event.registration_opens_on) &&
    isNullableString(event.registration_closes_on) &&
    isNullableString(event.equipment_requirements)
  );
}

export function monomachiaListQuery(): string {
  const params = new URLSearchParams({
    name: MONOMACHIA_NAME,
    starts_from: MONOMACHIA_STARTS_FROM,
    starts_to: MONOMACHIA_STARTS_TO,
    limit: "2",
  });
  return `${apiBaseUrl()}/tournaments?${params}`;
}

export async function getMonomachiaTournament(signal: AbortSignal): Promise<Tournament | null> {
  const response = await backendFetch(monomachiaListQuery().slice(apiBaseUrl().length), { signal }, { authentication: "optional" });
  if (!response.ok) {
    throw new Error(`http-${response.status}`);
  }
  const body: unknown = await response.json().catch(() => null);
  if (body === null || typeof body !== "object" || !("items" in body) || !Array.isArray(body.items)) {
    throw new Error("invalid-tournament-list");
  }
  if (body.items.length === 0) return null;
  if (body.items.length !== 1 || !isTournament(body.items[0])) {
    throw new Error("invalid-tournament-list");
  }
  return body.items[0];
}

export async function requestParentalConsentFormUploadUrl(
  tournamentId: number,
  userId: string,
): Promise<ParentalConsentFormUploadUrl> {
  const response = await backendFetch(
    `/tournaments/${tournamentId}/registrations/parental-consent-form/upload-url`,
    {
      method: "POST",
    },
    { authentication: "required", expectedAccountId: userId },
  );
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok || !body || typeof body !== "object") {
    throw new Error(`http-${response.status}`);
  }
  const record = body as Record<string, unknown>;
  if (
    typeof record.storage_key !== "string" ||
    typeof record.upload_url !== "string" ||
    typeof record.expires_in_seconds !== "number" ||
    !record.required_headers ||
    typeof record.required_headers !== "object"
  ) {
    throw new Error("invalid-parental-consent-form-upload-url");
  }
  return body as ParentalConsentFormUploadUrl;
}

export async function uploadFileToPresignedUrl(
  uploadUrl: string,
  file: File,
  requiredHeaders: Record<string, string>,
): Promise<void> {
  const headers = new Headers(requiredHeaders);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", file.type || "application/octet-stream");
  }
  const response = await fetch(uploadUrl, { method: "PUT", headers, body: file });
  if (!response.ok) {
    throw new Error(`presigned-upload-${response.status}`);
  }
}

export async function createRegistration(
  id: number,
  userId: string,
  payload: RegistrationCreate,
): Promise<RegistrationCreated> {
  const response = await backendFetch(`/tournaments/${id}/registrations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  }, { authentication: "required", expectedAccountId: userId });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = body && typeof body === "object" && "detail" in body && typeof body.detail === "string"
      ? body.detail
      : null;
    throw new RegistrationRequestError(response.status, detail);
  }
  if (
    response.status !== 201 || !body || typeof body !== "object" ||
    !("registration_number" in body) || typeof body.registration_number !== "string" ||
    !("registration_status" in body) || typeof body.registration_status !== "string" ||
    !("full_name" in body) || typeof body.full_name !== "string" ||
    !("email" in body) || typeof body.email !== "string" ||
    !("tournament_id" in body) || typeof body.tournament_id !== "number"
  ) {
    throw new Error("Invalid registration response");
  }
  return body as RegistrationCreated;
}

function isOwnerRegistration(value: unknown): value is OwnerRegistration {
  if (value === null || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  const accountIdIsOptional = !("user_id" in record) || typeof record.user_id === "string";
  return (
    accountIdIsOptional &&
    (record.rules_version_id == null || isVersionId(record.rules_version_id)) &&
    (record.cancellation_policy_version_id == null || isVersionId(record.cancellation_policy_version_id)) &&
    (record.product_name === undefined || isNullableString(record.product_name)) &&
    (record.product_description === undefined || isNullableString(record.product_description)) &&
    typeof record.registration_number === "string" &&
    typeof record.registration_status === "string" &&
    typeof record.full_name === "string" &&
    typeof record.email === "string" &&
    typeof record.tournament_id === "number"
  );
}

export async function listOwnRegistrations(
  tournamentId: number,
  userId: string,
  signal?: AbortSignal,
): Promise<OwnerRegistration[]> {
  const response = await backendFetch(`/tournaments/${tournamentId}/registrations`, {
    signal,
  }, { authentication: "required", expectedAccountId: userId });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok || !Array.isArray(body)) {
    throw new Error(`http-${response.status}`);
  }
  if (!body.every(isOwnerRegistration)) {
    throw new Error("invalid-registration-list");
  }
  return body;
}

export async function getOwnRegistration(tournamentId: number, number: string, userId: string, signal?: AbortSignal): Promise<OwnerRegistration & { parental_consent_required: boolean }> {
  const response = await backendFetch(`/tournaments/${tournamentId}/registrations/${encodeURIComponent(number)}`, { signal }, { authentication: "required", expectedAccountId: userId });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`http-${response.status}`);
  if (!isOwnerRegistration(body) || body.tournament_id !== tournamentId || body.registration_number !== number || typeof body.parental_consent_required !== "boolean") throw new Error("invalid-registration");
  return body as OwnerRegistration & { parental_consent_required: boolean };
}

function isCurrentReview(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value !== "object") return false;
  const review = value as Record<string, unknown>;
  return typeof review.document_id === "number" && Number.isSafeInteger(review.document_id) && review.document_id > 0
    && (review.decision === "approved" || review.decision === "rejected")
    && typeof review.reviewed_at === "string"
    && (review.decision === "rejected"
      ? typeof review.rejection_reason === "string" && review.rejection_reason.trim().length > 0
      : review.rejection_reason === null);
}

function isPaymentInstructions(value: unknown): value is RegistrationPaymentInstructions {
  if (value === null || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  const paymentOptions = record.payment_options;
  if (paymentOptions === null || typeof paymentOptions !== "object") return false;
  const pix = (paymentOptions as Record<string, unknown>).pix;
  if (pix === null || typeof pix !== "object") return false;
  const pixKey = (pix as Record<string, unknown>).pix_key;
  return (
    typeof record.registration_number === "string" &&
    isCurrentReview(record.current_review) &&
    (record.amount_received == null ||
      typeof record.amount_received === "string" ||
      typeof record.amount_received === "number") &&
    (record.registration_fee_amount === null ||
      typeof record.registration_fee_amount === "string" ||
      typeof record.registration_fee_amount === "number") &&
    (record.payment_due_at === null || typeof record.payment_due_at === "string") &&
    (pixKey === null || typeof pixKey === "string") &&
    (record.latest_payment_proof === null ||
      (typeof record.latest_payment_proof === "object" &&
        record.latest_payment_proof !== null &&
        typeof (record.latest_payment_proof as Record<string, unknown>).original_file_name === "string"))
  );
}

export async function getPaymentInstructions(
  tournamentId: number,
  registrationNumber: string,
  userId: string,
  signal?: AbortSignal,
): Promise<RegistrationPaymentInstructions> {
  const response = await backendFetch(
    `/tournaments/${tournamentId}/registrations/${encodeURIComponent(registrationNumber)}/payment`,
    { signal }, { authentication: "required", expectedAccountId: userId },
  );
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok || !isPaymentInstructions(body) || body.registration_number !== registrationNumber) {
    throw new Error(`http-${response.status}`);
  }
  return body;
}

export async function requestPaymentProofUploadUrl(
  tournamentId: number,
  registrationNumber: string,
  userId: string,
  originalFileName: string,
): Promise<PaymentProofUploadUrl> {
  const response = await backendFetch(
    `/tournaments/${tournamentId}/registrations/${encodeURIComponent(registrationNumber)}/payment-proof/upload-url`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ original_file_name: originalFileName }),
    }, { authentication: "required", expectedAccountId: userId },
  );
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok || !body || typeof body !== "object") {
    throw new Error(`http-${response.status}`);
  }
  const record = body as Record<string, unknown>;
  if (
    typeof record.storage_key !== "string" ||
    typeof record.upload_url !== "string" ||
    typeof record.expires_in_seconds !== "number" ||
    !record.required_headers ||
    typeof record.required_headers !== "object"
  ) {
    throw new Error("invalid-payment-proof-upload-url");
  }
  return body as PaymentProofUploadUrl;
}

export async function submitPaymentProof(
  tournamentId: number,
  registrationNumber: string,
  userId: string,
  payload: { storage_key: string; original_file_name: string },
): Promise<OwnerRegistration> {
  const response = await backendFetch(
    `/tournaments/${tournamentId}/registrations/${encodeURIComponent(registrationNumber)}/payment-proof`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }, { authentication: "required", expectedAccountId: userId },
  );
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = body && typeof body === "object" && "detail" in body && typeof body.detail === "string"
      ? body.detail
      : null;
    throw new PaymentProofRequestError(response.status, detail);
  }
  if (!isOwnerRegistration(body)) {
    throw new Error("invalid-payment-proof-submit-response");
  }
  return body;
}

export async function submitParentalConsentForm(
  tournamentId: number, registrationNumber: string, userId: string,
  payload: { storage_key: string; original_file_name: string },
): Promise<void> {
  const response = await backendFetch(
    `/tournaments/${tournamentId}/registrations/${encodeURIComponent(registrationNumber)}/parental-consent-form`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }, { authentication: "required", expectedAccountId: userId },
  );
  if (!response.ok) throw new Error(`http-${response.status}`);
}

export type StaffRegistrationSummary = {
  product_name: string | null;
  registration_number: string;
  full_name: string;
  social_name: string | null;
  registration_status: string;
  parental_consent_required: boolean;
  tags: TournamentTag[];
};

export type StaffRegistrationTotals = { total: number; confirmed_count: number; competitor_capacity: number | null };

export async function getStaffRegistrationTotals(token: string, tournamentId: number | string, signal?: AbortSignal): Promise<StaffRegistrationTotals> {
  const response = await apiFetch(`${apiBaseUrl()}/staff/tournaments/${encodeURIComponent(tournamentId)}/registration-totals`, {
    headers: { Authorization: `Bearer ${token}` }, signal,
  });
  if (!response.ok) throw new Error(`http-${response.status}`);
  return response.json();
}

export async function listStaffRegistrations(token: string, tournamentId: number | string, signal?: AbortSignal): Promise<StaffRegistrationSummary[]> {
  const response = await apiFetch(`${apiBaseUrl()}/staff/tournaments/${encodeURIComponent(tournamentId)}/registrations`, {
    headers: { Authorization: `Bearer ${token}` }, signal,
  });
  if (!response.ok) throw new Error(`http-${response.status}`);
  return response.json();
}


export type PersonalRegistrationSummary = {
  tournament_id: number;
  tournament_name: string;
  registration_number: string;
  registration_status: string;
};

export async function listPersonalRegistrations(userId: string, signal?: AbortSignal): Promise<PersonalRegistrationSummary[]> {
  const response = await backendFetch("/tournaments/registrations", { signal }, { authentication: "required", expectedAccountId: userId });
  if (!response.ok) throw new Error(`http-${response.status}`);
  const body: unknown = await response.json();
  if (!Array.isArray(body) || !body.every(item => item && Number.isSafeInteger(item.tournament_id) && typeof item.tournament_name === "string" && typeof item.registration_number === "string" && typeof item.registration_status === "string")) throw new Error("invalid-registration-list");
  return body as PersonalRegistrationSummary[];
}
