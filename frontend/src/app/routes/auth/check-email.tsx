import { useSearchParams } from "react-router-dom";
import { useAppContext } from "@/app/app-context";
import AccountCheckEmailPage from "@/features/auth/components/account-check-email-page";
import { readReturnTo } from "@/features/auth/utils/account-navigation";

export default function AccountCheckEmailRoute() {
  const { language, changeLanguage } = useAppContext();
  const [searchParams] = useSearchParams();
  const returnTo = readReturnTo(searchParams) ?? "/";
  return (
    <AccountCheckEmailPage
      language={language}
      onLanguageChange={changeLanguage}
      returnTo={returnTo}
      email={searchParams.get("email")}
    />
  );
}
