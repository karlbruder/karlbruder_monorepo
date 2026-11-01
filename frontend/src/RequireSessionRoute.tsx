import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { signInPathWithReturnTo } from "./accountRoutes";

type Props = {
  authReady: boolean;
  session: Session | null;
  loadingMessage: string;
  children: ReactNode;
};

export function RequireSessionRoute({ authReady, session, loadingMessage, children }: Props) {
  const location = useLocation();
  const returnTo = `${location.pathname}${location.search}`;

  if (!authReady) {
    return (
      <main className="app-center">
        <p role="status">{loadingMessage}</p>
      </main>
    );
  }

  if (!session) {
    return <Navigate to={signInPathWithReturnTo(returnTo)} replace />;
  }

  return children;
}
