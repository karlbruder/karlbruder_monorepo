import { useSearchParams } from "react-router-dom";
import { useAppContext } from "@/app/app-context";
import AccountRecoverPage from "@/features/auth/components/account-recover-page";
import { accountRoutes } from "@/config/account-routes";
import { readReturnTo } from "@/features/auth/utils/account-navigation";

export default function AccountRecoverRoute() {
  const { language, changeLanguage } = useAppContext();
  const [searchParams] = useSearchParams();
  const returnTo = readReturnTo(searchParams) ?? accountRoutes.signIn;
  return (
    <AccountRecoverPage
      language={language}
      onLanguageChange={changeLanguage}
      returnTo={returnTo}
    />
  );
}
