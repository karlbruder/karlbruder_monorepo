import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppContext } from "@/app/app-context";
import { registrationCopy } from "@/utils/registration-language";
import { signInPathWithReturnTo } from "@/features/auth/utils/account-navigation";

export function RequireSessionRoute() {
  const { auth: { authReady, session, sessionLapsed }, language } = useAppContext();
  const loadingMessage = registrationCopy(language, "Carregando sua sessão...");
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
