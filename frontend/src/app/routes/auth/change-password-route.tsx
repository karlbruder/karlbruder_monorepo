import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { AuthPageFrame } from "@/features/auth/components/auth-page-frame";
import { PasswordUpdateForm } from "@/features/auth/components/password-update-form";
import { appCopy } from "@/utils/app-copy";

export default function ChangePasswordRoute() {
  const { language, changeLanguage } = useLanguage();
  const navigate = useNavigate();
  return (
    <AuthPageFrame
      language={language}
      onLanguageChange={changeLanguage}
      title={appCopy(language, "Alterar senha")}
      subtitle={appCopy(language, "Alterar senha")}
      showRegistrationContext={false}
    >
      <p className="account-auth-muted">{appCopy(language, "Você já está autenticada.")}</p>
      <PasswordUpdateForm language={language} onSuccess={() => navigate("/", { replace: true })} />
    </AuthPageFrame>
  );
}
