import { Link, useNavigate } from "react-router-dom";
import { accountRoutes } from "../../accountRoutes";
import { registrationCopy } from "../../registrationLanguage";
import type { RegistrationCopyKey, RegistrationLanguage } from "../../registrationLanguage";
import { AccountAuthLayout, AuthServiceNotice } from "./AccountAuthLayout";
import { AccountMatchingPasswordForm } from "./AccountMatchingPasswordForm";

type Props = {
  language: RegistrationLanguage;
  onLanguageChange: (language: RegistrationLanguage) => void;
  authReady: boolean;
  hasSession: boolean;
};

export default function AccountChangePasswordPage({ language, onLanguageChange, authReady, hasSession }: Props) {
  const t = (key: RegistrationCopyKey) => registrationCopy(language, key);
  const navigate = useNavigate();
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
      <AccountMatchingPasswordForm language={language} onSuccess={() => navigate("/", { replace: true })} />
    </AccountAuthLayout>
  );
}
