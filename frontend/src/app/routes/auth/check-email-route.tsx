import { AuthPageFrame } from "@/features/auth/components/auth-page-frame";
import { appCopy } from "@/utils/app-copy";
import { useSearchParams } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import EmailConfirmationNotice from "@/features/auth/components/email-confirmation-notice";
import { readReturnTo } from "@/features/auth/utils/account-navigation";

export default function CheckEmailRoute() {
  const { language, changeLanguage } = useLanguage();
  const [searchParams] = useSearchParams();
  const returnTo = readReturnTo(searchParams) ?? "/";
  return (
    <AuthPageFrame
      language={language}
      onLanguageChange={changeLanguage}
      title={appCopy(language, "Confira seu e-mail")}
      subtitle={appCopy(language, "Confira seu e-mail")}
    >
      <EmailConfirmationNotice
        language={language}
        returnTo={returnTo}
        email={searchParams.get("email")}
      />
    </AuthPageFrame>
  );
}
