import { backendFetch } from "@/lib/backend-api-client";

export type TournamentTag = { id: number; tournament_id: number; name: string; eligibility_description: string };

export class TagRequestError extends Error {
  readonly status: number;
  constructor(status: number) { super(`Tag request failed: ${status}`); this.status = status; }
}
async function request<T>(userId: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await backendFetch(path, {
    ...init,
    headers: init.body ? { "Content-Type": "application/json" } : {},
  }, { authentication: "required", expectedAccountId: userId });
  if (!response.ok) throw new TagRequestError(response.status);
  return response.status === 204 ? undefined as T : response.json();
}
const tournamentPath = (id: number | string) => `/tournaments/${encodeURIComponent(id)}`;
const registrationPath = (id: number | string, number: string) => `${tournamentPath(id)}/registrations/${encodeURIComponent(number)}/tags`;
async function readTags(userId: string, path: string, signal?: AbortSignal): Promise<TournamentTag[]> {
  const result = await request<unknown>(userId, path, { signal });
  if (!Array.isArray(result) || !result.every(tag => tag && Number.isSafeInteger(tag.id) && typeof tag.name === "string" && typeof tag.eligibility_description === "string")) throw new Error("Invalid tags response");
  return result as TournamentTag[];
}
export const getTags = (userId: string, id: number | string, signal?: AbortSignal) => readTags(userId, `${tournamentPath(id)}/tags`, signal);
export const getSelection = (userId: string, id: number | string, number: string, staff = false, signal?: AbortSignal) => readTags(userId, `${staff ? "/staff" : ""}${registrationPath(id, number)}`, signal);
export const saveSelection = (userId: string, id: number | string, number: string, tagIds: number[], staff = false) => request<TournamentTag[]>(userId, `${staff ? "/staff" : ""}${registrationPath(id, number)}`, { method: "PUT", body: JSON.stringify({ tag_ids: tagIds }) });
export const saveTag = (userId: string, id: number | string, values: { name: string; eligibility_description: string }, tagId?: number) => request<TournamentTag>(userId, `/staff${tournamentPath(id)}/tags${tagId ? `/${tagId}` : ""}`, { method: tagId ? "PUT" : "POST", body: JSON.stringify(values) });
export const deleteTag = (userId: string, id: number | string, tagId: number) => request<void>(userId, `/staff${tournamentPath(id)}/tags/${tagId}`, { method: "DELETE" });
