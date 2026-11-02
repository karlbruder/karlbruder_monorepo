import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { appCopy } from "@/utils/app-copy";
import { signInPathWithReturnTo } from "@/features/auth/utils/account-navigation";

export function AuthenticatedLayout() {
  const { authReady, session, sessionLapsed } = useAuthSession();
  const { language } = useLanguage();
  const loadingMessage = appCopy(language, "Carregando sua sessão...");
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
    return <Navigate to={signInPathWithReturnTo(returnTo, { sessionExpired: sessionLapsed })} replace />;
  }

  return <Outlet />;
}
