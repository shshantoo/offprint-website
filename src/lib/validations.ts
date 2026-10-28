import { z } from "zod";
import type {
  FramePrintingConfig,
  BookingPricingSnapshot,
  PhotographyPackage,
} from "@/types/database";

export const leadFormSchema = z.object({
  client_name: z.string().min(2, "Please enter your full name or representative name"),
  company_name: z.string().optional(),
  email: z.string().email("Please enter a valid business email address"),
  phone: z.string().min(8, "Please enter a valid contact phone number (e.g. +880 17...)"),
  inquiry_type: z.enum(["event_coverage", "physical_merch"]),
  details: z.string().min(10, "Please outline your project scope, vision or custom specifications"),
  estimated_qty: z.string().optional(),
  event_date: z.string().optional(),
});

export type LeadFormData = z.infer<typeof leadFormSchema>;

export const portfolioGalleryItemSchema = z.object({
  id: z.string().min(1),
  url: z.string().url("Valid image URL is required"),
  storage_path: z.string().optional().nullable(),
  caption: z.string().max(300).default(""),
  alt_text: z.string().max(300).default(""),
  sort_order: z.coerce.number().int().min(0).default(0),
  width: z.coerce.number().int().optional().nullable(),
  height: z.coerce.number().int().optional().nullable(),
  size_bytes: z.coerce.number().int().optional().nullable(),
  mime_type: z.string().optional().nullable(),
});

export const portfolioFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  client_name: z.string().min(2, "Client name is required"),
  category: z.enum([
    "corporate_summit",
    "documentary",
    "headshot",
    "workshop",
    "wedding",
  ]),
  is_flagship: z.boolean().default(false),
  thumbnail_url: z.string().url("Valid thumbnail image URL required"),
  cover_storage_path: z.string().optional().nullable(),
  cover_alt_text: z.string().max(300).optional(),
  cover_caption: z.string().max(300).optional(),
  gallery_urls: z.string().optional(),
  gallery_items: z.array(portfolioGalleryItemSchema).optional(),
  video_url: z.string().optional(),
  completed_date: z.string().optional(),
  description: z.string().optional(),
});

export type PortfolioFormData = z.infer<typeof portfolioFormSchema>;

export const productFormSchema = z.object({
  title: z.string().min(3, "Product title is required"),
  category: z.enum(["cards", "frames", "corporate_swag", "pens", "banners"]),
  material_specs: z.string().min(5, "Material and print specifications are required"),
  image_url: z.string().url("Valid product image URL is required"),
  gallery_urls: z.string().optional(),
  min_order_qty: z.coerce.number().min(1, "Minimum order quantity must be at least 1"),
  is_trending: z.boolean().default(false),
  sample_finish: z.string().optional(),
});

export type ProductFormData = z.infer<typeof productFormSchema>;

// =============================================================================
// BOOKING SYSTEM & PORTAL VALIDATION SCHEMAS
// =============================================================================

export const customQuestionFieldTypeSchema = z.enum([
  "short_text",
  "long_text",
  "dropdown",
  "single_choice",
  "multiple_choice",
]);

export const customQuestionSchema = z
  .object({
    id: z.string().trim().min(1),
    key: z
      .string()
      .trim()
      .min(2, "Question key must be at least 2 characters")
      .max(64)
      .regex(/^[a-z0-9_]+$/, "Question key must contain lowercase letters, numbers, and underscores")
      .optional(),
    label: z.string().trim().min(2, "Question label is required").max(160),
    description: z.string().trim().max(400).optional().nullable(),
    help_text: z.string().trim().max(400).optional().nullable(),
    placeholder: z.string().trim().max(160).optional().nullable(),
    field_type: customQuestionFieldTypeSchema.optional(),
    type: customQuestionFieldTypeSchema.optional(),
    required: z.boolean().default(false),
    options: z.array(z.string().trim().min(1)).optional().default([]),
    min_length: z.coerce.number().int().min(0).max(2000).optional().nullable(),
    max_length: z.coerce.number().int().min(1).max(5000).optional().nullable(),
    validation_regex: z.string().trim().max(240).optional().nullable(),
    validation_message: z.string().trim().max(240).optional().nullable(),
    sort_order: z.coerce.number().int().default(0),
  })
  .transform((val) => {
    const resolvedKey = (val.key || val.id)
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/(^_|_$)/g, "");
    const resolvedType = val.field_type || val.type || "short_text";
    return {
      ...val,
      key: resolvedKey || "question",
      field_type: resolvedType,
      type: resolvedType,
    };
  })
  .superRefine((val, ctx) => {
    if (
      (val.field_type === "dropdown" ||
        val.field_type === "single_choice" ||
        val.field_type === "multiple_choice") &&
      (!val.options || val.options.length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["options"],
        message: "Choice and dropdown questions require at least one option",
      });
    }
  });

