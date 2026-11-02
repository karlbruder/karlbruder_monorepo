import { useLocation } from "react-router-dom";
import { useAppContext } from "@/app/app-context";
import TournamentRegistration from "@/features/tournament/components/tournament-registration";
import RegistrationSignInPrompt from "@/features/auth/components/registration-sign-in-prompt";

export default function RegistrationRoute() {
  const { auth, language, changeLanguage } = useAppContext();
  const location = useLocation();
  const returnTo = `${location.pathname}${location.search}`;
  return (
    <TournamentRegistration
      session={auth.session}
      authReady={auth.authReady}
      authError={auth.authError}
      language={language}
      onLanguageChange={changeLanguage}
      onSignOut={auth.signOut}
      signInButton={
        <RegistrationSignInPrompt
          language={language}
          returnTo={returnTo}
          googleLoading={auth.authLoading}
          onGoogleSignIn={() => auth.signInWithGoogle(`${window.location.origin}${returnTo}`)}
        />
      }
    />
  );
}
