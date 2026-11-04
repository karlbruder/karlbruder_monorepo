import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { getSession, onAuthStateChange, signInWithOAuth, signOut as requestSignOut } from "@/features/auth/api/auth";
import { setApiUnauthorizedHandler } from "@/lib/api-fetch";
import type { AppCopyKey } from "@/utils/app-copy";

export function useAuthSessionState() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<AppCopyKey | null>(null);
  const [sessionLapsed, setSessionLapsed] = useState(false);
  const userInitiatedSignOutRef = useRef(false);
  const previousAccountIdRef = useRef<string | undefined>(undefined);
  const expiredSignOutStartedRef = useRef(false);
  const queryClient = useQueryClient();
  const accountId = session?.user.id;

  useEffect(() => {
    const signedOut = previousAccountIdRef.current !== undefined && !accountId;
    previousAccountIdRef.current = accountId;
    if (signedOut) {
      queryClient.clear();
    }
    if (accountId) {
      expiredSignOutStartedRef.current = false;
    }
  }, [accountId, queryClient]);

  useEffect(() => {
    setApiUnauthorizedHandler(() => {
      if (expiredSignOutStartedRef.current) return;
      expiredSignOutStartedRef.current = true;
      userInitiatedSignOutRef.current = false;
      void requestSignOut().then(({ error }) => {
        if (error) setAuthError("Não foi possível sair. Tente novamente.");
      });
    });
    return () => setApiUnauthorizedHandler(null);
  }, []);

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
