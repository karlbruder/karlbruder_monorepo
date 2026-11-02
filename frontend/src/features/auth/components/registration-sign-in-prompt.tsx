import { Link } from "react-router-dom";
import { accountRoutes } from "@/config/account-routes";
import { signInPathWithReturnTo } from "@/features/auth/utils/account-navigation";
import { registrationCopy } from "@/utils/registration-language";
import type { RegistrationLanguage } from "@/utils/registration-language";
import { GoogleSignInButton } from "@/features/auth/components/account-auth-layout";
import "@/features/auth/components/account-auth.css";

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
