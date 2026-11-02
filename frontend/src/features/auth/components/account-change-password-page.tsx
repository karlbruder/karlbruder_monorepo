import { Link } from "react-router-dom";
import { accountRoutes } from "@/config/account-routes";
import { registrationCopy } from "@/utils/registration-language";
import type { RegistrationCopyKey, RegistrationLanguage } from "@/utils/registration-language";
import { AccountAuthLayout, AuthServiceNotice } from "@/features/auth/components/account-auth-layout";
import { AccountMatchingPasswordForm } from "@/features/auth/components/account-matching-password-form";

type Props = {
  onSuccess: () => void;
  language: RegistrationLanguage;
  onLanguageChange: (language: RegistrationLanguage) => void;
  authReady: boolean;
  hasSession: boolean;
};

export default function AccountChangePasswordPage({ onSuccess, language, onLanguageChange, authReady, hasSession }: Props) {
  const t = (key: RegistrationCopyKey) => registrationCopy(language, key);
  const layoutProps = {
    language,
    onLanguageChange,
    title: t("Alterar senha"),
    subtitle: t("Alterar senha"),
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
        <AuthServiceNotice language={language} kind="expired" />
        <Link className="account-auth-submit" to={accountRoutes.signIn} style={{ display: "inline-block", textAlign: "center", textDecoration: "none" }}>
          {t("Voltar para entrar")}
        </Link>
      </AccountAuthLayout>
    );
  }

  return (
    <AccountAuthLayout {...layoutProps}>
      <p className="account-auth-muted">{t("Você já está autenticada.")}</p>
      <AccountMatchingPasswordForm language={language} onSuccess={onSuccess} />
    </AccountAuthLayout>
  );
}
