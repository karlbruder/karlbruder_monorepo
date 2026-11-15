import { useQuery } from "@tanstack/react-query";
import { listOwnRegistrations } from "@/features/tournament/api/tournaments";

export function ownTournamentRegistrationsQueryKey(tournamentId: number) {
  return ["tournaments", tournamentId, "registrations", "own"] as const;
}

export function useOwnTournamentRegistrations(
  tournamentId: number | undefined,
  accessToken: string | undefined,
  userId: string,
) {
  return useQuery({
    queryKey: [...ownTournamentRegistrationsQueryKey(tournamentId ?? 0), userId],
    queryFn: ({ signal }) => listOwnRegistrations(tournamentId!, accessToken!, signal),
    enabled: Boolean(tournamentId && accessToken),
  });
}
