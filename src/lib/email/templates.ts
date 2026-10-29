import type { Booking, EmailTemplate, NotificationType } from "@/types/database";
import { formatDhakaDate, formatDhakaTimeRange } from "@/lib/booking/timezone";
import { getSiteBaseUrl } from "@/lib/site-url";

/**
 * Escapes untrusted strings before inserting into HTML email templates to prevent XSS / HTML injection.
 */
export function escapeHtml(input?: string | number | null): string {
  if (input === null || input === undefined) return "";
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const DEFAULT_EMAIL_TEMPLATES: Record<NotificationType, EmailTemplate> = {
  booking_confirmed: {
    id: "booking_confirmed",
    name: "Booking Confirmation Email",
    subject_template: "Booking Confirmed: {{service_title}} ({{booking_ref}}) — OFFPRINT",
    heading: "Your Photography Session is Confirmed",
    intro_text:
      "Thank you for reserving your photography session with OFFPRINT (অফপ্রিন্ট). Your appointment has been confirmed in our schedule with the details below.",
    instructions_text:
      "Please arrive 10 minutes prior to your scheduled start time. For IUB 27th Convocation sessions, please ensure your academic regalia (gown, hood, and mortarboard) is ready prior to your slot.",
    footer_text:
      "OFFPRINT (অফপ্রিন্ট) • Govt. Registered Photography & Bespoke Print Agency • Dhaka, Bangladesh",
    include_policy_summary: true,
    is_active: true,
  },
  booking_rescheduled: {
    id: "booking_rescheduled",
    name: "Booking Rescheduled Email",
    subject_template: "Schedule Updated: {{service_title}} ({{booking_ref}}) — OFFPRINT",
    heading: "Your Session Has Been Rescheduled",
    intro_text:
      "Your photography reservation with OFFPRINT has been moved to a new date and time slot. Your previous slot has been released and your updated schedule is confirmed below.",
    instructions_text:
      "Please review your updated date and time carefully. You can manage your reservation at any time through your Client Portal.",
    footer_text:
      "OFFPRINT (অফপ্রিন্ট) • Govt. Registered Photography & Bespoke Print Agency • Dhaka, Bangladesh",
    include_policy_summary: true,
    is_active: true,
  },
  booking_cancelled: {
    id: "booking_cancelled",
    name: "Booking Cancellation Email",
    subject_template: "Booking Cancelled: {{service_title}} ({{booking_ref}}) — OFFPRINT",
    heading: "Your Reservation Has Been Cancelled",
    intro_text:
      "This notice confirms that your photography reservation with OFFPRINT has been cancelled and the reserved time slot has been released.",
    instructions_text:
      "If you would like to book another photography session in the future, you are welcome to reserve a new slot via our online booking portal.",
    footer_text:
      "OFFPRINT (অফপ্রিন্ট) • Govt. Registered Photography & Bespoke Print Agency • Dhaka, Bangladesh",
    include_policy_summary: false,
    is_active: true,
  },
  booking_updated: {
    id: "booking_updated",
    name: "Booking Updated by Admin Email",
    subject_template: "Reservation Update: {{service_title}} ({{booking_ref}}) — OFFPRINT",
    heading: "Important Update to Your Reservation",
    intro_text:
      "Our production coordinator has updated the details of your photography reservation. Please review the latest summary below.",
    instructions_text:
      "If you have any questions regarding this update, please contact our Dhaka desk or visit your Client Portal.",
    footer_text:
      "OFFPRINT (অফপ্রিন্ট) • Govt. Registered Photography & Bespoke Print Agency • Dhaka, Bangladesh",
    include_policy_summary: true,
    is_active: true,
  },
  schedule_changed: {
    id: "schedule_changed",
    name: "Event Schedule Change Notification",
    subject_template: "Schedule Notice: {{service_title}} ({{booking_ref}}) — OFFPRINT",
    heading: "Event Schedule Notification",
    intro_text:
      "Please note an update regarding the schedule or venue details for your upcoming photography session with OFFPRINT.",
    instructions_text:
      "Please review the updated timing and location details carefully.",
    footer_text:
      "OFFPRINT (অফপ্রিন্ট) • Govt. Registered Photography & Bespoke Print Agency • Dhaka, Bangladesh",
    include_policy_summary: true,
    is_active: true,
  },
  delivery_ready: {
    id: "delivery_ready",
    name: "Gallery Delivery Email",
    subject_template: "Photographs Ready: {{service_title}} ({{booking_ref}}) — OFFPRINT",
    heading: "Your High-Resolution Photographs Are Ready",
    intro_text:
      "Your photograph gallery has been finalized and uploaded. You can access and download your high-resolution photographs using your private photo-bank link below.",
    instructions_text:
      "Please download and save your photographs before the gallery link expires. You can also review your booking deliverables anytime from your Client Portal.",
    footer_text:
      "OFFPRINT (অফপ্রিন্ট) • Govt. Registered Photography & Bespoke Print Agency • Dhaka, Bangladesh",
    include_policy_summary: false,
    is_active: true,
  },
};

function interpolateSubject(templateStr: string, booking: Booking): string {
  return templateStr
    .replace(/\{\{\s*service_title\s*\}\}/g, booking.service_or_event_title)
    .replace(/\{\{\s*booking_ref\s*\}\}/g, booking.booking_ref)
    .replace(/\{\{\s*client_name\s*\}\}/g, booking.client_name);
}

export interface RenderedBookingEmail {
  subject: string;
  html: string;
  text: string;
}

export function renderBookingEmail(params: {
  booking: Booking;
  notificationType: NotificationType;
  templateOverride?: Partial<EmailTemplate> | null;
  previousStartAt?: string | null;
  previousEndAt?: string | null;
  appBaseUrl?: string;
}): RenderedBookingEmail {
  const {
    booking,
    notificationType,
    templateOverride,
    previousStartAt,
    previousEndAt,
    appBaseUrl = getSiteBaseUrl(),
  } = params;

  const baseTemplate = DEFAULT_EMAIL_TEMPLATES[notificationType];
  const tpl: EmailTemplate = {
    ...baseTemplate,
    ...(templateOverride || {}),
  };

  const subject = interpolateSubject(tpl.subject_template, booking);
  const formattedDate = formatDhakaDate(booking.start_at, true);
  const formattedTimeRange = formatDhakaTimeRange(booking.start_at, booking.end_at, true);
  const portalUrl = `${appBaseUrl.replace(/\/$/, "")}/client-portal`;
  const bookAgainUrl = `${appBaseUrl.replace(/\/$/, "")}/book`;

  const previousScheduleLabel =
    previousStartAt && previousEndAt
      ? `${formatDhakaDate(previousStartAt, true)} • ${formatDhakaTimeRange(
          previousStartAt,
          previousEndAt,
          true
        )}`
      : null;

  const agencyPhone = process.env.NEXT_PUBLIC_AGENCY_PHONE || "+880 1700-000000";
  const agencyEmail = process.env.NEXT_PUBLIC_AGENCY_EMAIL || "inquiry@offprint.agency";

  const statusBadgeColor =
    notificationType === "booking_cancelled"
      ? "#8B261D"
      : notificationType === "booking_rescheduled"
      ? "#8C5828"
      : "#3A2008";

  const statusBadgeText =
    notificationType === "booking_confirmed"
      ? "CONFIRMED RESERVATION"
      : notificationType === "booking_rescheduled"
      ? "RESCHEDULED RESERVATION"
      : notificationType === "booking_cancelled"
      ? "CANCELLED RESERVATION"
      : "RESERVATION UPDATE";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#FAF7F2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#141210;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAF7F2;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background-color:#FFFFFF;border:1px solid #E5DEC9;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(20,18,16,0.04);">
          
          <!-- Editorial Header -->
          <tr>
            <td style="background-color:#3A2008;padding:28px 36px;border-bottom:3px solid #A66D35;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="font-size:20px;font-weight:800;letter-spacing:0.08em;color:#FAF7F2;">
                      OFFPRINT <span style="font-size:13px;font-weight:500;color:#D8B084;margin-left:6px;">অফপ্রিন্ট</span>
                    </div>
                    <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#C7B9A8;margin-top:4px;">
                      Photography Studio &amp; Bespoke Print Agency
                    </div>
                  </td>
                  <td align="right" style="vertical-align:top;">
                    <span style="display:inline-block;padding:5px 10px;border-radius:6px;background-color:#4E2C0C;border:1px solid #A66D35;color:#F5EBE0;font-size:11px;font-family:monospace;font-weight:600;">
                      ${escapeHtml(booking.booking_ref)}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding:36px;">
              <div style="display:inline-block;padding:4px 10px;border-radius:999px;background-color:#F4EFE6;border:1px solid #DED6C6;color:${statusBadgeColor};font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:14px;">
                ${statusBadgeText}
              </div>

              <h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.3;font-weight:800;color:#141210;">
                ${escapeHtml(tpl.heading)}
              </h1>

              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#3D3730;">
                Dear <strong>${escapeHtml(booking.client_name)}</strong>,
              </p>

              <p style="margin:0 0 24px 0;font-size:14px;line-height:1.65;color:#574F46;">
                ${escapeHtml(tpl.intro_text)}
              </p>

              <!-- Booking Details Card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAF7F2;border:1px solid #E5DEC9;border-radius:12px;padding:20px;margin-bottom:24px;">
                <tr>
                  <td style="padding:6px 0;font-size:12px;color:#6E665E;width:38%;vertical-align:top;">Booking Reference</td>
                  <td style="padding:6px 0;font-size:13px;font-weight:700;font-family:monospace;color:#141210;">${escapeHtml(booking.booking_ref)}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:12px;color:#6E665E;vertical-align:top;">Service / Event</td>
                  <td style="padding:6px 0;font-size:14px;font-weight:700;color:#3A2008;">${escapeHtml(booking.service_or_event_title)}</td>
                </tr>
                ${
                  booking.package_name
                    ? `<tr>
                  <td style="padding:6px 0;font-size:12px;color:#6E665E;vertical-align:top;">Selected Package</td>
                  <td style="padding:6px 0;font-size:13px;font-weight:600;color:#141210;">${escapeHtml(booking.package_name)}${
                        booking.package_price_label
                          ? ` (${escapeHtml(booking.package_price_label)})`
                          : ""
                      }</td>
                </tr>`
                    : ""
                }
                ${
                  booking.frame_printing_selected
                    ? `<tr>
                  <td style="padding:6px 0;font-size:12px;color:#6E665E;vertical-align:top;">Frame Printing</td>
                  <td style="padding:6px 0;font-size:13px;font-weight:600;color:#141210;">${escapeHtml(
                    booking.frame_type_name || "Archival Frame"
                  )} × ${booking.frame_quantity || 1} (BDT ${(
                        booking.frame_total_price || 0
                      ).toLocaleString()})</td>
                </tr>`
                    : ""
                }
                ${
                  booking.total_price && booking.total_price > 0
                    ? `<tr>
                  <td style="padding:6px 0;font-size:12px;color:#6E665E;vertical-align:top;">Total Amount</td>
                  <td style="padding:6px 0;font-size:14px;font-weight:700;color:#3A2008;">BDT ${(
                    booking.total_price || 0
                  ).toLocaleString()}</td>
                </tr>`
                    : ""
                }
                <tr>
                  <td style="padding:6px 0;font-size:12px;color:#6E665E;vertical-align:top;">Date (Asia/Dhaka)</td>
                  <td style="padding:6px 0;font-size:13px;font-weight:700;color:#141210;">${escapeHtml(formattedDate)}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:12px;color:#6E665E;vertical-align:top;">Confirmed Time</td>
                  <td style="padding:6px 0;font-size:13px;font-weight:700;color:#141210;">${escapeHtml(formattedTimeRange)} (${booking.duration_mins} mins)</td>
                </tr>
                ${
                  previousScheduleLabel
                    ? `<tr>
                  <td style="padding:6px 0;font-size:12px;color:#6E665E;vertical-align:top;">Previous Schedule</td>
                  <td style="padding:6px 0;font-size:12px;color:#8C8277;text-decoration:line-through;">${escapeHtml(previousScheduleLabel)}</td>
                </tr>`
                    : ""
                }
                <tr>
                  <td style="padding:6px 0;font-size:12px;color:#6E665E;vertical-align:top;">Venue / Location</td>
                  <td style="padding:6px 0;font-size:13px;color:#141210;">${escapeHtml(booking.location)}</td>
                </tr>
                ${
                  booking.student_id
                    ? `<tr>
                  <td style="padding:6px 0;font-size:12px;color:#6E665E;vertical-align:top;">Student ID / Dept</td>
                  <td style="padding:6px 0;font-size:13px;color:#141210;">${escapeHtml(booking.student_id)}${
                        booking.degree_or_department
                          ? ` • ${escapeHtml(booking.degree_or_department)}`
                          : ""
                      }</td>
                </tr>`
                    : ""
                }
                ${
                  booking.custom_fields && Object.keys(booking.custom_fields).length > 0
                    ? Object.entries(booking.custom_fields)
                        .filter(
                          ([k]) =>
                            k !== "student_id" && k !== "degree_or_department"
                        )
                        .map(
                          ([k, v]) => `<tr>
                  <td style="padding:6px 0;font-size:12px;color:#6E665E;vertical-align:top;text-transform:capitalize;">${escapeHtml(
                    k.replace(/_/g, " ")
                  )}</td>
                  <td style="padding:6px 0;font-size:13px;color:#141210;">${escapeHtml(
                    Array.isArray(v) ? v.join(", ") : String(v)
                  )}</td>
                </tr>`
                        )
                        .join("")
                    : ""
                }
                ${
                  booking.cancellation_reason && notificationType === "booking_cancelled"
                    ? `<tr>
                  <td style="padding:6px 0;font-size:12px;color:#6E665E;vertical-align:top;">Cancellation Note</td>
                  <td style="padding:6px 0;font-size:13px;color:#8B261D;">${escapeHtml(booking.cancellation_reason)}</td>
                </tr>`
                    : ""
                }
              </table>

              <!-- Instructions & Next Steps -->
              ${
                tpl.instructions_text
                  ? `<div style="background-color:#FBF9F5;border-left:3px solid #A66D35;padding:14px 16px;margin-bottom:24px;border-radius:0 8px 8px 0;">
                <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#8C5828;margin-bottom:4px;">
                  Preparation &amp; Next Steps
                </div>
                <div style="font-size:13px;line-height:1.55;color:#4A433B;">
                  ${escapeHtml(tpl.instructions_text)}
                </div>
              </div>`
                  : ""
              }

              <!-- CTA Button -->
              <div style="margin:28px 0;text-align:center;">
                <a href="${escapeHtml(
                  notificationType === "booking_cancelled" ? bookAgainUrl : portalUrl
                )}" style="display:inline-block;padding:13px 28px;background-color:#3A2008;color:#FAF7F2;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;border-radius:10px;">
                  ${
                    notificationType === "booking_cancelled"
                      ? "Book a New Session"
                      : "Manage Booking in Client Portal"
                  }
                </a>
              </div>

              <!-- Policy Summary -->
              ${
                tpl.include_policy_summary
                  ? `<div style="border-top:1px solid #E5DEC9;padding-top:18px;margin-top:24px;font-size:12px;line-height:1.6;color:#6E665E;">
                <strong style="color:#3D3730;">Rescheduling &amp; Cancellation Policy:</strong><br />
                You may reschedule this reservation up to <strong>${booking.reschedule_cutoff_hours} hours</strong> or cancel up to <strong>${booking.cancellation_cutoff_hours} hours</strong> prior to your scheduled start time via your <a href="${escapeHtml(portalUrl)}" style="color:#8C5828;text-decoration:underline;">Client Portal</a>.
              </div>`
                  : ""
              }

              <!-- Direct Contact -->
              <div style="border-top:1px solid #E5DEC9;padding-top:16px;margin-top:16px;font-size:12px;line-height:1.6;color:#6E665E;">
                Need immediate assistance? Call our Dhaka desk at <a href="tel:${escapeHtml(agencyPhone.replace(/\s+/g, ""))}" style="color:#3A2008;font-weight:600;text-decoration:none;">${escapeHtml(agencyPhone)}</a> or reply to <a href="mailto:${escapeHtml(agencyEmail)}" style="color:#3A2008;font-weight:600;text-decoration:none;">${escapeHtml(agencyEmail)}</a>.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#F4EFE6;padding:20px 36px;border-top:1px solid #E5DEC9;text-align:center;font-size:11px;color:#6E665E;">
              ${escapeHtml(tpl.footer_text)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textLines = [
    `OFFPRINT (অফপ্রিন্ট) — ${statusBadgeText}`,
    `============================================================`,
    `${tpl.heading}`,
    ``,
    `Dear ${booking.client_name},`,
    ``,
    tpl.intro_text,
    ``,
    `BOOKING SUMMARY`,
    `------------------------------------------------------------`,
    `Booking Reference : ${booking.booking_ref}`,
    `Service / Event   : ${booking.service_or_event_title}`,
    ...(booking.package_name
      ? [
          `Package           : ${booking.package_name}${
            booking.package_price_label ? ` (${booking.package_price_label})` : ""
          }`,
        ]
      : []),
    ...(booking.frame_printing_selected
      ? [
          `Frame Printing    : ${booking.frame_type_name || "Archival Frame"} x ${booking.frame_quantity || 1} (BDT ${(booking.frame_total_price || 0).toLocaleString()})`,
        ]
      : []),
    ...(booking.total_price && booking.total_price > 0
      ? [
          `Total Price       : BDT ${(booking.total_price || 0).toLocaleString()}`,
        ]
      : []),
    `Date (Asia/Dhaka) : ${formattedDate}`,
    `Confirmed Time    : ${formattedTimeRange} (${booking.duration_mins} mins)`,
    ...(previousScheduleLabel ? [`Previous Schedule : ${previousScheduleLabel}`] : []),
    `Venue / Location  : ${booking.location}`,
    ...(booking.student_id
      ? [
          `Student ID        : ${booking.student_id}${
            booking.degree_or_department ? ` (${booking.degree_or_department})` : ""
          }`,
        ]
      : []),
    ...(booking.custom_fields && Object.keys(booking.custom_fields).length > 0
      ? Object.entries(booking.custom_fields)
          .filter(([k]) => k !== "student_id" && k !== "degree_or_department")
          .map(
            ([k, v]) =>
              `${k.replace(/_/g, " ")}: ${Array.isArray(v) ? v.join(", ") : String(v)}`
          )
      : []),
    ...(booking.cancellation_reason && notificationType === "booking_cancelled"
      ? [`Cancellation Note : ${booking.cancellation_reason}`]
      : []),
    `------------------------------------------------------------`,
    ``,
    ...(tpl.instructions_text
      ? [`PREPARATION & NEXT STEPS:`, tpl.instructions_text, ``]
      : []),
    ...(tpl.include_policy_summary
      ? [
          `RESCHEDULING & CANCELLATION POLICY:`,
          `Reschedule up to ${booking.reschedule_cutoff_hours} hours or cancel up to ${booking.cancellation_cutoff_hours} hours before your session time.`,
          ``,
        ]
      : []),
    `Manage your booking in the OFFPRINT Client Portal: ${portalUrl}`,
    `Contact Desk: ${agencyPhone} | ${agencyEmail}`,
    ``,
    tpl.footer_text,
  ];

  return {
    subject,
    html,
    text: textLines.join("\r\n"),
  };
}
