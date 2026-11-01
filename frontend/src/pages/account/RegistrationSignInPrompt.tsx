import { Link } from "react-router-dom";
import { accountRoutes, signInPathWithReturnTo } from "../../accountRoutes";
import { registrationCopy } from "../../registrationLanguage";
import type { RegistrationLanguage } from "../../registrationLanguage";
import { GoogleSignInButton } from "./AccountAuthLayout";
import "./AccountAuth.css";

type Props = {
  language: RegistrationLanguage;
  returnTo: string;
  googleLoading: boolean;
  onGoogleSignIn: () => Promise<void>;
};

export default function RegistrationSignInPrompt({
  language,
  returnTo,
  googleLoading,
  onGoogleSignIn,
}: Props) {
  const t = (key: Parameters<typeof registrationCopy>[1]) => registrationCopy(language, key);

  return (
    <div className="registration-sign-in-actions">
      <GoogleSignInButton language={language} loading={googleLoading} onSignIn={onGoogleSignIn} labelKey="Entrar com Google" />
      <Link className="account-email-link" to={signInPathWithReturnTo(returnTo)}>
        {t("Entrar com e-mail")}
      </Link>
      <p className="account-auth-muted">
        {t("Ainda não tem conta?")}{" "}
        <Link to={`${accountRoutes.signUp}?returnTo=${encodeURIComponent(returnTo)}`}>{t("Criar conta")}</Link>
      </p>
    </div>
  );
}
