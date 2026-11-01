import { Link, Route, Routes, useLocation } from "react-router-dom";
import "./App.css";
import { accountRoutes } from "./accountRoutes";
import { useAppAuth } from "./appAuth";
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
      <Route path={accountRoutes.checkEmail} element={<AccountCheckEmailPage language={language} />} />
      <Route path={accountRoutes.recover} element={<AccountRecoverPage language={language} />} />
      <Route path={accountRoutes.newPassword} element={
        <AccountNewPasswordPage language={language} authReady={authReady} hasSession={Boolean(session)} />
      } />
      <Route path={accountRoutes.password} element={
        <AccountChangePasswordPage language={language} authReady={authReady} hasSession={Boolean(session)} />
      } />
      <Route path="*" element={
        <main className="app-center">
          {!authReady ? (
            <p role="status">{t("Carregando sua sessão...")}</p>
          ) : session ? (
            <div className="home-account">
              <h1>Karlbrüder</h1>
              <p>{session.user.user_metadata?.name ?? session.user.email}</p>
              <Link to={accountRoutes.password}>{t("Alterar senha")}</Link>
              <a href="/tournaments/registration">{t("Inscrição Monomachia")}</a>
              <button type="button" onClick={signOut}>{t("Sair")}</button>
            </div>
          ) : (
            <div className="home-account home-account-links">
              <h1>Karlbrüder</h1>
              <Link className="primary" to={accountRoutes.signIn}>{t("Entrar")}</Link>
              <Link className="secondary" to={accountRoutes.signUp}>{t("Criar conta")}</Link>
            </div>
          )}
          {authError && <p role="alert">{t(authError)}</p>}
        </main>
      } />
    </Routes>
  );
}

export default AppShell;
