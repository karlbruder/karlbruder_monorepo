const cognitoAuthConfig = {
  authority: import.meta.env.VITE_COGNITO_AUTHORITY as string,
  client_id: import.meta.env.VITE_COGNITO_CLIENT_ID as string,
  redirect_uri: import.meta.env.VITE_COGNITO_REDIRECT_URI as string,
  response_type: import.meta.env.VITE_COGNITO_RESPONSE_TYPE as string,
  scope: import.meta.env.VITE_COGNITO_SCOPE as string,
};
export default cognitoAuthConfig;