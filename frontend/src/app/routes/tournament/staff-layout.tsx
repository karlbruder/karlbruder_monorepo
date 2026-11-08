import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { useLanguage } from "@/hooks/use-language";
import { ApplicationHeader } from "@/components/application-header";
import { ApplicationFooter } from "@/components/application-footer";
import "@/features/tournament/components/payment-reviews.css";

export function StaffLayout() {
  const { session } = useAuthSession();
  const { language, changeLanguage } = useLanguage();
  const en = language === "en";
  return (
    <div className="application-page" lang={en ? "en-US" : "pt-BR"}>
      <ApplicationHeader
        language={language}
        onLanguageChange={changeLanguage}
        navigation={<Link to="/">{en ? "Home" : "Início"}</Link>}
      />
      <main className="application-body payment-reviews">
        <p className="eyebrow">{en ? "Karlbrüder staff" : "Equipe Karlbrüder"}</p>
        {session?.user.app_metadata?.karlbruder_role !== "admin" ? (
          <p role="alert">{en ? "Staff access required." : "Acesso restrito à equipe."}</p>
        ) : (
          <>
            <nav className="staff-nav" aria-label={en ? "Staff panel" : "Painel da equipe"}>
              <NavLink to="/staff/tournaments">{en ? "Tournaments" : "Torneios"}</NavLink>
              <NavLink to="/staff/payment-reviews">{en ? "Payment verification" : "Conferência de pagamentos"}</NavLink>
              <NavLink to="/staff/users">{en ? "User accounts" : "Contas de usuários"}</NavLink>
            </nav>
            <Outlet />
          </>
        )}
      </main>
      <ApplicationFooter language={language} />
    </div>
  );
}
