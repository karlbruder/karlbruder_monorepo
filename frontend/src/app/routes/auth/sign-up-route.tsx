import { AuthPageFrame } from "@/features/auth/components/auth-page-frame";
import { appCopy } from "@/utils/app-copy";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import SignUpForm from "@/features/auth/components/sign-up-form";
import { accountRoutes } from "@/config/account-routes";
import { readReturnTo } from "@/features/auth/utils/account-navigation";

export default function SignUpRoute() {
  const auth = useAuthSession();
  const { language, changeLanguage } = useLanguage();
  const [searchParams] = useSearchParams();
  const returnTo = readReturnTo(searchParams) ?? "/";
  const navigate = useNavigate();
  return (
    <AuthPageFrame
      language={language}
      onLanguageChange={changeLanguage}
      title={appCopy(language, "Criar conta na Karlbrüder")}
      subtitle={appCopy(language, "Faça parte.")}
    >
      <SignUpForm
        language={language}
        returnTo={returnTo}
        authLoading={auth.authLoading}
        authError={auth.authError}
        onGoogleSignIn={() => auth.signInWithGoogle(`${window.location.origin}${returnTo}`)}
        onSuccess={(email) => navigate(`${accountRoutes.checkEmail}?email=${encodeURIComponent(email)}&returnTo=${encodeURIComponent(returnTo)}`, { replace: true })}
      />
    </AuthPageFrame>
  );
}
