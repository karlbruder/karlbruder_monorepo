import { useAppContext } from "@/app/app-context";
import SignedInHome from "@/features/auth/components/signed-in-home";

export default function HomeRoute() {
  const { auth, language, changeLanguage } = useAppContext();
  return <SignedInHome session={auth.session!} language={language} onLanguageChange={changeLanguage} onSignOut={auth.signOut} authError={auth.authError} />;
}