export type CustomQuestionInput = z.infer<typeof customQuestionSchema>;

export function validateCustomFieldsAgainstQuestions(
  questions: Array<Partial<CustomQuestionInput> & { id?: string; key?: string; label: string; type?: string; field_type?: string }> | undefined | null,
  customFields: Record<string, string | string[]> | undefined | null
): {
  valid: boolean;
  sanitized: Record<string, string | string[]>;
  errors: Record<string, string>;
} {
  const sanitized: Record<string, string | string[]> = {};
  const errors: Record<string, string> = {};
  const raw = customFields || {};

  if (!questions || questions.length === 0) {
    for (const [k, v] of Object.entries(raw)) {
      if (typeof v === "string") {
        const trimmed = v.trim();
        if (trimmed) sanitized[k] = trimmed.slice(0, 2000);
      } else if (Array.isArray(v)) {
        const cleaned = v.map((item) => String(item).trim()).filter(Boolean);
        if (cleaned.length > 0) sanitized[k] = cleaned;
      }
    }
    return { valid: true, sanitized, errors };
  }

  for (const q of questions) {
    const qKey = (q.key || q.id || "").trim();
    if (!qKey) continue;
    const qType = q.field_type || q.type || "short_text";
    const val = raw[qKey] ?? (q.id ? raw[q.id] : undefined);

    if (qType === "multiple_choice") {
      const arr = Array.isArray(val)
        ? val.map((item) => String(item).trim()).filter(Boolean)
        : typeof val === "string" && val.trim()
        ? val
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        : [];

      if (q.required && arr.length === 0) {
        errors[qKey] = `${q.label} is required`;
        continue;
      }

      if (arr.length > 0 && q.options && q.options.length > 0) {
        const invalidOpt = arr.find((item) => !q.options!.includes(item));
        if (invalidOpt) {
          errors[qKey] = `Invalid option "${invalidOpt}" for ${q.label}`;
          continue;
        }
      }

      if (arr.length > 0) {
        sanitized[qKey] = arr;
      }
      continue;
    }

    const strVal = Array.isArray(val) ? val.join(", ").trim() : typeof val === "string" ? val.trim() : "";

    if (!strVal) {
      if (q.required) {
        errors[qKey] = `${q.label} is required`;
      }
      continue;
    }

    if (qType === "dropdown" || qType === "single_choice") {
      if (q.options && q.options.length > 0 && !q.options.includes(strVal)) {
        errors[qKey] = `Please select a valid option for ${q.label}`;
        continue;
      }
    }

    if (typeof q.min_length === "number" && q.min_length > 0 && strVal.length < q.min_length) {
      errors[qKey] = `${q.label} must be at least ${q.min_length} characters`;
      continue;
    }

    if (typeof q.max_length === "number" && q.max_length > 0 && strVal.length > q.max_length) {
      errors[qKey] = `${q.label} must be at most ${q.max_length} characters`;
      continue;
    }

    if (q.validation_regex) {
      try {
        const re = new RegExp(q.validation_regex);
        if (!re.test(strVal)) {
          errors[qKey] = q.validation_message || `${q.label} format is invalid`;
          continue;
        }
      } catch {
        // Ignore malformed regex defined by admin
      }
    }

    sanitized[qKey] = strVal;
  }

  return {
    valid: Object.keys(errors).length === 0,
    sanitized,
    errors,
  };
}

