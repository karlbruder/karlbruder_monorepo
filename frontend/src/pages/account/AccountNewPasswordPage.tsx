import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { accountRoutes } from "../../accountRoutes";
import { supabase } from "../../../supabaseClient";
import { registrationCopy } from "../../registrationLanguage";
import type { RegistrationCopyKey, RegistrationLanguage } from "../../registrationLanguage";
import { AccountAuthLayout, AuthServiceNotice } from "./AccountAuthLayout";

type Props = {
  language: RegistrationLanguage;
  authReady: boolean;
  hasSession: boolean;
};

export default function AccountNewPasswordPage({ language, authReady, hasSession }: Props) {
  const t = (key: RegistrationCopyKey) => registrationCopy(language, key);
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password !== passwordRepeat) {
      setFormError(t("As senhas precisam ser iguais."));
      return;
    }
    setPending(true);
    setFormError(null);
    setServiceUnavailable(false);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setFormError(error.message);
        return;
      }
      navigate(accountRoutes.signIn, { replace: true });
    } catch {
      setServiceUnavailable(true);
    } finally {
      setPending(false);
    }
  };

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
      {serviceUnavailable && <AuthServiceNotice language={language} kind="unavailable" />}
      <form onSubmit={submit}>
        <div className="account-auth-field">
          <label htmlFor="new-password">{t("Nova senha")}</label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>
        <div className="account-auth-field">
          <label htmlFor="new-password-repeat">{t("Repita a nova senha")}</label>
          <input
            id="new-password-repeat"
            type="password"
            autoComplete="new-password"
            value={passwordRepeat}
            onChange={(event) => setPasswordRepeat(event.target.value)}
            required
          />
        </div>
        <button className="account-auth-submit" type="submit" disabled={pending}>
          {t("Atualizar senha")}
        </button>
      </form>
      {formError && <p className="account-auth-error" role="alert">{formError}</p>}
    </AccountAuthLayout>
  );
}
