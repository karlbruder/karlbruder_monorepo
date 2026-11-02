import { Link } from "react-router-dom";
import { accountRoutes } from "@/config/account-routes";
import { appCopy } from "@/utils/app-copy";
import type { AppCopyKey, AppLanguage } from "@/utils/app-copy";
import { AuthStatusNotice } from "@/features/auth/components/auth-status-notice";
import { PasswordUpdateForm } from "@/features/auth/components/password-update-form";

type Props = {
  redirectError: string | null;
  onSuccess: () => void;
  language: AppLanguage;
  authReady: boolean;
  hasSession: boolean;
};

export default function PasswordResetPanel({ redirectError, onSuccess, language, authReady, hasSession }: Props) {
  const t = (key: AppCopyKey) => appCopy(language, key);

  if (!authReady) {
    return <p role="status">{t("Carregando sua sessão...")}</p>;
  }

  if (!hasSession) {
    return (
      <>
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
            <AuthStatusNotice language={language} kind="expired" />
            <Link
              className="account-auth-submit"
              to={accountRoutes.signIn}
              style={{ display: "inline-block", textAlign: "center", textDecoration: "none" }}
            >
              {t("Voltar para entrar")}
            </Link>
          </>
        )}
      </>
    );
  }

  return (
    <>
      {redirectError && <p className="account-auth-error" role="alert">{redirectError}</p>}
      <PasswordUpdateForm language={language} onSuccess={onSuccess} />
    </>
  );
}
