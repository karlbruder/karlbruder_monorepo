
import { useAuth } from "react-oidc-context";
import { Navigate } from "react-router-dom";

function Landing() {
  const auth = useAuth();



  if (auth.isLoading) {
    return <div>Loading...</div>;
  }

  if (auth.error) {
    return <div>Encountering error... {auth.error.message}</div>;
  }

  if (auth.isAuthenticated){
        return <Navigate to="/home" replace />;
    }

  return (
    <div>
        <h1>Welcome to the Karlbruder Landing Page</h1>
        <button onClick={() => auth.signinRedirect()}>Sign in</button>
    </div>
  );
}

export default Landing;