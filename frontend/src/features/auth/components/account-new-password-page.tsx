import { Link } from "react-router-dom";
import { accountRoutes } from "@/config/account-routes";
import { registrationCopy } from "@/utils/registration-language";
import type { RegistrationCopyKey, RegistrationLanguage } from "@/utils/registration-language";
import { useSupabaseAuthRedirectError } from "@/features/auth/hooks/use-supabase-auth-redirect-error";
import { AccountAuthLayout, AuthServiceNotice } from "@/features/auth/components/account-auth-layout";
import { AccountMatchingPasswordForm } from "@/features/auth/components/account-matching-password-form";

type Props = {
  onSuccess: () => void;
  language: RegistrationLanguage;
  onLanguageChange: (language: RegistrationLanguage) => void;
  authReady: boolean;
  hasSession: boolean;
};

export default function AccountNewPasswordPage({ onSuccess, language, onLanguageChange, authReady, hasSession }: Props) {
  const t = (key: RegistrationCopyKey) => registrationCopy(language, key);
  const redirectError = useSupabaseAuthRedirectError(language, "update_password");
  const layoutProps = {
    language,
    onLanguageChange,
    title: t("Escolha uma nova senha"),
    subtitle: t("Escolha uma nova senha"),
    showRegistrationContext: false as const,
  };

  if (!authReady) {
    return (
      <AccountAuthLayout {...layoutProps}>
        <p role="status">{t("Carregando sua sessão...")}</p>
      </AccountAuthLayout>
    );
  }

  if (!hasSession) {
    return (
      <AccountAuthLayout {...layoutProps}>
        {redirectError ? (
          <>
            <p className="account-auth-error" role="alert">{redirectError}</p>
            <Link
              className="account-auth-submit"
              to={accountRoutes.recover}
              style={{ display: "inline-block", textAlign: "center", textDecoration: "none" }}
            >
              {t("Esqueci minha senha")}
            </Link>
          </>
        ) : (
          <>
            <AuthServiceNotice language={language} kind="expired" />
            <Link
              className="account-auth-submit"
              to={accountRoutes.signIn}
              style={{ display: "inline-block", textAlign: "center", textDecoration: "none" }}
            >
              {t("Voltar para entrar")}
            </Link>
          </>
        )}
      </AccountAuthLayout>
    );
  }

  return (
    <AccountAuthLayout {...layoutProps}>
      {redirectError && <p className="account-auth-error" role="alert">{redirectError}</p>}
      <AccountMatchingPasswordForm language={language} onSuccess={onSuccess} />
    </AccountAuthLayout>
  );
}
