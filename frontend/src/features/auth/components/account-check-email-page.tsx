import { Link } from "react-router-dom";
import { accountRoutes } from "@/config/account-routes";
import { registrationCopy } from "@/utils/registration-language";
import type { RegistrationCopyKey, RegistrationLanguage } from "@/utils/registration-language";
import { AccountAuthLayout } from "@/features/auth/components/account-auth-layout";

type Props = {
  returnTo: string;
  email: string | null;
  language: RegistrationLanguage;
  onLanguageChange: (language: RegistrationLanguage) => void;
};

export default function AccountCheckEmailPage({ returnTo, email, language, onLanguageChange }: Props) {
  const t = (key: RegistrationCopyKey) => registrationCopy(language, key);

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
