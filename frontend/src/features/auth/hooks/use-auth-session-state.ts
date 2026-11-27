import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { getSession, onAuthStateChange, signInWithOAuth, signOut as requestSignOut } from "@/features/auth/api/auth";
import { setApiUnauthorizedHandler } from "@/lib/api-client";
import { endSessionScope, captureSessionScope, cancelSessionWork } from "@/lib/session-scope";
import type { AppCopyKey } from "@/utils/app-copy";

export function useAuthSessionState() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<AppCopyKey | null>(null);
  const [sessionLapsed, setSessionLapsed] = useState(false);
  const userInitiatedSignOutRef = useRef(false);
  const currentSessionRef = useRef<Session | null>(null);
  const expiredSignOutStartedRef = useRef(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    setApiUnauthorizedHandler((requestSession) => {
      if (!requestSession ||
        !requestSession.scope.isCurrent() ||
        requestSession.accountId !== currentSessionRef.current?.user.id ||
        requestSession.accessToken !== currentSessionRef.current?.access_token) return;
      if (expiredSignOutStartedRef.current) return;
      expiredSignOutStartedRef.current = true;
      userInitiatedSignOutRef.current = false;
      const scope = captureSessionScope();
      cancelSessionWork();
      void requestSignOut().then(({ error }) => {
        if (error) throw error;
      }).catch(() => {
        if (scope === captureSessionScope()) {
          endSessionScope();
          expiredSignOutStartedRef.current = false;
          setAuthError("Não foi possível sair. Tente novamente.");
        }
      });
    });
    return () => setApiUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    let active = true;
    let authEventReceived = false;
    const applySession = (nextSession: Session | null) => {
      const previousSession = currentSessionRef.current;
      if (previousSession?.user.id !== nextSession?.user.id) {
        endSessionScope();
        expiredSignOutStartedRef.current = false;
        if (previousSession) {
          void queryClient.cancelQueries();
          queryClient.clear();
        }
      }
      if (previousSession && !nextSession && !userInitiatedSignOutRef.current) setSessionLapsed(true);
      if (nextSession && previousSession?.user.id !== nextSession.user.id) userInitiatedSignOutRef.current = false;
      currentSessionRef.current = nextSession;
      setSession(nextSession);
    };
    getSession().then(({ data, error }) => {
      if (!active || authEventReceived) return;
      applySession(data.session);
      setAuthError(error ? "Não foi possível recuperar sua sessão." : null);
      setAuthReady(true);
    }).catch(() => {
      if (active && !authEventReceived) {
        setAuthError("Não foi possível recuperar sua sessão.");
        setAuthReady(true);
      }
    });

    const { data: { subscription } } = onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      authEventReceived = true;
      applySession(nextSession);
      setAuthReady(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [queryClient]);

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
    const scope = captureSessionScope();
    userInitiatedSignOutRef.current = true;
    setSessionLapsed(false);
    cancelSessionWork();
    try {
      const { error } = await requestSignOut();
      if (error) throw error;
    } catch {
      if (scope === captureSessionScope()) {
        endSessionScope();
        userInitiatedSignOutRef.current = false;
        setAuthError("Não foi possível sair. Tente novamente.");
      }
    }
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