export const createBookingSchema = z
  .object({
    idempotency_key: z.string().max(128).optional(),
    booking_type: z.enum(["convocation", "special", "traditional"]),
    event_id: z.string().uuid().optional().nullable(),
    session_id: z.string().uuid().optional().nullable(),
    slot_id: z.string().uuid().optional().nullable(),
    service_id: z.string().uuid().optional().nullable(),
    package_id: z.string().uuid().optional().nullable(),
    booking_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Valid YYYY-MM-DD date is required"),
    start_at: z.string().min(10, "Valid start timestamp is required"),
    end_at: z.string().min(10, "Valid end timestamp is required"),
    duration_mins: z.coerce.number().int().min(10).max(720),
    client_name: z.string().trim().min(2, "Please enter your full name"),
    client_email: z.string().trim().email("Please enter a valid email address"),
    client_phone: z.string().trim().min(7, "Please enter a valid phone number"),
    company_or_institution: z.string().trim().max(160).optional().nullable(),
    student_id: z.string().trim().max(64).optional().nullable(),
    degree_or_department: z.string().trim().max(160).optional().nullable(),
    guests_count: z.coerce.number().int().min(1).max(100).default(1),
    location: z.string().trim().min(3, "Please specify the venue or session location"),
    client_notes: z.string().trim().max(2000).optional().nullable(),
    custom_fields: z
      .record(z.string(), z.union([z.string(), z.array(z.string())]))
      .optional()
      .default({}),
    frame_printing_selected: z.boolean().optional().default(false),
    frame_type_id: z.string().trim().optional().nullable(),
    frame_quantity: z.coerce.number().int().min(0).max(20).optional().default(0),
  })
  .superRefine((val, ctx) => {
    if (val.booking_type === "convocation" || val.booking_type === "special") {
      if (!val.event_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["event_id"],
          message: "Special event selection is required",
        });
      }
      if (!val.slot_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["slot_id"],
          message: "Please select an available time slot",
        });
      }
    } else if (val.booking_type === "traditional") {
      if (!val.service_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["service_id"],
          message: "Please select a photography service",
        });
      }
    }
    const startMs = Date.parse(val.start_at);
    const endMs = Date.parse(val.end_at);
    if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["end_at"],
        message: "Session end time must be after start time",
      });
    }
  });

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const rescheduleBookingSchema = z.object({
  new_slot_id: z.string().uuid().optional().nullable(),
  new_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Valid YYYY-MM-DD date is required"),
  new_start_at: z.string().min(10, "Valid new start time is required"),
  new_end_at: z.string().min(10, "Valid new end time is required"),
  reason: z.string().trim().max(500).optional().nullable(),
});

export type RescheduleBookingInput = z.infer<typeof rescheduleBookingSchema>;

export const cancelBookingSchema = z.object({
  reason: z.string().trim().min(3, "Please provide a brief reason for cancellation").max(500),
});

export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;

export const clientProfileSchema = z.object({
  full_name: z.string().trim().min(2, "Full name must be at least 2 characters").max(120),
  phone: z.string().trim().min(7, "Please enter a valid contact phone number").max(40),
  company_or_institution: z.string().trim().max(160).optional().nullable(),
  student_id: z.string().trim().max(64).optional().nullable(),
});

export type ClientProfileInput = z.infer<typeof clientProfileSchema>;

export const frameTypeOptionSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(2),
  dimensions: z.string().trim().min(2),
  price: z.coerce.number().min(0),
  description: z.string().trim().optional().nullable(),
  is_active: z.boolean().default(true),
});

export const framePrintingConfigSchema = z.object({
  enabled: z.boolean().default(false),
  title: z.string().trim().min(2).default("Archival Frame Printing"),
  description: z.string().trim().default("Professional wooden & metallic framing for your portraits"),
  max_quantity: z.coerce.number().int().min(1).max(20).default(5),
  instructions: z.string().trim().optional().nullable(),
  eligible_package_ids: z.array(z.string().uuid()).optional().default([]),
  frame_types: z.array(frameTypeOptionSchema).default([]),
});

