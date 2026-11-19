import { NavLink, Outlet, useLocation } from "react-router-dom";
import { ApplicationHeader } from "@/components/application-header";
import { accountRoutes } from "@/config/account-routes";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { accountProfile } from "@/features/auth/utils/account-profile";
import { useLanguage } from "@/hooks/use-language";
import { appCopy } from "@/utils/app-copy";

export function ApplicationLayout() {
  const { authReady, session, signOut, authError } = useAuthSession();
  const { language, changeLanguage } = useLanguage();
  const location = useLocation();
  const user = authReady ? session?.user : undefined;
  const en = language === "en";
  const signOutError = authError === "Não foi possível sair. Tente novamente.";

  return (
    <div className="application-shell" lang={en ? "en-US" : "pt-BR"}>
      <ApplicationHeader
        language={language}
        onLanguageChange={changeLanguage}
        routeKey={location.key}
        account={user ? { ...accountProfile(user), onSignOut: signOut } : undefined}
        navigation={<>
          {user && <NavLink to="/" end>{en ? "Home" : "Início"}</NavLink>}
          <NavLink to="/tournaments/registration">Monomachia</NavLink>
          {user && <NavLink to="/registrations">{en ? "My registrations" : "Minhas inscrições"}</NavLink>}
          {user?.app_metadata?.karlbruder_role === "admin" && (
            <NavLink to="/staff/tournaments" className={location.pathname.startsWith("/staff/") ? "current-section" : undefined}>
              {en ? "Administration" : "Administração"}
            </NavLink>
          )}
          {authReady && !user && <NavLink to={accountRoutes.signIn}>{appCopy(language, "Entrar")}</NavLink>}
        </>}
      />
      {signOutError && <p className="error-message shell-notice" role="alert">{appCopy(language, authError)}</p>}
      <Outlet />
    </div>
  );
}
