import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { accountRoutes } from "@/config/account-routes";
import { signInWithPassword } from "@/features/auth/api/auth";
import { appCopy } from "@/utils/app-copy";
import type { AppCopyKey, AppLanguage } from "@/utils/app-copy";
import { isSupabaseAuthServiceUnavailable, supabaseAuthErrorMessage } from "@/features/auth/utils/supabase-auth-errors";
import { AuthStatusNotice } from "@/features/auth/components/auth-status-notice";
import { GoogleSignInButton } from "@/features/auth/components/google-sign-in-button";

type Props = {
  redirectError: string | null;
  returnTo: string;
  sessionExpiredNotice: boolean;
  onSuccess: () => void;
  language: AppLanguage;
  authLoading: boolean;
  authError: AppCopyKey | null;
  onGoogleSignIn: () => Promise<void>;
  onClearSessionLapsedNotice: () => void;
};

export default function SignInForm({
  redirectError,
  returnTo,
  sessionExpiredNotice,
  onSuccess,
  language,
  authLoading,
  authError,
  onGoogleSignIn,
  onClearSessionLapsedNotice,
}: Props) {
  const t = (key: AppCopyKey) => appCopy(language, key);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);

  useEffect(() => {
    onClearSessionLapsedNotice();
  }, [onClearSessionLapsedNotice]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setFormError(null);
    setServiceUnavailable(false);
    try {
      const { error } = await signInWithPassword({ email, password });
      if (error) {
        if (isSupabaseAuthServiceUnavailable(error)) {
          setServiceUnavailable(true);
        } else {
          setFormError(supabaseAuthErrorMessage(error, language, "sign_in"));
        }
        return;
      }
      onSuccess();
    } catch {
      setServiceUnavailable(true);
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      {sessionExpiredNotice && <AuthStatusNotice language={language} kind="expired" />}
      {serviceUnavailable && <AuthStatusNotice language={language} kind="unavailable" />}
      {authError && <p className="account-auth-error" role="alert">{t(authError)}</p>}
      <GoogleSignInButton language={language} loading={authLoading} onSignIn={onGoogleSignIn} />
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
      {!formError && redirectError && <p className="account-auth-error" role="alert">{redirectError}</p>}
    </>
  );
}
