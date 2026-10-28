import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireAdminAuth } from "@/lib/supabase/auth-helpers";
import { createSupabasePrivilegedClient } from "@/lib/supabase/server";
import {
  buildGoogleOAuthConsentUrl,
  getGoogleIntegrationStatus,
  isGoogleOAuthEnvConfigured,
} from "@/lib/google/oauth";
import {
  DEFAULT_EMAIL_TEMPLATES,
  renderBookingEmail,
} from "@/lib/email/templates";
import { NotificationType } from "@/types/database";

export async function GET() {
  const auth = await requireAdminAuth();
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status }
    );
  }

  const supabase = await createSupabasePrivilegedClient();
  const status = await getGoogleIntegrationStatus();

  let templates = Object.values(DEFAULT_EMAIL_TEMPLATES);
  let recentEmails: any[] = [];
  let recentCalendarLogs: any[] = [];

  if (supabase) {
    try {
      const [tplRes, emailRes, calRes] = await Promise.all([
        supabase.from("email_templates").select("*"),
        supabase
          .from("email_notifications")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(25),
        supabase
          .from("calendar_sync_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(25),
      ]);

      if (tplRes.data && tplRes.data.length > 0) {
        templates = tplRes.data;
      }
      recentEmails = emailRes.data || [];
      recentCalendarLogs = calRes.data || [];
    } catch {
      // Fallback if tables not migrated yet
    }
  }

  return NextResponse.json({
    success: true,
    status,
    templates,
    recentEmails,
    recentCalendarLogs,
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth();
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status }
    );
  }

  try {
    const body = await request.json();
    const action = body.action as string;

    if (action === "connect_oauth") {
      if (!isGoogleOAuthEnvConfigured()) {
        return NextResponse.json(
          {
            success: false,
            error:
              "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are not configured in .env.local. Follow the Google Cloud setup instructions to configure OAuth 2.0 credentials.",
          },
          { status: 400 }
        );
      }

      const stateToken = crypto.randomBytes(24).toString("hex");
      const cookieStore = await cookies();
      cookieStore.set("offprint_google_oauth_state", stateToken, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 600,
      });

      const url = buildGoogleOAuthConsentUrl(stateToken);
      return NextResponse.json({ success: true, authUrl: url });
    }

    const supabase = await createSupabasePrivilegedClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Supabase is not configured." },
        { status: 503 }
      );
    }

    if (action === "update_settings") {
      const updates = {
        id: "default",
        calendar_id: String(body.calendar_id || "primary").trim(),
        calendar_sync_enabled: Boolean(body.calendar_sync_enabled),
        gmail_send_enabled: Boolean(body.gmail_send_enabled),
        updated_by: auth.context.user.id,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("google_oauth_tokens")
        .upsert(updates);
      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 400 }
        );
      }

      const updatedStatus = await getGoogleIntegrationStatus();
      return NextResponse.json({ success: true, status: updatedStatus });
    }

    if (action === "disconnect") {
      const { error } = await supabase
        .from("google_oauth_tokens")
        .update({
          connected_email: null,
          access_token_encrypted: null,
          refresh_token_encrypted: null,
          token_expiry: null,
          last_error: null,
          updated_by: auth.context.user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", "default");

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 400 }
        );
      }

      const updatedStatus = await getGoogleIntegrationStatus();
      return NextResponse.json({ success: true, status: updatedStatus });
    }

    if (action === "save_email_template") {
      const tpl = body.template;
      const { data: saved, error } = await supabase
        .from("email_templates")
        .upsert({
          id: tpl.id,
          name: tpl.name,
          subject_template: tpl.subject_template,
          heading: tpl.heading,
          intro_text: tpl.intro_text,
          instructions_text: tpl.instructions_text || "",
          footer_text: tpl.footer_text,
          include_policy_summary: Boolean(tpl.include_policy_summary),
          is_active: Boolean(tpl.is_active),
          updated_at: new Date().toISOString(),
        })
        .select("*")
        .single();

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 400 }
        );
      }

      return NextResponse.json({ success: true, data: saved });
    }

    if (action === "preview_email_template") {
      const notificationType = (body.notificationType ||
        "booking_confirmed") as NotificationType;
      const sampleBooking: any = {
        id: "00000000-0000-0000-0000-000000000001",
        booking_ref: "OFP-2026-8F4A2B",
        booking_type: "convocation",
        service_or_event_title: "IUB 27th Convocation Photography",
        package_name: "The Laureate & Family Collection",
        package_price_label: "BDT 6,000",
        timezone: "Asia/Dhaka",
        booking_date: "2026-11-15",
        start_at: "2026-11-15T04:00:00.000Z", // 10:00 AM BST
        end_at: "2026-11-15T04:45:00.000Z", // 10:45 AM BST
        duration_mins: 45,
        client_name: "Ayman Rahman",
        client_email: "ayman.rahman@iub.edu.bd",
        client_phone: "+880 1711-223344",
        student_id: "2130456",
        degree_or_department: "BSc in Computer Science & Engineering",
        guests_count: 4,
        location: "IUB Campus Portrait Lawn, Bashundhara R/A, Dhaka",
        cancellation_cutoff_hours: 48,
        reschedule_cutoff_hours: 24,
        status: "confirmed",
      };

      const preview = renderBookingEmail({
        booking: sampleBooking,
        notificationType,
        templateOverride: body.templateOverride || null,
      });

      return NextResponse.json({
        success: true,
        preview,
      });
    }

    return NextResponse.json(
      { success: false, error: "Unsupported integration action." },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Integration request failed" },
      { status: 500 }
    );
  }
}

