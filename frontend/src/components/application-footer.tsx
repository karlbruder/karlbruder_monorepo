import { legalRoutes } from "@/config/legal-routes";

export function ApplicationFooter() {
  return (
    <footer className="application-footer">
      <nav className="application-footer-links" aria-label="Termos e privacidade" lang="pt-BR">
        <a href={legalRoutes.terms}>Termos de Uso</a>
        <a href={legalRoutes.privacy}>Política de Privacidade</a>
      </nav>
    </footer>
  );
}
