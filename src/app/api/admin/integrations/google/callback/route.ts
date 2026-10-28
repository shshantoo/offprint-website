import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireAdminAuth } from "@/lib/supabase/auth-helpers";
import { createSupabasePrivilegedClient } from "@/lib/supabase/server";
import {
  encryptToken,
  exchangeGoogleAuthCode,
  GOOGLE_OAUTH_SCOPES,
} from "@/lib/google/oauth";

export async function GET(request: NextRequest) {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin).replace(
    /\/$/,
    ""
  );

  const auth = await requireAdminAuth();
  if (!auth.authorized) {
    return NextResponse.redirect(
      `${baseUrl}/admin-portal?tab=integrations&google_error=unauthorized`
    );
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(
      `${baseUrl}/admin-portal?tab=integrations&google_error=${encodeURIComponent(
        oauthError
      )}`
    );
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("offprint_google_oauth_state")?.value;
  cookieStore.delete("offprint_google_oauth_state");

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(
      `${baseUrl}/admin-portal?tab=integrations&google_error=invalid_oauth_state`
    );
  }

  try {
    const tokenResult = await exchangeGoogleAuthCode(code);
    const supabase = await createSupabasePrivilegedClient();
    if (!supabase) {
      throw new Error("Supabase not available to persist OAuth credentials");
    }

    const { data: existing } = await supabase
      .from("google_oauth_tokens")
      .select("refresh_token_encrypted, calendar_id, calendar_sync_enabled, gmail_send_enabled")
      .eq("id", "default")
      .maybeSingle();

    const refreshEncrypted = tokenResult.refresh_token
      ? encryptToken(tokenResult.refresh_token)
      : existing?.refresh_token_encrypted || null;

    const expiryIso = new Date(
      Date.now() + tokenResult.expires_in * 1000
    ).toISOString();

    const { error } = await supabase.from("google_oauth_tokens").upsert({
      id: "default",
      connected_email:
        tokenResult.email || process.env.GOOGLE_SENDER_EMAIL || null,
      access_token_encrypted: encryptToken(tokenResult.access_token),
      refresh_token_encrypted: refreshEncrypted,
      token_expiry: expiryIso,
      scopes: tokenResult.scope
        ? tokenResult.scope.split(" ")
        : GOOGLE_OAUTH_SCOPES,
      calendar_id:
        existing?.calendar_id || process.env.GOOGLE_CALENDAR_ID || "primary",
      calendar_sync_enabled: existing?.calendar_sync_enabled ?? true,
      gmail_send_enabled: existing?.gmail_send_enabled ?? true,
      last_error: null,
      updated_by: auth.context.user.id,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.redirect(
      `${baseUrl}/admin-portal?tab=integrations&google=connected`
    );
  } catch (err: any) {
    return NextResponse.redirect(
      `${baseUrl}/admin-portal?tab=integrations&google_error=${encodeURIComponent(
        err?.message || "oauth_exchange_failed"
      )}`
    );
  }
}

