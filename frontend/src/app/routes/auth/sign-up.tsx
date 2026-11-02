import { useSearchParams, useNavigate } from "react-router-dom";
import { useAppContext } from "@/app/app-context";
import AccountSignUpPage from "@/features/auth/components/account-sign-up-page";
import { accountRoutes } from "@/config/account-routes";
import { readReturnTo } from "@/features/auth/utils/account-navigation";

export default function AccountSignUpRoute() {
  const { auth, language, changeLanguage } = useAppContext();
  const [searchParams] = useSearchParams();
  const returnTo = readReturnTo(searchParams) ?? "/";
  const navigate = useNavigate();
  return (
    <AccountSignUpPage
      language={language}
      onLanguageChange={changeLanguage}
      returnTo={returnTo}
      authLoading={auth.authLoading}
      authError={auth.authError}
      onGoogleSignIn={auth.signInWithGoogle}
      onSuccess={(email) => navigate(`${accountRoutes.checkEmail}?email=${encodeURIComponent(email)}&returnTo=${encodeURIComponent(returnTo)}`, { replace: true })}
    />
  );
}
