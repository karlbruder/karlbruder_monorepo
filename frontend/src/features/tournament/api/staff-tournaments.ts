import { useQuery } from "@tanstack/react-query";
import { apiBaseUrl } from "@/config/environment";
import { apiFetch } from "@/lib/api-fetch";

export type StaffTournament = {
  id: number;
  name: string;
  slug: string;
  starts_at: string;
  is_internal: boolean;
  is_registration_closed: boolean;
  [key: string]: unknown;
};

export class StaffTournamentError extends Error {
  readonly status: number;
  readonly detail: unknown;
  constructor(status: number, detail: unknown) {
    super(`Tournament request failed: ${status}`);
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(token: string, path = "", init: RequestInit = {}): Promise<T> {
  const response = await apiFetch(`${apiBaseUrl()}/staff/tournaments${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.body ? { "Content-Type": "application/json" } : {}) },
  });
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const detail = body && typeof body === "object" && "detail" in body ? body.detail : null;
    throw new StaffTournamentError(response.status, detail);
  }
  return response.status === 204 ? undefined as T : response.json();
}

export function useStaffTournaments(token: string, userId: string, offset: number) {
  return useQuery({ queryKey: ["staff-tournaments", userId, offset], queryFn: ({ signal }) => request<{ items: StaffTournament[]; total: number }>(token, `?limit=20&offset=${offset}`, { signal }) });
}
export function useStaffTournament(token: string, userId: string, id: string, visitId: string) {
  return useQuery({ queryKey: ["staff-tournament", userId, id, visitId], queryFn: ({ signal }) => request<StaffTournament>(token, `/${encodeURIComponent(id)}`, { signal }) });
}
export function saveStaffTournament(token: string, values: Record<string, unknown>, id?: string) {
  return request<StaffTournament>(token, id ? `/${encodeURIComponent(id)}` : "", { method: id ? "PUT" : "POST", body: JSON.stringify(values) });
}
export function deleteStaffTournament(token: string, id: string) {
  return request<void>(token, `/${encodeURIComponent(id)}`, { method: "DELETE" });
}
