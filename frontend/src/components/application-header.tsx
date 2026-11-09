import type { ReactNode } from "react";
import LanguageToggle from "@/components/language-toggle";
import type { AppLanguage } from "@/utils/app-copy";
import guildLogo from "@/components/assets/guild-logo.png";

type Props = {
  language: AppLanguage;
  onLanguageChange?: (language: AppLanguage) => void;
  navigation?: ReactNode;
  children?: ReactNode;
};

export function ApplicationHeader({ language, onLanguageChange, navigation, children }: Props) {
  return (
    <header className="application-header">
      <div className="application-header-inner">
        <a className="application-brand" href="/" aria-label="Karlbrüder">
          <img src={guildLogo} alt="Karlbrüder" width="174" />
        </a>
        {navigation}
        <div className="application-account">
          {onLanguageChange && <LanguageToggle language={language} onLanguageChange={onLanguageChange} />}
          {children}
        </div>
      </div>
    </header>
  );
}
