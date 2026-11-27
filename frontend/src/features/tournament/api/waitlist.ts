import { backendFetch } from "@/lib/backend-api-client";
import type { StaffRegistrationSummary } from "@/features/tournament/api/tournaments";

export type Waitlist = {
  competitor_capacity: number | null;
  confirmed_count: number;
  registrations: StaffRegistrationSummary[];
};

export class WaitlistError extends Error {
  readonly status: number;
  constructor(status: number) { super(`http-${status}`); this.status = status; }
}

async function request<T>(userId: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await backendFetch(`/staff/tournaments/${path}`, {
    ...init,
  }, { authentication: "required", expectedAccountId: userId });
  if (!response.ok) throw new WaitlistError(response.status);
  return response.json();
}

export function getWaitlist(userId: string, tournamentId: string, signal?: AbortSignal) {
  return request<Waitlist>(userId, `${encodeURIComponent(tournamentId)}/waitlist`, { signal });
}

export function confirmWaitlist(userId: string, tournamentId: string, number: string) {
  return request<{ registration_status: string }>(userId, `${encodeURIComponent(tournamentId)}/registrations/${encodeURIComponent(number)}/confirm`, { method: "POST" });
}
