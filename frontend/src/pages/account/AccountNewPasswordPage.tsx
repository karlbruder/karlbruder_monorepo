import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { accountRoutes, readReturnTo } from "../../accountRoutes";
import { registrationCopy } from "../../registrationLanguage";
import type { RegistrationCopyKey, RegistrationLanguage } from "../../registrationLanguage";
import { useSupabaseAuthRedirectError } from "../../useSupabaseAuthRedirectError";
import { AccountAuthLayout, AuthServiceNotice } from "./AccountAuthLayout";
import { AccountMatchingPasswordForm } from "./AccountMatchingPasswordForm";

type Props = {
  language: RegistrationLanguage;
  onLanguageChange: (language: RegistrationLanguage) => void;
  authReady: boolean;
  hasSession: boolean;
};

export default function AccountNewPasswordPage({ language, onLanguageChange, authReady, hasSession }: Props) {
  const t = (key: RegistrationCopyKey) => registrationCopy(language, key);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = readReturnTo(searchParams) ?? "/";
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
      <AccountMatchingPasswordForm language={language} onSuccess={() => navigate(returnTo, { replace: true })} />
    </AccountAuthLayout>
  );
}
