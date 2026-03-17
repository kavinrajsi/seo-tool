import { google } from "googleapis";

const SCOPES = [
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/webmasters.readonly",
];

export function getOAuth2Client(redirectUri) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
}

export function getAuthUrl(redirectUri) {
  const client = getOAuth2Client(redirectUri);
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });
}

export async function getTokensFromCode(code, redirectUri) {
  const client = getOAuth2Client(redirectUri);
  const { tokens } = await client.getToken(code);
  return tokens;
}

export function getAuthenticatedClient(tokens, redirectUri) {
  const client = getOAuth2Client(redirectUri);
  client.setCredentials(tokens);
  return client;
}
