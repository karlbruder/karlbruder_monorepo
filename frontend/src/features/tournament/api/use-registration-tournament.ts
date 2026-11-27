import { useQuery } from "@tanstack/react-query";
import { getMonomachiaTournament, getTournament } from "@/features/tournament/api/tournaments";

export function useRegistrationTournament(tournamentId: number | undefined, userId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: tournamentId ? ["tournaments", tournamentId, "registration-entry", userId ?? "guest"] : ["tournaments", "monomachia", 2027, userId ?? "guest"],
    queryFn: ({ signal }) => tournamentId ? getTournament(tournamentId, userId, signal) : getMonomachiaTournament(signal),
    enabled,
  });
}
