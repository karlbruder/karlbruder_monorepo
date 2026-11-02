import { AuthPageFrame } from "@/features/auth/components/auth-page-frame";
import { appCopy } from "@/utils/app-copy";
import { useSearchParams } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import PasswordRecoveryForm from "@/features/auth/components/password-recovery-form";
import { accountRoutes } from "@/config/account-routes";
import { readReturnTo } from "@/features/auth/utils/account-navigation";

export default function PasswordRecoveryRoute() {
  const { language, changeLanguage } = useLanguage();
  const [searchParams] = useSearchParams();
  const returnTo = readReturnTo(searchParams) ?? accountRoutes.signIn;
  return (
    <AuthPageFrame
      language={language}
      onLanguageChange={changeLanguage}
      title={appCopy(language, "Recuperar acesso")}
      subtitle={appCopy(language, "Recuperar acesso")}
      showRegistrationContext={false}
    >
      <PasswordRecoveryForm
        language={language}
        returnTo={returnTo}
      />
    </AuthPageFrame>
  );
}
