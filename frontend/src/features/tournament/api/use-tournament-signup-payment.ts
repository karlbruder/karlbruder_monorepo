import { useQuery } from "@tanstack/react-query";
import { getPaymentInstructions } from "@/features/tournament/api/tournaments";

export function tournamentSignupPaymentQueryKey(tournamentId: number, inscriptionNumber: string) {
  return ["tournaments", tournamentId, "signups", inscriptionNumber, "payment"] as const;
}

export function useTournamentSignupPayment(
  tournamentId: number | undefined,
  inscriptionNumber: string | undefined,
  accessToken: string | undefined,
) {
  return useQuery({
    queryKey: tournamentSignupPaymentQueryKey(tournamentId ?? 0, inscriptionNumber ?? ""),
    queryFn: ({ signal }) =>
      getPaymentInstructions(tournamentId!, inscriptionNumber!, accessToken!, signal),
    enabled: Boolean(tournamentId && inscriptionNumber && accessToken),
  });
}
