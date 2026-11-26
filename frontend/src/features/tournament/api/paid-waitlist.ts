import { apiBaseUrl } from "@/config/environment";
import { apiFetch } from "@/lib/api-fetch";
import type { StaffRegistrationSummary } from "@/features/tournament/api/tournaments";

export type PaidWaitlist = {
  competitor_capacity: number | null;
  confirmed_count: number;
  registrations: StaffRegistrationSummary[];
};

export class WaitlistError extends Error {
  readonly status: number;
  constructor(status: number) { super(`http-${status}`); this.status = status; }
}

async function request<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await apiFetch(`${apiBaseUrl()}/staff/tournaments/${path}`, {
    ...init, headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new WaitlistError(response.status);
  return response.json();
}

export function getPaidWaitlist(token: string, tournamentId: string, signal?: AbortSignal) {
  return request<PaidWaitlist>(token, `${encodeURIComponent(tournamentId)}/waitlist`, { signal });
}

export function confirmPaidWaitlist(token: string, tournamentId: string, number: string) {
  return request<{ registration_status: string }>(token, `${encodeURIComponent(tournamentId)}/registrations/${encodeURIComponent(number)}/confirm`, { method: "POST" });
}
