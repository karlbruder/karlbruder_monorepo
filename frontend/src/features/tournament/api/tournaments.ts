import { apiFetch } from "@/lib/api-fetch";
import { apiBaseUrl } from "@/config/environment";

export type Tournament = {
  id: number;
  name: string;
  slug: string;
  discipline: string | null;
  starts_at: string;
  location: string | null;
  registration_fee_amount: string | number | null;
  registration_opens_on: string | null;
  registration_closes_on: string | null;
  is_registration_closed: boolean;
  rules_text: string | null;
  rules_url: string | null;
  rules_version: string | null;
  terms_version: string | null;
  cancellation_policy_text: string | null;
  cancellation_policy_url: string | null;
  equipment_requirements: string | null;
};

export type RegistrationCreate = {
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
  authorizes_image_use: boolean;
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
};

export type OwnerRegistration = RegistrationCreated & {
  user_id?: string;
};

export type PaymentProofSummary = {
  original_file_name: string;
  content_type: string;
  size_bytes: number;
  submitted_at: string;
};

export type RegistrationPaymentInstructions = {
  registration_number: string;
  registration_status: string;
  registration_fee_amount: string | number | null;
  payment_due_at: string | null;
  payment_options: {
    pix: {
      pix_key: string | null;
    };
  };
  latest_payment_proof: PaymentProofSummary | null;
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

function isTournament(value: unknown): value is Tournament {
  if (value === null || typeof value !== "object") return false;
  const event = value as Record<string, unknown>;
  return (
    typeof event.id === "number" && Number.isSafeInteger(event.id) && event.id > 0 &&
    typeof event.slug === "string" && event.slug.length > 0 &&
    typeof event.name === "string" && event.name.trim().length > 0 &&
    typeof event.starts_at === "string" &&
    typeof event.is_registration_closed === "boolean" &&
    isNullableString(event.discipline) &&
    isNullableString(event.location) &&
    (event.registration_fee_amount === null || typeof event.registration_fee_amount === "string" || typeof event.registration_fee_amount === "number") &&
    isNullableString(event.registration_opens_on) &&
    isNullableString(event.registration_closes_on) &&
    isNullableString(event.rules_text) &&
    isNullableString(event.rules_url) &&
    isNullableString(event.rules_version) &&
    isNullableString(event.terms_version) &&
    isNullableString(event.cancellation_policy_text) &&
    isNullableString(event.cancellation_policy_url) &&
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
  const response = await apiFetch(monomachiaListQuery(), { signal });
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
  token: string,
): Promise<ParentalConsentFormUploadUrl> {
  const response = await apiFetch(
    `${apiBaseUrl()}/tournaments/${tournamentId}/registrations/parental-consent-form/upload-url`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    },
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
  token: string,
  payload: RegistrationCreate,
): Promise<RegistrationCreated> {
  const response = await apiFetch(`${apiBaseUrl()}/tournaments/${id}/registrations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
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
    typeof record.registration_number === "string" &&
    typeof record.registration_status === "string" &&
    typeof record.full_name === "string" &&
    typeof record.email === "string" &&
    typeof record.tournament_id === "number"
  );
}

export async function listOwnRegistrations(
  tournamentId: number,
  token: string,
  signal?: AbortSignal,
): Promise<OwnerRegistration[]> {
  const response = await apiFetch(`${apiBaseUrl()}/tournaments/${tournamentId}/registrations`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok || !Array.isArray(body)) {
    throw new Error(`http-${response.status}`);
  }
  if (!body.every(isOwnerRegistration)) {
    throw new Error("invalid-registration-list");
  }
  return body;
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
    typeof record.registration_status === "string" &&
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
  token: string,
  signal?: AbortSignal,
): Promise<RegistrationPaymentInstructions> {
  const response = await apiFetch(
    `${apiBaseUrl()}/tournaments/${tournamentId}/registrations/${encodeURIComponent(registrationNumber)}/payment`,
    { headers: { Authorization: `Bearer ${token}` }, signal },
  );
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok || !isPaymentInstructions(body)) {
    throw new Error(`http-${response.status}`);
  }
  return body;
}

export async function requestPaymentProofUploadUrl(
  tournamentId: number,
  registrationNumber: string,
  token: string,
): Promise<PaymentProofUploadUrl> {
  const response = await apiFetch(
    `${apiBaseUrl()}/tournaments/${tournamentId}/registrations/${encodeURIComponent(registrationNumber)}/payment-proof/upload-url`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    },
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
  token: string,
  payload: { storage_key: string; original_file_name: string },
): Promise<OwnerRegistration> {
  const response = await apiFetch(
    `${apiBaseUrl()}/tournaments/${tournamentId}/registrations/${encodeURIComponent(registrationNumber)}/payment-proof`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
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
