import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { RegistrationRefundQueue } from "@/features/tournament/components/registration-refund-queue";
import { useLanguage } from "@/hooks/use-language";
import { appCopy } from "@/utils/app-copy";

export function RegistrationRefundRoute() {
  const { session } = useAuthSession();
  const { language } = useLanguage();
  return <section>
    <h1>{appCopy(language, "Reembolsos pendentes")}</h1>
    {session && <RegistrationRefundQueue userId={session.user.id} language={language} />}
  </section>;
}
