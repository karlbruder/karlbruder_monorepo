import { useQuery } from "@tanstack/react-query";
import { listOwnSignups } from "@/features/tournament/api/tournaments";

export function useOwnTournamentSignups(tournamentId: number | undefined, accessToken: string | undefined) {
  return useQuery({
    queryKey: ["tournaments", tournamentId, "signups", "own"],
    queryFn: ({ signal }) => listOwnSignups(tournamentId!, accessToken!, signal),
    enabled: Boolean(tournamentId && accessToken),
  });
}
