import { Link, useSearchParams } from "react-router-dom";
import { accountRoutes, readReturnTo } from "../../accountRoutes";
import { registrationCopy } from "../../registrationLanguage";
import type { RegistrationCopyKey, RegistrationLanguage } from "../../registrationLanguage";
import { AccountAuthLayout } from "./AccountAuthLayout";

type Props = {
  language: RegistrationLanguage;
  onLanguageChange: (language: RegistrationLanguage) => void;
};

export default function AccountCheckEmailPage({ language, onLanguageChange }: Props) {
  const t = (key: RegistrationCopyKey) => registrationCopy(language, key);
  const [searchParams] = useSearchParams();
  const returnTo = readReturnTo(searchParams) ?? "/";
  const email = searchParams.get("email");

  return (
    <AccountAuthLayout
      language={language}
      onLanguageChange={onLanguageChange}
      title={t("Confira seu e-mail")}
      subtitle={t("Confira seu e-mail")}
    >
      <div className="account-auth-notice success" role="status">
        <strong>{t("Enviamos as instruções de verificação")}</strong>
        <p className="account-auth-muted">{t("Consulte sua caixa de entrada e siga o link para ativar o acesso.")}</p>
        {email && <p>{email}</p>}
      </div>
      <p className="account-auth-muted">{t("Após verificar seu e-mail, entre para continuar.")}</p>
      <Link className="account-auth-submit" to={`${accountRoutes.signIn}?returnTo=${encodeURIComponent(returnTo)}`} style={{ display: "inline-block", textAlign: "center", textDecoration: "none" }}>
        {t("Voltar para entrar")}
      </Link>
    </AccountAuthLayout>
  );
}
