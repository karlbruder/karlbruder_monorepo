import { useNavigate } from "react-router-dom";
import { useAppContext } from "@/app/app-context";
import AccountChangePasswordPage from "@/features/auth/components/account-change-password-page";

export default function AccountChangePasswordRoute() {
  const { auth, language, changeLanguage } = useAppContext();
  const navigate = useNavigate();
  return (
    <AccountChangePasswordPage
      language={language}
      onLanguageChange={changeLanguage}
      authReady={auth.authReady}
      hasSession={Boolean(auth.session)}
      onSuccess={() => navigate("/", { replace: true })}
    />
  );
}
