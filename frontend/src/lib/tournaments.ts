export type Tournament = {
  id: number;
  name: string;
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

export function monomachiaTournamentId(): number | null {
  const raw = import.meta.env.VITE_MONOMACHIA_TOURNAMENT_ID;
  if (!raw || !/^[1-9]\d*$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) ? id : null;
}

export function apiBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");
}

export async function getTournament(id: number, signal: AbortSignal): Promise<Tournament> {
  const response = await fetch(`${apiBaseUrl()}/tournaments/${id}`, { signal });
  if (!response.ok) {
    throw new Error(response.status === 404 ? "not-found" : `http-${response.status}`);
  }
  return response.json() as Promise<Tournament>;
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
