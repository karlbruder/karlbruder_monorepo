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
};

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
