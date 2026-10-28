import type { Booking, EmailSendStatus, EmailTemplate, NotificationType } from "@/types/database";
import { renderBookingEmail } from "@/lib/email/templates";
import { getValidGoogleAccessToken, isGoogleOAuthEnvConfigured } from "./oauth";
import { createSupabasePrivilegedClient } from "@/lib/supabase/server";

/**
 * Encodes a UTF-8 string into Base64URL format required by the Gmail API raw message field.
 */
export function toBase64Url(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Encodes an email Subject header using RFC 2047 UTF-8 Base64 so Bengali ("অফপ্রিন্ট") and special
 * characters render cleanly across all email clients.
 */
export function encodeMimeSubject(subject: string): string {
  return `=?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`;
}

/**
 * Builds an RFC 2822 multipart/alternative MIME message containing both text/plain and text/html parts.
 */
export function buildRawMimeMessage(params: {
  fromEmail: string;
  fromName?: string;
  toEmail: string;
  toName?: string;
  subject: string;
  textBody: string;
  htmlBody: string;
}): string {
  const boundary = `offprint_mime_boundary_${Date.now().toString(36)}`;
  const sanitizedToName = (params.toName || "").replace(/["<>]/g, "").trim();
  const fromHeader = params.fromName
    ? `"${params.fromName.replace(/"/g, "")}" <${params.fromEmail}>`
    : params.fromEmail;
  const toHeader = sanitizedToName
    ? `"${sanitizedToName}" <${params.toEmail}>`
    : params.toEmail;

  const lines = [
    `From: ${fromHeader}`,
    `To: ${toHeader}`,
    `Subject: ${encodeMimeSubject(params.subject)}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    Buffer.from(params.textBody, "utf8").toString("base64"),
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    Buffer.from(params.htmlBody, "utf8").toString("base64"),
    ``,
    `--${boundary}--`,
  ];

  return toBase64Url(lines.join("\r\n"));
}

export interface SendBookingEmailResult {
  success: boolean;
  status: EmailSendStatus;
  messageId?: string | null;
  error?: string | null;
  deduplicated?: boolean;
  subject: string;
}

/**
 * Renders and sends a branded OFFPRINT booking notification email via the Gmail API.
 * Enforces idempotency so retrying never sends duplicate confirmation emails.
 * Retains the notification record on failure for safe admin retry.
 */
export async function sendBookingNotificationEmail(params: {
  booking: Booking;
  notificationType: NotificationType;
  idempotencyKey?: string;
  previousStartAt?: string | null;
  previousEndAt?: string | null;
  templateOverride?: Partial<EmailTemplate> | null;
  fetchFn?: typeof fetch;
  overrideAuth?: {
    accessToken: string;
    gmailSendEnabled?: boolean;
    connectedEmail?: string | null;
  } | null;
  sentIdempotencyMap?: Map<string, string>;
}): Promise<SendBookingEmailResult> {
  const {
    booking,
    notificationType,
    previousStartAt,
    previousEndAt,
    fetchFn = fetch,
    overrideAuth,
    sentIdempotencyMap,
  } = params;

  const idempotencyKey =
    params.idempotencyKey ||
    `email:${booking.id}:${notificationType}:${booking.start_at}:${booking.status}`;

  const supabase = overrideAuth ? null : await createSupabasePrivilegedClient();

  // Load admin-configured email template override from DB if not explicitly provided
  let templateOverride = params.templateOverride;
  if (!templateOverride && supabase) {
    try {
      const { data: tplRow } = await supabase
        .from("email_templates")
        .select("*")
        .eq("id", notificationType)
        .maybeSingle();
      if (tplRow) {
        templateOverride = tplRow as EmailTemplate;
      }
    } catch {
      // Fallback to default template
    }
  }

  const rendered = renderBookingEmail({
    booking,
    notificationType,
    templateOverride,
    previousStartAt,
    previousEndAt,
  });

  // 1. Check in-memory idempotency map (used in tests or fast-path)
  if (sentIdempotencyMap?.has(idempotencyKey)) {
    return {
      success: true,
      status: "sent",
      messageId: sentIdempotencyMap.get(idempotencyKey)!,
      deduplicated: true,
      subject: rendered.subject,
    };
  }

  // 2. Check database email_notifications for existing 'sent' record with same idempotency_key
  if (supabase) {
    try {
      const { data: existing } = await supabase
        .from("email_notifications")
        .select("*")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

      if (existing && existing.status === "sent") {
        return {
          success: true,
          status: "sent",
          messageId: existing.provider_message_id,
          deduplicated: true,
          subject: existing.subject,
        };
      }
    } catch {
      // Continue
    }
  }

  // 3. Resolve Google OAuth credentials
  let auth = overrideAuth;
  if (auth === undefined) {
    if (!isGoogleOAuthEnvConfigured()) {
      await upsertEmailNotificationRecord(supabase, {
        bookingId: booking.id,
        notificationType,
        idempotencyKey,
        recipientEmail: booking.client_email,
        recipientName: booking.client_name,
        subject: rendered.subject,
        bodyHtml: rendered.html,
        bodyText: rendered.text,
        status: "failed",
        errorMessage: "Google OAuth environment variables not configured",
      });
      await updateBookingEmailState(supabase, booking.id, {
        status: "not_configured",
        error: "Gmail OAuth credentials not configured",
      });
      return {
        success: false,
        status: "not_configured",
        error: "Gmail OAuth credentials are not configured.",
        subject: rendered.subject,
      };
    }

    try {
      auth = await getValidGoogleAccessToken(fetchFn);
    } catch (err: any) {
      const errMsg = err?.message || "Failed to refresh Google OAuth token for Gmail";
      await upsertEmailNotificationRecord(supabase, {
        bookingId: booking.id,
        notificationType,
        idempotencyKey,
        recipientEmail: booking.client_email,
        recipientName: booking.client_name,
        subject: rendered.subject,
        bodyHtml: rendered.html,
        bodyText: rendered.text,
        status: "failed",
        errorMessage: errMsg,
      });
      await updateBookingEmailState(supabase, booking.id, {
        status: "failed",
        error: errMsg,
      });
      return {
        success: false,
        status: "failed",
        error: errMsg,
        subject: rendered.subject,
      };
    }
  }

  if (!auth) {
    await upsertEmailNotificationRecord(supabase, {
      bookingId: booking.id,
      notificationType,
      idempotencyKey,
      recipientEmail: booking.client_email,
      recipientName: booking.client_name,
      subject: rendered.subject,
      bodyHtml: rendered.html,
      bodyText: rendered.text,
      status: "failed",
      errorMessage: "Google account not connected in Admin Portal",
    });
    await updateBookingEmailState(supabase, booking.id, {
      status: "not_configured",
      error: "Google account not connected in Admin Portal",
    });
    return {
      success: false,
      status: "not_configured",
      error: "Gmail integration is not connected yet.",
      subject: rendered.subject,
    };
  }

  if (auth.gmailSendEnabled === false || templateOverride?.is_active === false) {
    await updateBookingEmailState(supabase, booking.id, {
      status: "disabled",
      error: null,
    });
    return {
      success: false,
      status: "disabled",
      error: "Gmail notification sending is disabled.",
      subject: rendered.subject,
    };
  }

  const senderEmail =
    auth.connectedEmail ||
    process.env.GOOGLE_SENDER_EMAIL ||
    process.env.NEXT_PUBLIC_AGENCY_EMAIL ||
    "inquiry@offprint.agency";

  const rawMime = buildRawMimeMessage({
    fromEmail: senderEmail,
    fromName: "OFFPRINT Photography Studio",
    toEmail: booking.client_email,
    toName: booking.client_name,
    subject: rendered.subject,
    textBody: rendered.text,
    htmlBody: rendered.html,
  });

  try {
    const res = await fetchFn(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw: rawMime }),
      }
    );

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Gmail API HTTP ${res.status}: ${errBody}`);
    }

    const data = await res.json();
    const messageId = String(data.id || `gmail-${Date.now()}`);

    if (sentIdempotencyMap) {
      sentIdempotencyMap.set(idempotencyKey, messageId);
    }

    await upsertEmailNotificationRecord(supabase, {
      bookingId: booking.id,
      notificationType,
      idempotencyKey,
      recipientEmail: booking.client_email,
      recipientName: booking.client_name,
      subject: rendered.subject,
      bodyHtml: rendered.html,
      bodyText: rendered.text,
      status: "sent",
      providerMessageId: messageId,
      errorMessage: null,
    });

    await updateBookingEmailState(supabase, booking.id, {
      status: "sent",
      error: null,
    });

    return {
      success: true,
      status: "sent",
      messageId,
      subject: rendered.subject,
    };
  } catch (err: any) {
    const errMsg = err?.message || "Gmail API delivery failed";
    await upsertEmailNotificationRecord(supabase, {
      bookingId: booking.id,
      notificationType,
      idempotencyKey,
      recipientEmail: booking.client_email,
      recipientName: booking.client_name,
      subject: rendered.subject,
      bodyHtml: rendered.html,
      bodyText: rendered.text,
      status: "failed",
      errorMessage: errMsg,
    });
    await updateBookingEmailState(supabase, booking.id, {
      status: "failed",
      error: errMsg,
    });

    return {
      success: false,
      status: "failed",
      error: errMsg,
      subject: rendered.subject,
    };
  }
}

async function upsertEmailNotificationRecord(
  supabase: any,
  entry: {
    bookingId: string;
    notificationType: NotificationType;
    idempotencyKey: string;
    recipientEmail: string;
    recipientName: string;
    subject: string;
    bodyHtml: string;
    bodyText: string;
    status: "pending" | "sent" | "failed";
    providerMessageId?: string | null;
    errorMessage?: string | null;
  }
) {
  if (!supabase) return;
  try {
    const { data: existing } = await supabase
      .from("email_notifications")
      .select("id, attempt_count")
      .eq("idempotency_key", entry.idempotencyKey)
      .maybeSingle();

    const nowIso = new Date().toISOString();
    if (existing) {
      await supabase
        .from("email_notifications")
        .update({
          status: entry.status,
          provider_message_id: entry.providerMessageId || null,
          attempt_count: (existing.attempt_count || 0) + 1,
          error_message: entry.errorMessage || null,
          sent_at: entry.status === "sent" ? nowIso : null,
          last_attempted_at: nowIso,
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("email_notifications").insert({
        booking_id: entry.bookingId,
        notification_type: entry.notificationType,
        idempotency_key: entry.idempotencyKey,
        recipient_email: entry.recipientEmail,
        recipient_name: entry.recipientName,
        subject: entry.subject,
        body_html: entry.bodyHtml,
        body_text: entry.bodyText,
        status: entry.status,
        provider_message_id: entry.providerMessageId || null,
        attempt_count: 1,
        error_message: entry.errorMessage || null,
        sent_at: entry.status === "sent" ? nowIso : null,
        last_attempted_at: nowIso,
      });
    }
  } catch {
    // Non-fatal
  }
}

async function updateBookingEmailState(
  supabase: any,
  bookingId: string,
  state: {
    status: EmailSendStatus;
    error?: string | null;
  }
) {
  if (!supabase) return;
  try {
    const updates: Record<string, any> = {
      email_send_status: state.status,
      email_send_error: state.error ?? null,
      updated_at: new Date().toISOString(),
    };
    if (state.status === "sent") {
      updates.email_last_sent_at = new Date().toISOString();
    }
    await supabase.from("bookings").update(updates).eq("id", bookingId);
  } catch {
    // Non-fatal
  }
}