export const bookingEventSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(96)
    .regex(/^[a-z0-9-]+$/, "Slug must contain lowercase letters, numbers, and hyphens"),
  title: z.string().trim().min(3, "Event title is required").max(160),
  category: z.string().trim().min(2).max(64).default("convocation"),
  subtitle: z.string().trim().optional().nullable(),
  description: z.string().trim().min(10, "Event description is required"),
  venue: z.string().trim().optional().nullable(),
  hero_image_url: z.string().url().optional().nullable().or(z.literal("")),
  cover_storage_path: z.string().trim().optional().nullable(),
  status: z.enum(["draft", "published", "paused", "closed", "archived"]),
  timezone: z.string().trim().default("Asia/Dhaka"),
  event_start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable()
    .or(z.literal("")),
  event_end_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable()
    .or(z.literal("")),
  event_start_time: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/)
    .optional()
    .nullable()
    .default("09:00:00"),
  event_end_time: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/)
    .optional()
    .nullable()
    .default("18:00:00"),
  booking_opens_at: z.string().optional().nullable(),
  booking_closes_at: z.string().optional().nullable(),
  default_slot_duration_mins: z.coerce.number().int().min(10).max(480),
  buffer_before_mins: z.coerce.number().int().min(0).max(180),
  buffer_after_mins: z.coerce.number().int().min(0).max(180),
  default_slot_capacity: z.coerce.number().int().min(1).max(100),
  min_notice_hours: z.coerce.number().int().min(0).max(720).default(12),
  max_advance_days: z.coerce.number().int().min(1).max(730).default(180),
  cancellation_cutoff_hours: z.coerce.number().int().min(0).max(720),
  reschedule_cutoff_hours: z.coerce.number().int().min(0).max(720),
  cancellation_policy: z.string().trim().min(10, "Cancellation policy is required"),
  booking_restrictions: z.string().trim().optional().nullable(),
  instructions: z.string().trim().optional().nullable(),
  custom_questions: z.array(customQuestionSchema).optional().default([]),
  frame_printing_config: framePrintingConfigSchema.optional(),
  is_featured_on_home: z.boolean().optional().default(false),
  resource_pool: z.string().trim().min(1).default("primary_studio"),
});

export const eventSessionSchema = z.object({
  id: z.string().uuid().optional(),
  event_id: z.string().uuid(),
  session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Valid YYYY-MM-DD date required"),
  title: z.string().trim().min(2, "Session title is required"),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Valid HH:mm start time required"),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Valid HH:mm end time required"),
  slot_duration_mins: z.coerce.number().int().min(10).max(360),
  buffer_before_mins: z.coerce.number().int().min(0).max(120).default(0),
  buffer_after_mins: z.coerce.number().int().min(0).max(120).default(10),
  capacity_per_slot: z.coerce.number().int().min(1).max(100).default(1),
  is_active: z.boolean().default(true),
  notes: z.string().optional().nullable(),
  auto_generate_slots: z.boolean().optional().default(true),
});

export const photographyServiceSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().trim().min(3).regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(3),
  category: z.string().trim().min(2).default("portrait"),
  tagline: z.string().trim().optional().nullable(),
  short_description: z.string().trim().min(10),
  full_description: z.string().trim().optional().nullable(),
  base_duration_mins: z.coerce.number().int().min(15).max(720),
  allowed_durations: z.array(z.coerce.number().int().min(15).max(720)).min(1),
  buffer_before_mins: z.coerce.number().int().min(0).max(180),
  buffer_after_mins: z.coerce.number().int().min(0).max(180),
  min_notice_hours: z.coerce.number().int().min(0).max(720),
  max_advance_days: z.coerce.number().int().min(1).max(730),
  cancellation_cutoff_hours: z.coerce.number().int().min(0).max(720),
  reschedule_cutoff_hours: z.coerce.number().int().min(0).max(720),
  default_location_type: z.string().trim().min(2),
  resource_pool: z.string().trim().min(1).default("primary_studio"),
  max_concurrent_bookings: z.coerce.number().int().min(1).max(20).default(1),
  image_url: z.string().url().optional().nullable().or(z.literal("")),
  is_active: z.boolean().default(true),
  sort_order: z.coerce.number().int().default(0),
});

