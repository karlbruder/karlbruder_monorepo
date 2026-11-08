import type { AppLanguage } from "@/utils/app-copy";

export function ApplicationFooter({ language }: { language: AppLanguage }) {
  return (
    <footer className="application-footer">
      <span>Karlbrüder · {language === "en" ? "historical fencing" : "esgrima histórica"}</span>
      <span>app.karlbruder.com</span>
    </footer>
  );
}
