import { NavLink, Outlet } from "react-router-dom";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { useLanguage } from "@/hooks/use-language";
import { ApplicationFooter } from "@/components/application-footer";
import { appCopy } from "@/utils/app-copy";
import "@/features/tournament/components/payment-reviews.css";

export function StaffLayout() {
  const { session } = useAuthSession();
  const { language } = useLanguage();
  const en = language === "en";
  return (
    <div className="application-page" lang={en ? "en-US" : "pt-BR"}>
      <main className="application-body payment-reviews">
        <p className="eyebrow">{en ? "Karlbrüder Guild" : "Guilda Karlbrüder"}</p>
        {session?.user.app_metadata?.karlbruder_role !== "admin" ? (
          <p role="alert">{en ? "Staff access required." : "Acesso restrito à equipe."}</p>
        ) : (
          <>
            <nav className="staff-nav" aria-label={en ? "Guild panel" : "Painel da Guilda"}>
              <NavLink to="/staff/tournaments">{en ? "Tournaments" : "Torneios"}</NavLink>
              <NavLink to="/staff/payment-reviews">{en ? "Payment verification" : "Conferência de pagamentos"}</NavLink>
              <NavLink to="/staff/refunds">{appCopy(language, "Reembolsos")}</NavLink>
              <NavLink to="/staff/users">{en ? "User accounts" : "Contas de usuários"}</NavLink>
            </nav>
            <Outlet />
          </>
        )}
      </main>
      <ApplicationFooter />
    </div>
  );
}
