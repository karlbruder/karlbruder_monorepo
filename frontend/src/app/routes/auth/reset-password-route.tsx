import { useSupabaseAuthRedirectError } from "@/features/auth/hooks/use-supabase-auth-redirect-error";
import { AuthPageFrame } from "@/features/auth/components/auth-page-frame";
import { appCopy } from "@/utils/app-copy";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import PasswordResetPanel from "@/features/auth/components/password-reset-panel";
import { readReturnTo } from "@/features/auth/utils/account-navigation";

export default function ResetPasswordRoute() {
  const auth = useAuthSession();
  const { language, changeLanguage } = useLanguage();
  const [searchParams] = useSearchParams();
  const returnTo = readReturnTo(searchParams) ?? "/";
  const navigate = useNavigate();
  const redirectError = useSupabaseAuthRedirectError(language, "update_password");
  return (
    <AuthPageFrame
      language={language}
      onLanguageChange={changeLanguage}
      title={appCopy(language, "Escolha uma nova senha")}
      subtitle={appCopy(language, "Escolha uma nova senha")}
      showRegistrationContext={false}
    >
      <PasswordResetPanel
        redirectError={redirectError}
        language={language}
        authReady={auth.authReady}
        hasSession={Boolean(auth.session)}
        onSuccess={() => navigate(returnTo, { replace: true })}
      />
    </AuthPageFrame>
  );
}
