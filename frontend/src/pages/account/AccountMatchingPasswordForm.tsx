import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { supabase } from "../../../supabaseClient";
import { registrationCopy } from "../../registrationLanguage";
import type { RegistrationCopyKey, RegistrationLanguage } from "../../registrationLanguage";
import { isSupabaseAuthServiceUnavailable, supabaseAuthErrorMessage } from "../../supabaseAuthErrors";
import { AuthServiceNotice } from "./AccountAuthLayout";

type Props = {
  language: RegistrationLanguage;
  onSuccess: () => void;
  children?: ReactNode;
};

export function AccountMatchingPasswordForm({ language, onSuccess, children }: Props) {
  const t = (key: RegistrationCopyKey) => registrationCopy(language, key);
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
      const { error } = await supabase.auth.updateUser({ password });
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
      {serviceUnavailable && <AuthServiceNotice language={language} kind="unavailable" />}
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
