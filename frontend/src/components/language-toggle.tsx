import type { AppLanguage } from "@/utils/app-copy";

type Props = {
  className?: string;
  language: AppLanguage;
  onLanguageChange?: (language: AppLanguage) => void;
};

export default function LanguageToggle({ language, onLanguageChange, className = "app-language-toggle" }: Props) {
  return (
    <div className={className} role="group" aria-label="Language / Idioma">
      <button
        type="button"
        aria-label="Português"
        aria-pressed={language === "pt"}
        onClick={() => onLanguageChange?.("pt")}
      >
        PT
      </button>
      <button
        type="button"
        aria-label="English"
        aria-pressed={language === "en"}
        onClick={() => onLanguageChange?.("en")}
      >
        EN
      </button>
    </div>
  );
}
