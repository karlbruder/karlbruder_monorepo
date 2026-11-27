import { useQuery } from "@tanstack/react-query";
import { getTags } from "@/features/tournament/api/tournament-tags";

export const tagsKey = (userId: string, tournamentId: number | string) => ["tournament-tags", userId, String(tournamentId)];
export function useTournamentTags({ userId, tournamentId }: { userId: string; tournamentId: number | string }) {
  return useQuery({ queryKey: tagsKey(userId, tournamentId), queryFn: ({ signal }) => getTags(userId, tournamentId, signal) });
}
