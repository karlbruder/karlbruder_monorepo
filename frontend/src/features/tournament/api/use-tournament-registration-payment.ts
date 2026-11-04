import { useQuery } from "@tanstack/react-query";
import { getPaymentInstructions } from "@/features/tournament/api/tournaments";

export function tournamentRegistrationPaymentQueryKey(tournamentId: number, registrationNumber: string) {
  return ["tournaments", tournamentId, "registrations", registrationNumber, "payment"] as const;
}

export function useTournamentRegistrationPayment(
  tournamentId: number | undefined,
  registrationNumber: string | undefined,
  accessToken: string | undefined,
) {
  return useQuery({
    queryKey: tournamentRegistrationPaymentQueryKey(tournamentId ?? 0, registrationNumber ?? ""),
    queryFn: ({ signal }) =>
      getPaymentInstructions(tournamentId!, registrationNumber!, accessToken!, signal),
    enabled: Boolean(tournamentId && registrationNumber && accessToken),
  });
}
