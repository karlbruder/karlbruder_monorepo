export type Tournament = {
  id: number;
  name: string;
  slug: string | null;
  modality: string | null;
  starts_at: string;
  location: string | null;
  inscription_fee_amount: string | number | null;
  registration_opens_on: string | null;
  registration_closes_on: string | null;
  new_registrations_closed: boolean;
  regulation: string | null;
  regulation_version: string | null;
  terms_version: string | null;
  cancellation_policy: string | null;
  equipment_requirements: string | null;
};

export type SignupCreate = {
  full_name: string;
  social_name: string | null;
  birth_date: string;
  document_type: "cpf" | "passport";
  document_id: string;
  email: string;
  phone: string;
  city: string;
  state: string | null;
  country: string;
  school_name: string | null;
  responsible_instructor_name: string | null;
  hema_practice_duration: string | null;
  hema_practice_start_year: number | null;
  prior_tournaments_count: number;
  hema_ratings_ref: string | null;
  handedness: "right" | "left" | "ambidextrous" | null;
  special_category_note: string | null;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  declares_truthful_information: boolean;
  declares_required_equipment: boolean;
  declares_physically_fit: boolean;
  accepts_regulation: boolean;
  accepts_data_processing: boolean;
  acknowledges_inherent_risks: boolean;
  accepts_cancellation_policy: boolean;
  image_use_authorized: boolean;
};

export type SignupCreated = {
  inscription_number: string;
  status: string;
  full_name: string;
  email: string;
  tournament_id: number;
};

export class SignupRequestError extends Error {
  readonly status: number;
  readonly detail: string | null;

  constructor(status: number, detail: string | null) {
    super(`Signup request failed with HTTP ${status}`);
    this.status = status;
    this.detail = detail;
  }
}

export const MONOMACHIA_SLUG = "monomachia-2027";

export function apiBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isTournament(value: unknown, slug: string): value is Tournament {
  if (value === null || typeof value !== "object") return false;
  const event = value as Record<string, unknown>;
  return (
    typeof event.id === "number" && Number.isSafeInteger(event.id) && event.id > 0 &&
    event.slug === slug &&
    typeof event.name === "string" && event.name.trim().length > 0 &&
    typeof event.starts_at === "string" &&
    typeof event.new_registrations_closed === "boolean" &&
    isNullableString(event.modality) &&
    isNullableString(event.location) &&
    (event.inscription_fee_amount === null || typeof event.inscription_fee_amount === "string" || typeof event.inscription_fee_amount === "number") &&
    isNullableString(event.registration_opens_on) &&
    isNullableString(event.registration_closes_on) &&
    isNullableString(event.regulation) &&
    isNullableString(event.regulation_version) &&
    isNullableString(event.terms_version) &&
    isNullableString(event.cancellation_policy) &&
    isNullableString(event.equipment_requirements)
  );
}

export async function getTournamentBySlug(slug: string, signal: AbortSignal): Promise<Tournament | null> {
  const response = await fetch(`${apiBaseUrl()}/tournaments?slug=${encodeURIComponent(slug)}`, { signal });
  if (!response.ok) {
    throw new Error(`http-${response.status}`);
  }
  const body: unknown = await response.json().catch(() => null);
  if (!Array.isArray(body)) throw new Error("invalid-tournament-list");
  if (body.length === 0) return null;
  if (body.length !== 1 || !isTournament(body[0], slug)) {
    throw new Error("invalid-tournament-list");
  }
  return body[0];
}

export async function createSignup(
  id: number,
  token: string,
  payload: SignupCreate,
): Promise<SignupCreated> {
  const response = await fetch(`${apiBaseUrl()}/tournaments/${id}/signups`, {
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
    throw new SignupRequestError(response.status, detail);
  }
  if (
    response.status !== 201 || !body || typeof body !== "object" ||
    !("inscription_number" in body) || typeof body.inscription_number !== "string" ||
    !("status" in body) || typeof body.status !== "string" ||
    !("full_name" in body) || typeof body.full_name !== "string" ||
    !("email" in body) || typeof body.email !== "string" ||
    !("tournament_id" in body) || typeof body.tournament_id !== "number"
  ) {
    throw new Error("Invalid signup response");
  }
  return body as SignupCreated;
}
