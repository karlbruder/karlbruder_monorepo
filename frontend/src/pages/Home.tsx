import { useAuth } from "react-oidc-context";
import { Navigate } from "react-router-dom";
import cognitoAuthConfig from "../config/cognito";

const Home = () => {
    const auth = useAuth();

    const signOutRedirect = () => {
        const clientId = cognitoAuthConfig.client_id;
        const logoutUri = cognitoAuthConfig.logout_redirect_uri;
        const cognitoDomain = cognitoAuthConfig.cognitoDomain;
        auth.removeUser();
        window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
    };

    if (auth.isLoading) {
        return <div>Loading...</div>;
    }

    if (auth.error) {
        return <div>Encountering error... {auth.error.message}</div>;
    }


    if (auth.isAuthenticated){
        return (
            <div>
                <h1>Bem vindo {auth.user?.profile.given_name} {auth.user?.profile.family_name}!</h1>
                <pre> Email: {auth.user?.profile.email} </pre>
                <pre> Profile: {JSON.stringify(auth.user?.profile, null, 2)}</pre>
                <pre> ID Token: {auth.user?.id_token} </pre>
                <pre> Access Token: {auth.user?.access_token} </pre>
                <pre> Refresh Token: {auth.user?.refresh_token} </pre>

                <button onClick={() => signOutRedirect()}>Sign out</button>
            </div>
        );
    }

    if (!auth.isAuthenticated){
        return <Navigate to="/" replace />;
    }


};

export default Home;
