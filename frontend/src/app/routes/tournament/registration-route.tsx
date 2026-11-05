import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { useLocation } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import TournamentRegistration from "@/features/tournament/components/tournament-registration";
import RegistrationSignInPrompt from "@/features/auth/components/registration-sign-in-prompt";

export default function RegistrationRoute() {
  const auth = useAuthSession();
  const { language, changeLanguage } = useLanguage();
  const location = useLocation();
  const returnTo = `${location.pathname}${location.search}`;
  const params = new URLSearchParams(location.search);
  const id = params.get("tournament_id");
  const registrationNumber = params.get("registration_number") ?? undefined;
  const tournamentId = id !== null && /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id)) ? Number(id) : undefined;
  const invalidLink = (id !== null && tournamentId === undefined)
    || (registrationNumber !== undefined && (!tournamentId || !registrationNumber.trim()))
    || params.getAll("tournament_id").length > 1 || params.getAll("registration_number").length > 1;
  return (
    <TournamentRegistration
      tournamentId={tournamentId}
      registrationNumber={registrationNumber}
      invalidLink={invalidLink}
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
