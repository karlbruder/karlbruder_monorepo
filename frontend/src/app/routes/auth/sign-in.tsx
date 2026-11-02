import { useSearchParams, useNavigate } from "react-router-dom";
import { useAppContext } from "@/app/app-context";
import AccountSignInPage from "@/features/auth/components/account-sign-in-page";
import { readReturnTo, readSessionExpiredFromSignIn } from "@/features/auth/utils/account-navigation";

export default function AccountSignInRoute() {
  const { auth, language, changeLanguage } = useAppContext();
  const [searchParams] = useSearchParams();
  const returnTo = readReturnTo(searchParams) ?? "/";
  const navigate = useNavigate();
  return (
    <AccountSignInPage
      language={language}
      onLanguageChange={changeLanguage}
      returnTo={returnTo}
      authLoading={auth.authLoading}
      authError={auth.authError}
      onGoogleSignIn={auth.signInWithGoogle}
      sessionExpiredNotice={readSessionExpiredFromSignIn(searchParams)}
      onClearSessionLapsedNotice={auth.clearSessionLapsedNotice}
      onSuccess={() => navigate(returnTo, { replace: true })}
    />
  );
}
