import { useQuery } from "@tanstack/react-query";
import { listOwnSignups } from "@/features/tournament/api/tournaments";

export function ownTournamentSignupsQueryKey(tournamentId: number) {
  return ["tournaments", tournamentId, "signups", "own"] as const;
}

export function useOwnTournamentSignups(
  tournamentId: number | undefined,
  accessToken: string | undefined,
) {
  return useQuery({
    queryKey: ownTournamentSignupsQueryKey(tournamentId ?? 0),
    queryFn: ({ signal }) => listOwnSignups(tournamentId!, accessToken!, signal),
    enabled: Boolean(tournamentId && accessToken),
  });
}