export const photographyPackageSchema = z.object({
  id: z.string().uuid().optional(),
  event_id: z.string().uuid().optional().nullable(),
  service_id: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(2),
  subtitle: z.string().trim().optional().nullable(),
  description: z.string().trim().min(5),
  instructions: z.string().trim().optional().nullable(),
  duration_mins: z.coerce.number().int().min(10).max(720),
  price_label: z.string().trim().min(1),
  price_numeric: z.coerce.number().min(0).default(0),
  currency: z.string().trim().default("BDT"),
  deliverables: z.array(z.string().trim().min(1)),
  inclusions: z.array(z.string().trim()).optional().default([]),
  restrictions: z.string().trim().optional().nullable(),
  frame_printing_enabled: z.boolean().optional().default(true),
  max_people: z.coerce.number().int().min(1).optional().nullable(),
  is_featured: z.boolean().default(false),
  is_active: z.boolean().default(true),
  sort_order: z.coerce.number().int().default(0),
});

// =============================================================================
// ADMIN AUTHENTICATION & CREDENTIAL SECURITY SCHEMAS
// =============================================================================

export const adminUsernameFormatRegex = /^[a-zA-Z0-9_.-]{3,32}$/;

export const adminLoginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(3, "Please enter your administrator username or email")
    .max(160),
  password: z.string().min(1, "Please enter your password").max(256),
});

export const adminFirstLoginCredentialSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, "Username must be at least 3 characters")
      .max(32, "Username must be at most 32 characters")
      .regex(
        adminUsernameFormatRegex,
        "Username may only contain letters, numbers, dots (.), hyphens (-), and underscores (_)"
      )
      .transform((s) => s.toLowerCase()),
    currentPassword: z.string().optional(),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters long")
      .max(128, "New password must be at most 128 characters long")
      .regex(/[A-Za-z]/, "New password must contain at least one letter")
      .regex(/[0-9]/, "New password must contain at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .superRefine((val, ctx) => {
    if (val.newPassword !== val.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Password confirmation does not match new password",
      });
    }
    if (val.currentPassword && val.currentPassword === val.newPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["newPassword"],
        message: "New password must be different from your current password",
      });
    }
  });

export const adminAccountUpdateSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, "Username must be at least 3 characters")
      .max(32, "Username must be at most 32 characters")
      .regex(
        adminUsernameFormatRegex,
        "Username may only contain letters, numbers, dots (.), hyphens (-), and underscores (_)"
      )
      .transform((s) => s.toLowerCase())
      .optional(),
    currentPassword: z
      .string()
      .min(1, "Please enter your current password to confirm security changes"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters long")
      .max(128, "New password must be at most 128 characters long")
      .regex(/[A-Za-z]/, "New password must contain at least one letter")
      .regex(/[0-9]/, "New password must contain at least one number")
      .optional()
      .or(z.literal("")),
    confirmPassword: z.string().optional().or(z.literal("")),
    confirmNewPassword: z.string().optional().or(z.literal("")),
  })
  .superRefine((val, ctx) => {
    const wantsPasswordChange = Boolean(val.newPassword && val.newPassword.length > 0);
    if (!val.username && !wantsPasswordChange) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["username"],
        message: "Provide a new username or a new password to update",
      });
    }
    if (wantsPasswordChange) {
      const confirmation = val.confirmPassword || val.confirmNewPassword || "";
      if (val.newPassword !== confirmation) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["confirmPassword"],
          message: "Password confirmation does not match new password",
        });
      }
      if (val.currentPassword === val.newPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["newPassword"],
          message: "New password must be different from your current password",
        });
      }
    }
  });

// =============================================================================
// SERVER-TRUSTED PRICING & FRAME PRINTING CALCULATION
// =============================================================================

