
import { useAuth } from "react-oidc-context";

function Landing() {
  const auth = useAuth();

  const signOutRedirect = () => {
    // TODO fazer nao usar direto do .env
    const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID as string;
    const logoutUri = import.meta.env.VITE_COGNITO_REDIRECT_URI as string;
    const cognitoDomain = import.meta.env.VITE_COGNITO_DOMAIN as string;
    window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
  };

  if (auth.isLoading) {
    return <div>Loading...</div>;
  }

  if (auth.error) {
    return <div>Encountering error... {auth.error.message}</div>;
  }

  if (auth.isAuthenticated) {
    return (
      <div>
        <pre> Hello: {auth.user?.profile.email} </pre>
        <pre> a {auth.user?.profile.given_name} </pre>
        <pre> b {auth.user?.profile.family_name} </pre>
        <pre>{JSON.stringify(auth.user?.profile, null, 2)}</pre>

    

        <pre> ID Token: {auth.user?.id_token} </pre>
        <pre> Access Token: {auth.user?.access_token} </pre>
        <pre> Refresh Token: {auth.user?.refresh_token} </pre>

        <button onClick={() => auth.removeUser()}>Sign out</button>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => auth.signinRedirect()}>Sign in</button>
      <button onClick={() => signOutRedirect()}>Sign out</button>
    </div>
  );
}

export default Landing;