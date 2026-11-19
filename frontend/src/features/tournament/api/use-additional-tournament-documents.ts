import { useQuery } from "@tanstack/react-query";
import { apiBaseUrl } from "@/config/environment";
import type { AdditionalTournamentDocument } from "@/features/tournament/api/tournaments";
import { apiFetch } from "@/lib/api-fetch";

export function additionalTournamentDocumentsKey(userId: string, tournamentId: number) {
  return ["additional-tournament-documents", userId, tournamentId];
}

export function useAdditionalTournamentDocuments(token: string, userId: string, tournamentId: number, enabled = true) {
  return useQuery({
    queryKey: additionalTournamentDocumentsKey(userId, tournamentId),
    enabled,
    queryFn: async ({ signal }): Promise<AdditionalTournamentDocument[]> => {
      const response = await apiFetch(`${apiBaseUrl()}/tournaments/${tournamentId}/documents`, {
        headers: { Authorization: `Bearer ${token}` }, signal,
      });
      if (!response.ok) throw new Error(`http-${response.status}`);
      const documents: unknown = await response.json();
      if (!Array.isArray(documents) || !documents.every(document => document
        && Number.isSafeInteger(document.id) && document.id > 0
        && typeof document.title === "string" && document.title.trim().length > 0
        && typeof document.original_file_name === "string" && typeof document.content_type === "string")) {
        throw new Error("invalid-tournament-documents");
      }
      return documents;
    },
  });
}