export function calculateAndVerifyBookingPrice(params: {
  pkg?: PhotographyPackage | null;
  frameConfig?: FramePrintingConfig | null;
  frameSelected?: boolean;
  frameTypeId?: string | null;
  frameQuantity?: number;
}): {
  package_base_price: number;
  frame_printing_selected: boolean;
  frame_type_id: string | null;
  frame_type_name: string | null;
  frame_dimensions: string | null;
  frame_quantity: number;
  frame_unit_price: number;
  frame_total_price: number;
  total_price: number;
  currency: string;
  pricing_snapshot: BookingPricingSnapshot;
} {
  const {
    pkg,
    frameConfig,
    frameSelected = false,
    frameTypeId = null,
    frameQuantity = 0,
  } = params;

  let basePrice = 0;
  if (pkg) {
    if (typeof pkg.price_numeric === "number" && pkg.price_numeric > 0) {
      basePrice = pkg.price_numeric;
    } else {
      const match = (pkg.price_label || "").replace(/,/g, "").match(/\d+/);
      if (match) {
        basePrice = Number(match[0]) || 0;
      }
    }
  }

  const currency = pkg?.currency || "BDT";
  const durationMins = pkg?.duration_mins || 30;

  let isFrameEligible = Boolean(frameConfig?.enabled);
  if (isFrameEligible && pkg && pkg.frame_printing_enabled === false) {
    isFrameEligible = false;
  }
  if (
    isFrameEligible &&
    frameConfig?.eligible_package_ids &&
    frameConfig.eligible_package_ids.length > 0 &&
    pkg?.id &&
    !frameConfig.eligible_package_ids.includes(pkg.id)
  ) {
    isFrameEligible = false;
  }

  let finalFrameSelected = false;
  let finalFrameTypeId: string | null = null;
  let finalFrameTypeName: string | null = null;
  let finalFrameDimensions: string | null = null;
  let finalFrameQuantity = 0;
  let finalFrameUnitPrice = 0;
  let finalFrameTotalPrice = 0;

  if (frameSelected && isFrameEligible && frameTypeId && frameConfig?.frame_types) {
    const chosenFrame = frameConfig.frame_types.find((f) => f.id === frameTypeId);
    if (chosenFrame && (chosenFrame.is_active !== false)) {
      finalFrameSelected = true;
      finalFrameTypeId = chosenFrame.id;
      finalFrameTypeName = chosenFrame.name;
      finalFrameDimensions = chosenFrame.dimensions;
      finalFrameUnitPrice = Number(chosenFrame.price) || 0;
      const maxAllowed = frameConfig.max_quantity || 5;
      finalFrameQuantity = Math.min(Math.max(1, Number(frameQuantity) || 1), maxAllowed);
      finalFrameTotalPrice = finalFrameUnitPrice * finalFrameQuantity;
    }
  }

  const totalPrice = basePrice + finalFrameTotalPrice;

  const snapshot: BookingPricingSnapshot = {
    package_id: pkg?.id || null,
    package_name: pkg?.name || null,
    package_base_price: basePrice,
    currency,
    duration_mins: durationMins,
    frame_printing_selected: finalFrameSelected,
    frame_type_id: finalFrameTypeId,
    frame_type_name: finalFrameTypeName,
    frame_dimensions: finalFrameDimensions,
    frame_quantity: finalFrameQuantity,
    frame_unit_price: finalFrameUnitPrice,
    frame_total_price: finalFrameTotalPrice,
    total_price: totalPrice,
    calculated_at: new Date().toISOString(),
  };

  return {
    package_base_price: basePrice,
    frame_printing_selected: finalFrameSelected,
    frame_type_id: finalFrameTypeId,
    frame_type_name: finalFrameTypeName,
    frame_dimensions: finalFrameDimensions,
    frame_quantity: finalFrameQuantity,
    frame_unit_price: finalFrameUnitPrice,
    frame_total_price: finalFrameTotalPrice,
    total_price: totalPrice,
    currency,
    pricing_snapshot: snapshot,
  };
}
