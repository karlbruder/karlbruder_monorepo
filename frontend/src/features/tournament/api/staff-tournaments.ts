import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiBaseUrl } from "@/config/environment";
import { uploadFileToPresignedUrl, type AdditionalTournamentDocument, type ParentalConsentFormUploadUrl, type PolicyPurpose } from "@/features/tournament/api/tournaments";
import { additionalTournamentDocumentsKey } from "@/features/tournament/api/use-additional-tournament-documents";
import { apiFetch } from "@/lib/api-fetch";

export type StaffTournament = {
  id: number;
  name: string;
  slug: string;
  starts_at: string;
  is_internal: boolean;
  is_registration_closed: boolean;
  refunds_allowed?: boolean;
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

type StaffPolicyDocument = {
  id: number;
  original_file_name: string;
};

type StaffPolicyDocuments = Partial<Record<PolicyPurpose, StaffPolicyDocument>>;

function policyDocumentsKey(userId: string, tournamentId: number) {
  return ["staff-policy-documents", userId, tournamentId];
}

export function useStaffPolicyDocuments(token: string, userId: string, tournamentId: number) {
  return useQuery({
    queryKey: policyDocumentsKey(userId, tournamentId),
    queryFn: async ({ signal }): Promise<StaffPolicyDocuments> => {
      const response = await apiFetch(`${apiBaseUrl()}/tournaments/${tournamentId}/policy-documents`, {
        headers: { Authorization: `Bearer ${token}` }, signal,
      });
      if (!response.ok) throw new StaffTournamentError(response.status, null);
      return response.json();
    },
  });
}

export function usePublishTournamentDocument(token: string, userId: string, tournamentId: number, purpose?: PolicyPurpose) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, title }: { file: File; title?: string }) => {
      const collection = purpose ? `policy-documents/${purpose}` : "documents";
      const path = `/${tournamentId}/${collection}`;
      const { storage_key, upload_url, required_headers } = await request<ParentalConsentFormUploadUrl>(token, `${path}/upload-url`, { method: "POST" });
      await uploadFileToPresignedUrl(upload_url, file, required_headers);
      const init = {
        method: "POST", body: JSON.stringify({ storage_key, original_file_name: file.name, title }),
      };
      return purpose
        ? { purpose, document: await request<StaffPolicyDocument>(token, path, init) }
        : { purpose, document: await request<AdditionalTournamentDocument>(token, path, init) };
    },
    onSuccess: async (result) => {
      if (result.purpose) {
        const queryKey = policyDocumentsKey(userId, tournamentId);
        await client.cancelQueries({ queryKey });
        const purpose = result.purpose;
        client.setQueryData<StaffPolicyDocuments>(queryKey, (current) => ({ ...current, [purpose]: result.document }));
        void client.invalidateQueries({ queryKey: ["tournaments"], refetchType: "none" });
      } else {
        const queryKey = additionalTournamentDocumentsKey(userId, tournamentId);
        await client.cancelQueries({ queryKey });
        client.setQueryData<AdditionalTournamentDocument[]>(queryKey, (current) => [
          ...(current ?? []).filter(document => document.id !== result.document.id), result.document,
        ]);
        void client.invalidateQueries({ queryKey });
      }
    },
  });
}
