import { AuthPageFrame } from "@/features/auth/components/auth-page-frame";
import { appCopy } from "@/utils/app-copy";
import { useSearchParams } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import EmailConfirmationNotice from "@/features/auth/components/email-confirmation-notice";
import { isTournamentRegistrationPath, getReturnToPath } from "@/features/auth/utils/account-navigation";

export default function CheckEmailRoute() {
  const { language } = useLanguage();
  const [searchParams] = useSearchParams();
  const returnTo = getReturnToPath(searchParams) ?? "/";
  return (
    <AuthPageFrame
      language={language}
      title={appCopy(language, "Confira seu e-mail")}
      subtitle={appCopy(language, "Confira seu e-mail")}
      showTournamentRegistrationMessage={isTournamentRegistrationPath(returnTo)}
    >
      <EmailConfirmationNotice
        language={language}
        returnTo={returnTo}
        email={searchParams.get("email")}
      />
    </AuthPageFrame>
  );
}
