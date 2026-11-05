import { Link, Outlet } from "react-router-dom";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { useLanguage } from "@/hooks/use-language";
import LanguageToggle from "@/components/language-toggle";
import "@/features/tournament/components/payment-reviews.css";

export function StaffLayout() {
  const { session } = useAuthSession();
  const { language, changeLanguage } = useLanguage();
  const en = language === "en";
  return <main className="payment-reviews">
    <header><Link to="/">Karlbrüder · {en ? "Home" : "Início"}</Link><LanguageToggle language={language} onLanguageChange={changeLanguage} /></header>
    {session?.user.app_metadata?.karlbruder_role !== "admin" ? <p role="alert">{en ? "Staff access required." : "Acesso restrito à equipe."}</p> : <>
      <nav aria-label={en ? "Staff panel" : "Painel da equipe"}>
        <Link to="/staff/tournaments">{en ? "Tournaments" : "Torneios"}</Link>{" · "}
        <Link to="/staff/payment-reviews">{en ? "Payment verification" : "Conferência de pagamentos"}</Link>
      </nav>
      <Outlet />
    </>}
  </main>;
}
