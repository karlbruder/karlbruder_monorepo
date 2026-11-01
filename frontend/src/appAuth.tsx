import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../supabaseClient";
import type { RegistrationCopyKey } from "./registrationLanguage";

export function useAppAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<RegistrationCopyKey | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      setSession(data.session);
      setAuthError(error ? "Não foi possível recuperar sua sessão." : null);
      setAuthReady(true);
    }).catch(() => {
      if (active) {
        setAuthError("Não foi possível recuperar sua sessão.");
        setAuthReady(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setSession(nextSession);
        setAuthReady(true);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async (redirectTo: string) => {
    try {
      setAuthLoading(true);
      setAuthError(null);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) throw error;
    } catch {
      setAuthError("Não foi possível entrar com Google. Tente novamente.");
    } finally {
      setAuthLoading(false);
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) setAuthError("Não foi possível sair. Tente novamente.");
  };

  const clearAuthError = () => setAuthError(null);

  return {
    session,
    authReady,
    authLoading,
    authError,
    signInWithGoogle,
    signOut,
    clearAuthError,
    setAuthError,
  };
}
