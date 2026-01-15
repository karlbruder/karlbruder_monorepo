import { WebStorageStateStore } from "oidc-client-ts";

const cognitoAuthConfig = {
  authority: import.meta.env.VITE_COGNITO_AUTHORITY as string,
  client_id: import.meta.env.VITE_COGNITO_CLIENT_ID as string,
  redirect_uri: import.meta.env.VITE_COGNITO_REDIRECT_URI as string,
  response_type: import.meta.env.VITE_COGNITO_RESPONSE_TYPE as string,
  scope: import.meta.env.VITE_COGNITO_SCOPE as string,
  logout_redirect_uri: import.meta.env.VITE_COGNITO_LOGOUT_URI as string,
  cognitoDomain: import.meta.env.VITE_COGNITO_DOMAIN as string,
  userStore: new WebStorageStateStore({ store: window.localStorage }),
};
export default cognitoAuthConfig;