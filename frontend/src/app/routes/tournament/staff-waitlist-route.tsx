import { useParams } from "react-router-dom";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { PaidWaitlist } from "@/features/tournament/components/paid-waitlist";
import { useLanguage } from "@/hooks/use-language";

export function StaffWaitlistRoute() {
  const { tournamentId = "" } = useParams();
  const { session } = useAuthSession();
  const { language } = useLanguage();
  return <PaidWaitlist token={session!.access_token} userId={session!.user.id} tournamentId={tournamentId} language={language} />;
}
