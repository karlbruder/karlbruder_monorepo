import { apiBaseUrl } from "@/config/environment";
import { apiFetch } from "@/lib/api-fetch";

export type TournamentTag = { id: number; tournament_id: number; name: string; eligibility_description: string };
export type StaffAthlete = { registration_number: string; full_name: string; social_name: string | null; registration_status: string; tags: TournamentTag[] };

export class TagRequestError extends Error {
  readonly status: number;
  constructor(status: number) { super(`Tag request failed: ${status}`); this.status = status; }
}
async function request<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await apiFetch(`${apiBaseUrl()}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.body ? { "Content-Type": "application/json" } : {}) },
  });
  if (!response.ok) throw new TagRequestError(response.status);
  return response.status === 204 ? undefined as T : response.json();
}
const tournamentPath = (id: number | string) => `/tournaments/${encodeURIComponent(id)}`;
const registrationPath = (id: number | string, number: string) => `${tournamentPath(id)}/registrations/${encodeURIComponent(number)}/tags`;
async function readTags(token: string, path: string, signal?: AbortSignal): Promise<TournamentTag[]> {
  const result = await request<unknown>(token, path, { signal });
  if (!Array.isArray(result) || !result.every(tag => tag && Number.isSafeInteger(tag.id) && typeof tag.name === "string" && typeof tag.eligibility_description === "string")) throw new Error("Invalid tags response");
  return result as TournamentTag[];
}
export const getTags = (token: string, id: number | string, signal?: AbortSignal) => readTags(token, `${tournamentPath(id)}/tags`, signal);
export const getSelection = (token: string, id: number | string, number: string, staff = false, signal?: AbortSignal) => readTags(token, `${staff ? "/staff" : ""}${registrationPath(id, number)}`, signal);
export const saveSelection = (token: string, id: number | string, number: string, tagIds: number[], staff = false) => request<TournamentTag[]>(token, `${staff ? "/staff" : ""}${registrationPath(id, number)}`, { method: "PUT", body: JSON.stringify({ tag_ids: tagIds }) });
export const getAthletes = (token: string, id: number | string, signal?: AbortSignal) => request<StaffAthlete[]>(token, `/staff${tournamentPath(id)}/athletes`, { signal });
export const saveTag = (token: string, id: number | string, values: { name: string; eligibility_description: string }, tagId?: number) => request<TournamentTag>(token, `/staff${tournamentPath(id)}/tags${tagId ? `/${tagId}` : ""}`, { method: tagId ? "PUT" : "POST", body: JSON.stringify(values) });
export const deleteTag = (token: string, id: number | string, tagId: number) => request<void>(token, `/staff${tournamentPath(id)}/tags/${tagId}`, { method: "DELETE" });
