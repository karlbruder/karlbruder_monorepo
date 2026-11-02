import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { accountRoutes, passwordRecoveryRedirectUrl, readReturnTo } from "../../accountRoutes";
import { supabase } from "../../../supabaseClient";
import { registrationCopy } from "../../registrationLanguage";
import type { RegistrationCopyKey, RegistrationLanguage } from "../../registrationLanguage";
import { isSupabaseAuthServiceUnavailable, supabaseAuthErrorMessage } from "../../supabaseAuthErrors";
import { AccountAuthLayout, AuthServiceNotice } from "./AccountAuthLayout";

type Props = {
  language: RegistrationLanguage;
  onLanguageChange: (language: RegistrationLanguage) => void;
};

export default function AccountRecoverPage({ language, onLanguageChange }: Props) {
  const t = (key: RegistrationCopyKey) => registrationCopy(language, key);
  const [searchParams] = useSearchParams();
  const returnTo = readReturnTo(searchParams) ?? accountRoutes.signIn;
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setFormError(null);
    setServiceUnavailable(false);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: passwordRecoveryRedirectUrl(),
      });
      if (error) {
        if (isSupabaseAuthServiceUnavailable(error)) {
          setServiceUnavailable(true);
        } else {
          setFormError(supabaseAuthErrorMessage(error, language, "recover"));
        }
        return;
      }
      setSent(true);
    } catch {
      setServiceUnavailable(true);
    } finally {
      setPending(false);
    }
  };

  return (
    <AccountAuthLayout
      language={language}
      onLanguageChange={onLanguageChange}
      title={t("Recuperar acesso")}
      subtitle={t("Recuperar acesso")}
      showRegistrationContext={false}
    >
      {serviceUnavailable && <AuthServiceNotice language={language} kind="unavailable" />}
      {sent ? (
        <div className="account-auth-notice success" role="status">
          <strong>{t("Enviamos as instruções de verificação")}</strong>
          <p className="account-auth-muted">{t("Consulte sua caixa de entrada e siga o link para ativar o acesso.")}</p>
        </div>
      ) : (
        <form onSubmit={submit}>
          <div className="account-auth-field">
            <label htmlFor="recover-email">{t("E-mail")}</label>
            <input
              id="recover-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <button className="account-auth-submit" type="submit" disabled={pending}>
            {t("Enviar link de recuperação")}
          </button>
        </form>
      )}
      <hr className="account-auth-divider" />
      <p className="account-auth-switch">
        {t("Já tem acesso?")}{" "}
        <Link to={`${accountRoutes.signIn}?returnTo=${encodeURIComponent(returnTo)}`}>{t("Entrar")}</Link>
      </p>
      {formError && <p className="account-auth-error" role="alert">{formError}</p>}
    </AccountAuthLayout>
  );
}
