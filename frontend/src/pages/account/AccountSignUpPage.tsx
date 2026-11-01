import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { accountRoutes, emailConfirmationRedirectUrl, readReturnTo } from "../../accountRoutes";
import { supabase } from "../../../supabaseClient";
import { registrationCopy } from "../../registrationLanguage";
import type { RegistrationCopyKey, RegistrationLanguage } from "../../registrationLanguage";
import { AccountAuthLayout, AuthServiceNotice, GoogleSignInButton } from "./AccountAuthLayout";

type Props = {
  language: RegistrationLanguage;
  authLoading: boolean;
  onGoogleSignIn: (redirectTo: string) => Promise<void>;
  onLanguageChange: (language: RegistrationLanguage) => void;
};

export default function AccountSignUpPage({ language, authLoading, onGoogleSignIn, onLanguageChange }: Props) {
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
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: emailConfirmationRedirectUrl() },
      });
      if (error) {
        setFormError(error.message);
        return;
      }
      navigate(`${accountRoutes.checkEmail}?email=${encodeURIComponent(email)}&returnTo=${encodeURIComponent(returnTo)}`, { replace: true });
    } catch {
      setServiceUnavailable(true);
    } finally {
      setPending(false);
    }
  };

  const googleRedirectTo = `${window.location.origin}${returnTo}`;

  return (
    <AccountAuthLayout
      language={language}
      onLanguageChange={onLanguageChange}
      title={t("Criar conta na Karlbrüder")}
      subtitle={t("Faça parte.")}
    >
      {serviceUnavailable && <AuthServiceNotice language={language} kind="unavailable" />}
      <GoogleSignInButton language={language} loading={authLoading} onSignIn={() => onGoogleSignIn(googleRedirectTo)} />
      <p className="account-auth-or">{t("ou use seu e-mail")}</p>
      <form onSubmit={submit}>
        <div className="account-auth-field">
          <label htmlFor="sign-up-email">{t("E-mail")}</label>
          <input
            id="sign-up-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <div className="account-auth-field">
          <label htmlFor="sign-up-password">{t("Senha")}</label>
          <input
            id="sign-up-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>
        <button className="account-auth-submit" type="submit" disabled={pending}>
          {t("Criar minha conta")}
        </button>
      </form>
      <hr className="account-auth-divider" />
      <p className="account-auth-switch">
        {t("Já tem acesso?")}{" "}
        <Link to={`${accountRoutes.signIn}?returnTo=${encodeURIComponent(returnTo)}`}>{t("Entrar")}</Link>
      </p>
      {formError && <p className="account-auth-error" role="alert">{formError}</p>}
    </AccountAuthLayout>
  );
}
