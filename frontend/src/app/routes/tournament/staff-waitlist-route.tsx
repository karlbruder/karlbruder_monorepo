import { useParams } from "react-router-dom";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { Waitlist } from "@/features/tournament/components/waitlist";
import { useLanguage } from "@/hooks/use-language";

export function StaffWaitlistRoute() {
  const { tournamentId = "" } = useParams();
  const { session } = useAuthSession();
  const { language } = useLanguage();
  return <Waitlist userId={session!.user.id} tournamentId={tournamentId} language={language} />;
}
