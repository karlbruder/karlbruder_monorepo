import { appCopy } from "@/utils/app-copy";
import type { AppCopyKey, AppLanguage } from "@/utils/app-copy";

export function GoogleSignInButton({
  language,
  loading,
  onSignIn,
  secondary = true,
  labelKey = "Continuar com Google",
}: {
  language: AppLanguage;
  loading: boolean;
  onSignIn: () => Promise<void>;
  secondary?: boolean;
  labelKey?: AppCopyKey;
}) {
  const t = (key: AppCopyKey) => appCopy(language, key);
  return (
    <button
      className={`google-btn${secondary ? " secondary" : ""}`}
      type="button"
      onClick={onSignIn}
      disabled={loading}
    >
      {t(loading ? "Entrando..." : labelKey)}
    </button>
  );
}

