import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSession, onAuthStateChange, signInWithOAuth, signOut as requestSignOut } from "@/features/auth/api/auth";
import type { RegistrationCopyKey } from "@/utils/registration-language";

export function useAppAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<RegistrationCopyKey | null>(null);
  const [sessionLapsed, setSessionLapsed] = useState(false);
  const userInitiatedSignOutRef = useRef(false);

  useEffect(() => {
    let active = true;
    getSession().then(({ data, error }) => {
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

    const { data: { subscription } } = onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession((previousSession) => {
        if (previousSession && !nextSession && !userInitiatedSignOutRef.current) {
          setSessionLapsed(true);
        }
        return nextSession;
      });
      setAuthReady(true);
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
      const { error } = await signInWithOAuth({
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
    userInitiatedSignOutRef.current = true;
    setSessionLapsed(false);
    const { error } = await requestSignOut();
    if (error) setAuthError("Não foi possível sair. Tente novamente.");
  };

  const clearSessionLapsedNotice = () => setSessionLapsed(false);

  return {
    session,
    authReady,
    authLoading,
    authError,
    sessionLapsed,
    signInWithGoogle,
    signOut,
    clearSessionLapsedNotice,
  };
}
