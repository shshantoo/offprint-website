import crypto from "node:crypto";
import { createSupabasePrivilegedClient } from "@/lib/supabase/server";
import type { GoogleIntegrationStatus } from "@/types/database";

import { getSiteBaseUrl } from "@/lib/site-url";

export const GOOGLE_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/userinfo.email",
];

function getEncryptionKeyBuffer(): Buffer {
  const raw =
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "offprint-default-dev-key-must-be-overridden-in-prod";
  return crypto.createHash("sha256").update(raw).digest();
}

/**
 * Encrypts a token string using AES-256-GCM before storing in the database.
 */
export function encryptToken(plainText: string): string {
  const key = getEncryptionKeyBuffer();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypts a stored AES-256-GCM encrypted token string.
 */
export function decryptToken(cipherText: string): string {
  const parts = cipherText.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted token format");
  }
  const [ivHex, tagHex, dataHex] = parts;
  const key = getEncryptionKeyBuffer();
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivHex, "hex")
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

export function isGoogleOAuthEnvConfigured(): boolean {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  return Boolean(
    clientId &&
      clientSecret &&
      !clientId.includes("your-google-oauth-client-id") &&
      !clientSecret.includes("your-google-oauth-client-secret")
  );
}

export function getGoogleRedirectUri(): string {
  if (process.env.GOOGLE_OAUTH_REDIRECT_URI) {
    return process.env.GOOGLE_OAUTH_REDIRECT_URI;
  }
  if (process.env.GOOGLE_REDIRECT_URI) {
    return process.env.GOOGLE_REDIRECT_URI;
  }
  const baseUrl = getSiteBaseUrl();
  return `${baseUrl}/api/admin/integrations/google/callback`;
}

export function buildGoogleOAuthConsentUrl(stateToken: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const redirectUri = getGoogleRedirectUri();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_OAUTH_SCOPES.join(" "),
    state: stateToken,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleAuthCode(
  code: string,
  fetchFn: typeof fetch = fetch
): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  email?: string;
}> {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  const redirectUri = getGoogleRedirectUri();

  const tokenRes = await fetchFn("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }).toString(),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Google token exchange failed (${tokenRes.status}): ${errText}`);
  }

  const tokenData = await tokenRes.json();
  let email: string | undefined;

  try {
    const profileRes = await fetchFn(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      }
    );
    if (profileRes.ok) {
      const profileJson = await profileRes.json();
      email = profileJson.email;
    }
  } catch {
    // Non-fatal if userinfo fails
  }

  return {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_in: Number(tokenData.expires_in || 3600),
    scope: tokenData.scope,
    email,
  };
}

export async function refreshGoogleAccessToken(
  refreshToken: string,
  fetchFn: typeof fetch = fetch
): Promise<{ access_token: string; expires_in: number }> {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";

  const res = await fetchFn("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }).toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google OAuth token refresh failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return {
    access_token: data.access_token,
    expires_in: Number(data.expires_in || 3600),
  };
}

export async function getGoogleIntegrationStatus(): Promise<GoogleIntegrationStatus> {
  const envConfigured = isGoogleOAuthEnvConfigured();
  const defaultCalendarId = process.env.GOOGLE_CALENDAR_ID || "primary";

  try {
    const supabase = await createSupabasePrivilegedClient();
    if (!supabase) {
      return {
        oauth_configured_in_env: envConfigured,
        connected: false,
        calendar_id: defaultCalendarId,
        calendar_sync_enabled: true,
        gmail_send_enabled: true,
      };
    }

    const { data } = await supabase
      .from("google_oauth_tokens")
      .select("*")
      .eq("id", "default")
      .maybeSingle();

    if (!data) {
      return {
        oauth_configured_in_env: envConfigured,
        connected: false,
        calendar_id: defaultCalendarId,
        calendar_sync_enabled: true,
        gmail_send_enabled: true,
      };
    }

    const hasTokens = Boolean(
      data.refresh_token_encrypted || data.access_token_encrypted
    );

    return {
      oauth_configured_in_env: envConfigured,
      connected: Boolean(envConfigured && hasTokens),
      connected_email: data.connected_email || null,
      calendar_id: data.calendar_id || defaultCalendarId,
      calendar_sync_enabled: Boolean(data.calendar_sync_enabled),
      gmail_send_enabled: Boolean(data.gmail_send_enabled),
      token_expiry: data.token_expiry || null,
      last_error: data.last_error || null,
      updated_at: data.updated_at || null,
    };
  } catch {
    return {
      oauth_configured_in_env: envConfigured,
      connected: false,
      calendar_id: defaultCalendarId,
      calendar_sync_enabled: true,
      gmail_send_enabled: true,
    };
  }
}

/**
 * Resolves a valid Google OAuth access token on the server, automatically refreshing it
 * if it is expired or expiring within 60 seconds.
 */
export async function getValidGoogleAccessToken(
  fetchFn: typeof fetch = fetch
): Promise<{
  accessToken: string;
  calendarId: string;
  calendarSyncEnabled: boolean;
  gmailSendEnabled: boolean;
  connectedEmail?: string | null;
} | null> {
  if (!isGoogleOAuthEnvConfigured()) {
    return null;
  }

  const supabase = await createSupabasePrivilegedClient();
  if (!supabase) return null;

  const { data: row, error } = await supabase
    .from("google_oauth_tokens")
    .select("*")
    .eq("id", "default")
    .maybeSingle();

  if (error || !row) return null;
  if (!row.access_token_encrypted && !row.refresh_token_encrypted) {
    return null;
  }

  const nowMs = Date.now();
  const expiryMs = row.token_expiry ? Date.parse(row.token_expiry) : 0;

  if (row.access_token_encrypted && expiryMs > nowMs + 60_000) {
    return {
      accessToken: decryptToken(row.access_token_encrypted),
      calendarId: row.calendar_id || process.env.GOOGLE_CALENDAR_ID || "primary",
      calendarSyncEnabled: Boolean(row.calendar_sync_enabled),
      gmailSendEnabled: Boolean(row.gmail_send_enabled),
      connectedEmail: row.connected_email,
    };
  }

  if (!row.refresh_token_encrypted) {
    return null;
  }

  const refreshToken = decryptToken(row.refresh_token_encrypted);
  const refreshed = await refreshGoogleAccessToken(refreshToken, fetchFn);
  const newExpiryIso = new Date(
    Date.now() + refreshed.expires_in * 1000
  ).toISOString();

  await supabase
    .from("google_oauth_tokens")
    .update({
      access_token_encrypted: encryptToken(refreshed.access_token),
      token_expiry: newExpiryIso,
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", "default");

  return {
    accessToken: refreshed.access_token,
    calendarId: row.calendar_id || process.env.GOOGLE_CALENDAR_ID || "primary",
    calendarSyncEnabled: Boolean(row.calendar_sync_enabled),
    gmailSendEnabled: Boolean(row.gmail_send_enabled),
    connectedEmail: row.connected_email,
  };
}
