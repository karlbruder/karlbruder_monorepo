import { Link } from "react-router-dom";
import { accountRoutes } from "@/config/account-routes";
import { appCopy } from "@/utils/app-copy";
import type { AppCopyKey, AppLanguage } from "@/utils/app-copy";

type Props = {
  returnTo: string;
  email: string | null;
  language: AppLanguage;
};

export default function EmailConfirmationNotice({ returnTo, email, language }: Props) {
  const t = (key: AppCopyKey) => appCopy(language, key);

  return (
    <>
      <div className="account-auth-notice success" role="status">
        <strong>{t("Enviamos as instruções de verificação")}</strong>
        <p className="account-auth-muted">{t("Consulte sua caixa de entrada e siga o link para ativar o acesso.")}</p>
        {email && <p>{email}</p>}
      </div>
      <p className="account-auth-muted">{t("Após verificar seu e-mail, entre para continuar.")}</p>
      <Link className="account-auth-submit" to={`${accountRoutes.signIn}?returnTo=${encodeURIComponent(returnTo)}`} style={{ display: "inline-block", textAlign: "center", textDecoration: "none" }}>
        {t("Voltar para entrar")}
      </Link>
    </>
  );
}
