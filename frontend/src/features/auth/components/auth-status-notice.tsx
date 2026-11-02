import { appCopy } from "@/utils/app-copy";
import type { AppCopyKey, AppLanguage } from "@/utils/app-copy";

export function AuthStatusNotice({ language, kind }: { language: AppLanguage; kind: "expired" | "unavailable" }) {
  const t = (key: AppCopyKey) => appCopy(language, key);
  if (kind === "expired") {
    return (
      <div className="account-auth-notice info" role="status">
        <strong>{t("Sua sessão expirou")}</strong>
        <p className="account-auth-muted">{t("Entre novamente para continuar no torneio selecionado.")}</p>
      </div>
    );
  }
  return (
    <div className="account-auth-notice error" role="alert">
      <strong>{t("Serviço temporariamente indisponível")}</strong>
      <p className="account-auth-muted">{t("Não foi possível conectar ao serviço de acesso. Tente novamente em instantes.")}</p>
    </div>
  );
}
