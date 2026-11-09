import { legalRoutes } from "@/config/legal-routes";
import type { AppLanguage } from "@/utils/app-copy";

export function ApplicationFooter({ language }: { language: AppLanguage }) {
  return (
    <footer className="application-footer">
      <span>Karlbrüder · {language === "en" ? "historical fencing" : "esgrima histórica"}</span>
      <nav className="application-footer-links" aria-label="Termos e privacidade" lang="pt-BR">
        <a href={legalRoutes.terms}>Termos de Uso</a>
        <a href={legalRoutes.privacy}>Política de Privacidade</a>
      </nav>
      <span>app.karlbruder.com</span>
    </footer>
  );
}
