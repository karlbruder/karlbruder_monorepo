import { Link } from "react-router-dom";
import { accountRoutes } from "@/config/account-routes";
import { signInPathWithReturnTo } from "@/features/auth/utils/account-navigation";
import { appCopy } from "@/utils/app-copy";
import type { AppLanguage } from "@/utils/app-copy";
import { GoogleSignInButton } from "@/features/auth/components/google-sign-in-button";
import "@/features/auth/components/account-auth.css";

type Props = {
  language: AppLanguage;
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
  const t = (key: Parameters<typeof appCopy>[1]) => appCopy(language, key);

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
