import type { RegistrationLanguage } from "./registrationLanguage";

type Props = {
  language: RegistrationLanguage;
  onLanguageChange: (language: RegistrationLanguage) => void;
};

export default function AppLanguageToggle({ language, onLanguageChange }: Props) {
  return (
    <div className="app-language-toggle" role="group" aria-label="Language / Idioma">
      <button
        type="button"
        aria-label="Português"
        aria-pressed={language === "pt"}
        onClick={() => onLanguageChange("pt")}
      >
        PT
      </button>
      <button
        type="button"
        aria-label="English"
        aria-pressed={language === "en"}
        onClick={() => onLanguageChange("en")}
      >
        EN
      </button>
    </div>
  );
}
