import { useQuery } from "@tanstack/react-query";
import { getPaymentInstructions } from "@/features/tournament/api/tournaments";

export function useTournamentSignupPayment(
  tournamentId: number | undefined,
  inscriptionNumber: string | undefined,
  accessToken: string | undefined,
) {
  return useQuery({
    queryKey: ["tournaments", tournamentId, "signups", inscriptionNumber, "payment"],
    queryFn: ({ signal }) =>
      getPaymentInstructions(tournamentId!, inscriptionNumber!, accessToken!, signal),
    enabled: Boolean(tournamentId && inscriptionNumber && accessToken),
  });
}
