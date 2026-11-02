import { useQuery } from "@tanstack/react-query";
import { getMonomachiaTournament } from "@/features/tournament/api/tournaments";

export function useMonomachiaTournament() {
  return useQuery({
    queryKey: ["tournaments", "monomachia", 2027],
    queryFn: ({ signal }) => getMonomachiaTournament(signal),
  });
}
