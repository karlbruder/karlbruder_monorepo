import { useEffect, useState } from "react";
import "./App.css";
import { supabase } from "../supabaseClient";

function GoogleSignInButton({ onSignIn, loading }: { onSignIn: () => Promise<void>; loading?: boolean }) {
  return (
    <button
      className="google-btn"
      onClick={onSignIn}
      disabled={loading}
      aria-label="Sign in with Google"
      style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 12px" }}
    >
      {loading ? (
        "Signing in..."
      ) : (
        <>
          {/* Google icon (simple) */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M21.35 11.1h-9.18v2.92h5.26c-.23 1.36-1.48 3.98-5.26 3.98-3.16 0-5.74-2.6-5.74-5.8s2.58-5.8 5.74-5.8c1.79 0 3 0.76 3.69 1.41l2.52-2.44C17.3 3.13 15.46 2.2 12.9 2.2 7.8 2.2 3.9 6.34 3.9 11.3s3.9 9.1 9 9.1c5.19 0 8.61-3.63 8.61-8.76 0-.59-.06-1.04-.11-1.54z" fill="#4285F4"/>
          </svg>
          <span>Sign in with Google</span>
        </>
      )}
    </button>
  );
}

function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Get current session on load
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));

    // Listen to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
      // On success the browser will redirect to Google's consent screen
    } catch (err: any) {
      console.error("Google sign in error:", err);
      alert(`Sign in failed: ${err.message ?? err}`);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Sign out error:", error);
      alert("Sign out failed");
    }
  };

  if (!session) {
    return (
      <div className="app-center" style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <GoogleSignInButton onSignIn={signInWithGoogle} loading={loading} />
      </div>
    );
  }

  const user = session.user;

  return (
    <div className="app-center" style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
      <div style={{ textAlign: "center" }}>
        {user.user_metadata?.avatar_url || user.user_metadata?.picture ? (
          <img
            src={user.user_metadata.avatar_url ?? user.user_metadata.picture}
            alt={user.user_metadata?.name ?? "avatar"}
            style={{ width: 96, height: 96, borderRadius: "50%", objectFit: "cover", marginBottom: 12 }}
          />
        ) : null}
        <h2 style={{ margin: 0 }}>{user.user_metadata?.name ?? user.email}</h2>
        <p style={{ marginTop: 4, color: "#666" }}>{user.email}</p>
        <button onClick={signOut} style={{ marginTop: 12 }}>Sign out</button>
      </div>
    </div>
  );
}

export default App;
