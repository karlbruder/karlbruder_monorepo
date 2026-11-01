import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import "./App.css";
import { accountRoutes } from "./accountRoutes";
import { useAppAuth } from "./appAuth";
import { RequireSessionRoute } from "./RequireSessionRoute";
import SignedInHomePage from "./SignedInHomePage";
import TournamentRegistration from "./pages/TournamentRegistration";
import AccountChangePasswordPage from "./pages/account/AccountChangePasswordPage";
import AccountCheckEmailPage from "./pages/account/AccountCheckEmailPage";
import AccountNewPasswordPage from "./pages/account/AccountNewPasswordPage";
import AccountRecoverPage from "./pages/account/AccountRecoverPage";
import AccountSignInPage from "./pages/account/AccountSignInPage";
import AccountSignUpPage from "./pages/account/AccountSignUpPage";
import RegistrationSignInPrompt from "./pages/account/RegistrationSignInPrompt";
import { registrationCopy, useRegistrationLanguage } from "./registrationLanguage";
import type { RegistrationCopyKey } from "./registrationLanguage";

function AppShell() {
  const auth = useAppAuth();
  const { language, changeLanguage } = useRegistrationLanguage();

  return (
    <AppRoutes
      auth={auth}
      language={language}
      onLanguageChange={changeLanguage}
    />
  );
}

type AppRoutesProps = {
  auth: ReturnType<typeof useAppAuth>;
  language: ReturnType<typeof useRegistrationLanguage>["language"];
  onLanguageChange: ReturnType<typeof useRegistrationLanguage>["changeLanguage"];
};

function AppRoutes({ auth, language, onLanguageChange }: AppRoutesProps) {
  const location = useLocation();
  const registrationReturnTo = `${location.pathname}${location.search}`;
  const t = (key: RegistrationCopyKey) => registrationCopy(language, key);
  const sessionLoadingMessage = t("Carregando sua sessão...");
  const {
    session,
    authReady,
    authLoading,
    authError,
    signInWithGoogle,
    signOut,
  } = auth;

  const accountPageProps = {
    language,
    authLoading,
    onGoogleSignIn: signInWithGoogle,
    onLanguageChange,
  };

  const registrationOAuthRedirect = `${window.location.origin}${registrationReturnTo}`;

  return (
    <Routes>
      <Route path="/tournaments/registration" element={
        <TournamentRegistration
          session={session}
          authReady={authReady}
          authError={authError}
          language={language}
          onLanguageChange={onLanguageChange}
          onSignOut={signOut}
          signInButton={
            <RegistrationSignInPrompt
              language={language}
              returnTo={registrationReturnTo}
              googleLoading={authLoading}
              onGoogleSignIn={() => signInWithGoogle(registrationOAuthRedirect)}
            />
          }
        />
      } />
      <Route path={accountRoutes.signIn} element={<AccountSignInPage {...accountPageProps} />} />
      <Route path={accountRoutes.signUp} element={<AccountSignUpPage {...accountPageProps} />} />
      <Route path={accountRoutes.checkEmail} element={<AccountCheckEmailPage language={language} onLanguageChange={onLanguageChange} />} />
      <Route path={accountRoutes.recover} element={<AccountRecoverPage language={language} onLanguageChange={onLanguageChange} />} />
      <Route path={accountRoutes.newPassword} element={
        <AccountNewPasswordPage language={language} onLanguageChange={onLanguageChange} authReady={authReady} hasSession={Boolean(session)} />
      } />
      <Route path={accountRoutes.password} element={
        <RequireSessionRoute authReady={authReady} session={session} loadingMessage={sessionLoadingMessage}>
          <AccountChangePasswordPage language={language} onLanguageChange={onLanguageChange} authReady={authReady} hasSession={Boolean(session)} />
        </RequireSessionRoute>
      } />
      <Route path="/" element={
        <RequireSessionRoute authReady={authReady} session={session} loadingMessage={sessionLoadingMessage}>
          <SignedInHomePage
            session={session!}
            language={language}
            onLanguageChange={onLanguageChange}
            onSignOut={signOut}
            authError={authError}
          />
        </RequireSessionRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppShell;
