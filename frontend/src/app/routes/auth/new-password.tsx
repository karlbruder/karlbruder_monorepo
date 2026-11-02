import { useSearchParams, useNavigate } from "react-router-dom";
import { useAppContext } from "@/app/app-context";
import AccountNewPasswordPage from "@/features/auth/components/account-new-password-page";
import { readReturnTo } from "@/features/auth/utils/account-navigation";

export default function AccountNewPasswordRoute() {
  const { auth, language, changeLanguage } = useAppContext();
  const [searchParams] = useSearchParams();
  const returnTo = readReturnTo(searchParams) ?? "/";
  const navigate = useNavigate();
  return (
    <AccountNewPasswordPage
      language={language}
      onLanguageChange={changeLanguage}
      authReady={auth.authReady}
      hasSession={Boolean(auth.session)}
      onSuccess={() => navigate(returnTo, { replace: true })}
    />
  );
}
