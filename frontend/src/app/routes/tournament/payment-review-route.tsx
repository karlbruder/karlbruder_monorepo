import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { PaymentReviewQueue } from "@/features/tournament/components/payment-review-queue";
import { PaymentReviewPanel } from "@/features/tournament/components/payment-review-panel";
import LanguageToggle from "@/components/language-toggle";
import { useLanguage } from "@/hooks/use-language";
import { appCopy } from "@/utils/app-copy";
import "@/features/tournament/components/payment-reviews.css";

export function PaymentReviewRoute() {
  const { session } = useAuthSession();
  const { language, changeLanguage } = useLanguage();
  const { registrationNumber } = useParams();
  const navigate = useNavigate();
  const t = (key: Parameters<typeof appCopy>[1]) => appCopy(language, key);
  return <main className="payment-reviews">
    <header><Link to="/">Karlbrüder · {t("Início")}</Link><LanguageToggle language={language} onLanguageChange={changeLanguage} /></header>
    {registrationNumber && <Link to="/staff/payment-reviews">← {t("Comprovantes aguardando análise")}</Link>}
    <h1>{t(registrationNumber ? "Conferir pagamento e participação" : "Conferência de pagamentos")}</h1>
    {session?.user.app_metadata?.karlbruder_role !== "admin" ? <p role="alert">{t("Acesso restrito à equipe.")}</p> : registrationNumber ?
      <PaymentReviewPanel key={session.user.id + registrationNumber} token={session.access_token} userId={session.user.id} number={registrationNumber} language={language} /> :
      <PaymentReviewQueue token={session.access_token} userId={session.user.id} language={language} onReview={number => navigate(`/staff/payment-reviews/${encodeURIComponent(number)}`)} />}
  </main>;
}
