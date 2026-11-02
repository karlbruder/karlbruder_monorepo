import { useSupabaseAuthRedirectError } from "@/features/auth/hooks/use-supabase-auth-redirect-error";
import { AuthPageFrame } from "@/features/auth/components/auth-page-frame";
import { appCopy } from "@/utils/app-copy";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import SignInForm from "@/features/auth/components/sign-in-form";
import { readReturnTo, readSessionExpiredFromSignIn } from "@/features/auth/utils/account-navigation";

export default function SignInRoute() {
  const auth = useAuthSession();
  const { language, changeLanguage } = useLanguage();
  const [searchParams] = useSearchParams();
  const returnTo = readReturnTo(searchParams) ?? "/";
  const navigate = useNavigate();
  const redirectError = useSupabaseAuthRedirectError(language, "sign_in");
  return (
    <AuthPageFrame
      language={language}
      onLanguageChange={changeLanguage}
      title={appCopy(language, "Entrar na Karlbrüder")}
      subtitle={appCopy(language, "Boas-vindas de volta.")}
    >
      <SignInForm
        redirectError={redirectError}
        language={language}
        returnTo={returnTo}
        authLoading={auth.authLoading}
        authError={auth.authError}
        onGoogleSignIn={() => auth.signInWithGoogle(`${window.location.origin}${returnTo}`)}
        sessionExpiredNotice={readSessionExpiredFromSignIn(searchParams)}
        onClearSessionLapsedNotice={auth.clearSessionLapsedNotice}
        onSuccess={() => navigate(returnTo, { replace: true })}
      />
    </AuthPageFrame>
  );
}
