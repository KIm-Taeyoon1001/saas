import { GoogleAuth } from "google-auth-library";

const SCOPES = [
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/webmasters.readonly",
];

export function createAuth() {
  const inlineKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (inlineKey) {
    return new GoogleAuth({ credentials: JSON.parse(inlineKey), scopes: SCOPES });
  }
  // Falls back to GOOGLE_APPLICATION_CREDENTIALS (file path), used for local/stdio runs.
  return new GoogleAuth({ scopes: SCOPES });
}
