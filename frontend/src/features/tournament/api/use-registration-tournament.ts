import { useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { getMonomachiaTournament, getTournament } from "@/features/tournament/api/tournaments";

export function useRegistrationTournament(tournamentId: number | undefined, session: Session | null, enabled: boolean) {
  return useQuery({
    queryKey: tournamentId ? ["tournaments", tournamentId, "registration-entry", session?.user.id ?? "guest"] : ["tournaments", "monomachia", 2027],
    queryFn: ({ signal }) => tournamentId ? getTournament(tournamentId, session?.access_token, signal) : getMonomachiaTournament(signal),
    enabled,
  });
}
