import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { updateUser } from "@/features/auth/api/auth";
import { appCopy } from "@/utils/app-copy";
import type { AppCopyKey, AppLanguage } from "@/utils/app-copy";
import { isSupabaseAuthServiceUnavailable, supabaseAuthErrorMessage } from "@/features/auth/utils/supabase-auth-errors";
import { AuthStatusNotice } from "@/features/auth/components/auth-status-notice";

type Props = {
  language: AppLanguage;
  onSuccess: () => void;
  children?: ReactNode;
};

export function PasswordUpdateForm({ language, onSuccess, children }: Props) {
  const t = (key: AppCopyKey) => appCopy(language, key);
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
      const { error } = await updateUser({ password });
      if (error) {
        if (isSupabaseAuthServiceUnavailable(error)) {
          setServiceUnavailable(true);
        } else {
          setFormError(supabaseAuthErrorMessage(error, language, "update_password"));
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
      {children}
      {serviceUnavailable && <AuthStatusNotice language={language} kind="unavailable" />}
      <form onSubmit={submit}>
        <div className="account-auth-field">
          <label htmlFor="matching-password">{t("Nova senha")}</label>
          <input
            id="matching-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>
        <div className="account-auth-field">
          <label htmlFor="matching-password-repeat">{t("Repita a nova senha")}</label>
          <input
            id="matching-password-repeat"
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
    </>
  );
}
