import { Link, useNavigate } from "react-router-dom";
import { accountRoutes } from "../../accountRoutes";
import { registrationCopy } from "../../registrationLanguage";
import type { RegistrationCopyKey, RegistrationLanguage } from "../../registrationLanguage";
import { AccountAuthLayout, AuthServiceNotice } from "./AccountAuthLayout";
import { AccountMatchingPasswordForm } from "./AccountMatchingPasswordForm";

type Props = {
  language: RegistrationLanguage;
  authReady: boolean;
  hasSession: boolean;
};

export default function AccountNewPasswordPage({ language, authReady, hasSession }: Props) {
  const t = (key: RegistrationCopyKey) => registrationCopy(language, key);
  const navigate = useNavigate();

  if (!authReady) {
    return (
      <AccountAuthLayout language={language} title={t("Escolha uma nova senha")} subtitle={t("Escolha uma nova senha")} showRegistrationContext={false}>
        <p role="status">{t("Carregando sua sessão...")}</p>
      </AccountAuthLayout>
    );
  }

  if (!hasSession) {
    return (
      <AccountAuthLayout language={language} title={t("Escolha uma nova senha")} subtitle={t("Escolha uma nova senha")} showRegistrationContext={false}>
        <AuthServiceNotice language={language} kind="expired" />
        <Link className="account-auth-submit" to={accountRoutes.signIn} style={{ display: "inline-block", textAlign: "center", textDecoration: "none" }}>
          {t("Voltar para entrar")}
        </Link>
      </AccountAuthLayout>
    );
  }

  return (
    <AccountAuthLayout language={language} title={t("Escolha uma nova senha")} subtitle={t("Escolha uma nova senha")} showRegistrationContext={false}>
      <AccountMatchingPasswordForm language={language} onSuccess={() => navigate(accountRoutes.signIn, { replace: true })} />
    </AccountAuthLayout>
  );
}
