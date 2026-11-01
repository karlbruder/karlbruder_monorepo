import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { accountRoutes, readReturnTo } from "../../accountRoutes";
import { supabase } from "../../../supabaseClient";
import { registrationCopy } from "../../registrationLanguage";
import type { RegistrationCopyKey, RegistrationLanguage } from "../../registrationLanguage";
import { AccountAuthLayout, AuthServiceNotice, GoogleSignInButton } from "./AccountAuthLayout";

type Props = {
  language: RegistrationLanguage;
  authLoading: boolean;
  onGoogleSignIn: (redirectTo: string) => Promise<void>;
};

export default function AccountSignInPage({ language, authLoading, onGoogleSignIn }: Props) {
  const t = (key: RegistrationCopyKey) => registrationCopy(language, key);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = readReturnTo(searchParams) ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setFormError(null);
    setServiceUnavailable(false);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setFormError(error.message);
        return;
      }
      navigate(returnTo, { replace: true });
    } catch {
      setServiceUnavailable(true);
    } finally {
      setPending(false);
    }
  };

  const googleRedirectTo = `${window.location.origin}${returnTo}`;

  return (
    <AccountAuthLayout language={language} title={t("Entrar na Karlbrüder")} subtitle={t("Boas-vindas de volta.")}>
      {serviceUnavailable && <AuthServiceNotice language={language} kind="unavailable" />}
      <GoogleSignInButton language={language} loading={authLoading} onSignIn={() => onGoogleSignIn(googleRedirectTo)} />
      <p className="account-auth-or">{t("ou use seu e-mail")}</p>
      <form onSubmit={submit}>
        <div className="account-auth-field">
          <label htmlFor="sign-in-email">{t("E-mail")}</label>
          <input
            id="sign-in-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <div className="account-auth-field">
          <label htmlFor="sign-in-password">{t("Senha")}</label>
          <input
            id="sign-in-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>
        <button className="account-auth-submit" type="submit" disabled={pending}>
          {t(pending ? "Entrando..." : "Entrar")}
        </button>
      </form>
      <div className="actions" style={{ marginTop: "0.75rem" }}>
        <Link className="account-auth-text-button" to={`${accountRoutes.recover}?returnTo=${encodeURIComponent(returnTo)}`}>
          {t("Esqueci minha senha")}
        </Link>
      </div>
      <hr className="account-auth-divider" />
      <p className="account-auth-switch">
        {t("Ainda não tem conta?")}{" "}
        <Link to={`${accountRoutes.signUp}?returnTo=${encodeURIComponent(returnTo)}`}>{t("Criar conta")}</Link>
      </p>
      {formError && <p className="account-auth-error" role="alert">{formError}</p>}
    </AccountAuthLayout>
  );
}
