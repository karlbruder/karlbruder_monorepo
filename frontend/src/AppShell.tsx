import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Route, Routes } from "react-router-dom";
import "./App.css";
import { supabase } from "../supabaseClient";
import TournamentRegistration from "./pages/TournamentRegistration";

function GoogleSignInButton({ onSignIn, loading }: { onSignIn: () => Promise<void>; loading: boolean }) {
  return (
    <button className="google-btn" type="button" onClick={onSignIn} disabled={loading}>
      {loading ? "Entrando..." : "Entrar com Google"}
    </button>
  );
}

function AppShell() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

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

  const signInWithGoogle = async () => {
    try {
      setAuthLoading(true);
      setAuthError(null);
      const redirectTo = `${window.location.origin}${window.location.pathname}${window.location.search}`;
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

  return (
    <Routes>
      <Route path="/tournaments/registration" element={
        <TournamentRegistration
          session={session}
          authReady={authReady}
          authError={authError}
          onSignOut={signOut}
          signInButton={<GoogleSignInButton onSignIn={signInWithGoogle} loading={authLoading} />}
        />
      } />
      <Route path="*" element={
        <main className="app-center">
          {!authReady ? (
            <p role="status">Carregando sua sessão...</p>
          ) : session ? (
            <div className="home-account">
              <h1>Karlbrüder</h1>
              <p>{session.user.user_metadata?.name ?? session.user.email}</p>
              <a href="/tournaments/registration">Inscrição Monomachia</a>
              <button type="button" onClick={signOut}>Sair</button>
            </div>
          ) : (
            <GoogleSignInButton onSignIn={signInWithGoogle} loading={authLoading} />
          )}
          {authError && <p role="alert">{authError}</p>}
        </main>
      } />
    </Routes>
  );
}

export default AppShell;
