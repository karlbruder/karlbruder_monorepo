import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { accountRoutes } from "@/config/account-routes";
import { emailConfirmationRedirectUrl } from "@/features/auth/utils/account-navigation";
import { signUp } from "@/features/auth/api/auth";
import { registrationCopy } from "@/utils/registration-language";
import type { RegistrationCopyKey, RegistrationLanguage } from "@/utils/registration-language";
import { isSupabaseAuthServiceUnavailable, supabaseAuthErrorMessage } from "@/features/auth/utils/supabase-auth-errors";
import { AccountAuthLayout, AuthServiceNotice, GoogleSignInButton } from "@/features/auth/components/account-auth-layout";

type Props = {
  returnTo: string;
  onSuccess: (email: string) => void;
  language: RegistrationLanguage;
  authLoading: boolean;
  authError: RegistrationCopyKey | null;
  onGoogleSignIn: (redirectTo: string) => Promise<void>;
  onLanguageChange: (language: RegistrationLanguage) => void;
};

export default function AccountSignUpPage({ returnTo, onSuccess, language, authLoading, authError, onGoogleSignIn, onLanguageChange }: Props) {
  const t = (key: RegistrationCopyKey) => registrationCopy(language, key);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setServiceUnavailable(false);
    setPending(true);
    try {
      const { error } = await signUp({
        email,
        password,
        options: { emailRedirectTo: emailConfirmationRedirectUrl() },
      });
      if (error) {
        if (isSupabaseAuthServiceUnavailable(error)) {
          setServiceUnavailable(true);
        } else {
          setFormError(supabaseAuthErrorMessage(error, language, "sign_up"));
        }
        return;
      }
      onSuccess(email);
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
      {authError && <p className="account-auth-error" role="alert">{t(authError)}</p>}
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
