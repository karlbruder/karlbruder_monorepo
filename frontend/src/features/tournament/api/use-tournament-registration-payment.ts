import { useQuery } from "@tanstack/react-query";
import { getPaymentInstructions } from "@/features/tournament/api/tournaments";

export function tournamentRegistrationPaymentQueryKey(tournamentId: number, registrationNumber: string) {
  return ["tournaments", tournamentId, "registrations", registrationNumber, "payment"] as const;
}

export function useTournamentRegistrationPayment(
  tournamentId: number | undefined,
  registrationNumber: string | undefined,
  userId: string | undefined,
) {
  return useQuery({
    queryKey: [...tournamentRegistrationPaymentQueryKey(tournamentId ?? 0, registrationNumber ?? ""), userId],
    queryFn: ({ signal }) =>
      getPaymentInstructions(tournamentId!, registrationNumber!, userId!, signal),
    enabled: Boolean(tournamentId && registrationNumber && userId),
  });
}
