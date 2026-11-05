import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { StaffAccountPanel } from "@/features/staff-accounts/components/staff-account-panel";
import { useLanguage } from "@/hooks/use-language";

export function StaffAccountsRoute() {
  const { session } = useAuthSession();
  const { language } = useLanguage();
  if (!session) return null;
  return (
    <StaffAccountPanel
      key={session.user.id}
      actorId={session.user.id}
      token={session.access_token}
      language={language}
    />
  );
}
