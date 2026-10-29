export type PortfolioCategory =
  | 'corporate_summit'
  | 'documentary'
  | 'headshot'
  | 'workshop'
  | 'wedding';

export type PrintCategory =
  | 'cards'
  | 'frames'
  | 'corporate_swag'
  | 'pens'
  | 'banners';

export type InquiryType = 'event_coverage' | 'physical_merch';

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'quote_sent'
  | 'confirmed'
  | 'archived';

export interface PortfolioGalleryItem {
  id: string;
  url: string;
  storage_path?: string | null;
  caption: string;
  alt_text: string;
  sort_order: number;
  width?: number | null;
  height?: number | null;
  size_bytes?: number | null;
  mime_type?: string | null;
}

export interface PortfolioProject {
  id: string;
  title: string;
  client_name: string;
  category: PortfolioCategory;
  is_flagship: boolean;
  thumbnail_url: string;
  cover_storage_path?: string | null;
  cover_alt_text?: string;
  cover_caption?: string;
  gallery_urls: string[];
  gallery_items?: PortfolioGalleryItem[];
  video_url?: string | null;
  completed_date?: string | null;
  created_at?: string;
  updated_at?: string;
  description?: string;
}

export interface PrintProduct {
  id: string;
  title: string;
  category: PrintCategory;
  material_specs: string;
  image_url: string;
  gallery_urls: string[];
  min_order_qty: number;
  is_trending: boolean;
  created_at?: string;
  sample_finish?: string;
}

export interface Lead {
  id: string;
  client_name: string;
  company_name?: string | null;
  email: string;
  phone: string;
  inquiry_type: InquiryType;
  details: string;
  estimated_qty?: string | null;
  event_date?: string | null;
  status: LeadStatus;
  admin_notes?: string | null;
  created_at?: string;
}

// =============================================================================
// BOOKING SYSTEM, CLIENT PORTAL, CMS & GOOGLE INTEGRATIONS TYPES
// =============================================================================

export type UserRole = 'client' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  username?: string | null;
  full_name: string;
  phone: string;
  company_or_institution?: string | null;
  student_id?: string | null;
  role: UserRole;
  must_change_credentials?: boolean;
  credentials_changed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type BookingEventStatus =
  | 'draft'
  | 'published'
  | 'paused'
  | 'closed'
  | 'archived';

export type SpecialEventCategory =
  | 'convocation'
  | 'graduation'
  | 'campaign'
  | 'corporate_drive'
  | 'mini_session'
  | 'seasonal'
  | 'custom';

export type CustomQuestionFieldType =
  | 'short_text'
  | 'long_text'
  | 'dropdown'
  | 'single_choice'
  | 'multiple_choice';

export interface CustomBookingQuestion {
  id: string;
  key?: string;
  label: string;
  description?: string | null;
  help_text?: string | null;
  placeholder?: string | null;
  field_type?: CustomQuestionFieldType;
  type?: CustomQuestionFieldType;
  required: boolean;
  options?: string[];
  min_length?: number | null;
  max_length?: number | null;
  validation_regex?: string | null;
  validation_message?: string | null;
  sort_order?: number;
}

export interface FrameTypeOption {
  id: string;
  name: string;
  dimensions: string; // e.g. "12\" x 18\""
  price: number; // numeric price in BDT
  description?: string;
  is_active?: boolean;
}

export interface FramePrintingConfig {
  enabled: boolean;
  title: string;
  description: string;
  frame_types: FrameTypeOption[];
  max_quantity: number;
  eligible_package_ids?: string[]; // empty means all packages eligible
  instructions?: string;
}

export interface BookingPricingSnapshot {
  package_id?: string | null;
  package_name?: string | null;
  package_base_price: number;
  currency: string;
  duration_mins: number;
  frame_printing_selected: boolean;
  frame_type_id?: string | null;
  frame_type_name?: string | null;
  frame_dimensions?: string | null;
  frame_quantity: number;
  frame_unit_price: number;
  frame_total_price: number;
  total_price: number;
  calculated_at: string;
}

export interface BookingEvent {
  id: string;
  slug: string;
  title: string;
  category?: SpecialEventCategory | string;
  subtitle?: string | null;
  description: string;
  venue?: string | null;
  hero_image_url?: string | null;
  cover_storage_path?: string | null;
  status: BookingEventStatus;
  timezone?: string;
  event_start_date?: string | null;
  event_end_date?: string | null;
  event_start_time?: string | null;
  event_end_time?: string | null;
  booking_opens_at?: string | null;
  booking_closes_at?: string | null;
  default_slot_duration_mins: number;
  buffer_before_mins: number;
  buffer_after_mins: number;
  default_slot_capacity: number;
  min_notice_hours?: number;
  max_advance_days?: number;
  cancellation_cutoff_hours: number;
  reschedule_cutoff_hours: number;
  cancellation_policy: string;
  booking_restrictions?: string | null;
  instructions?: string | null;
  custom_questions?: CustomBookingQuestion[];
  frame_printing_config?: FramePrintingConfig;
  is_featured_on_home?: boolean;
  is_booking_enabled?: boolean;
  is_visible_on_booking_page?: boolean;
  operating_days?: number[];
  operating_start_time?: string;
  operating_end_time?: string;
  slot_interval_mins?: number;
  break_periods?: Array<{ name: string; start_time: string; end_time: string }>;
  schedule_overrides?: Array<{ date: string; is_closed?: boolean; start_time?: string; end_time?: string }>;
  resource_pool: string;
  created_at?: string;
  updated_at?: string;
}

export interface EventSession {
  id: string;
  event_id: string;
  session_date: string; // YYYY-MM-DD
  title: string;
  start_time: string; // HH:mm or HH:mm:ss
  end_time: string;
  slot_duration_mins: number;
  buffer_before_mins: number;
  buffer_after_mins: number;
  capacity_per_slot: number;
  is_active: boolean;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type SlotStatus = 'available' | 'blocked' | 'closed';

export interface EventTimeSlot {
  id: string;
  event_id: string;
  session_id?: string | null;
  slot_date: string; // YYYY-MM-DD
  start_at: string; // ISO timestamptz
  end_at: string; // ISO timestamptz
  buffer_before_mins: number;
  buffer_after_mins: number;
  effective_start_at: string;
  effective_end_at: string;
  capacity: number;
  booked_count: number;
  status: SlotStatus;
  label?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PhotographyService {
  id: string;
  slug: string;
  name: string;
  category: string;
  tagline?: string | null;
  short_description: string;
  full_description?: string | null;
  base_duration_mins: number;
  allowed_durations: number[];
  buffer_before_mins: number;
  buffer_after_mins: number;
  min_notice_hours: number;
  max_advance_days: number;
  cancellation_cutoff_hours: number;
  reschedule_cutoff_hours: number;
  default_location_type: string;
  resource_pool: string;
  max_concurrent_bookings: number;
  image_url?: string | null;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface PhotographyPackage {
  id: string;
  event_id?: string | null;
  service_id?: string | null;
  name: string;
  subtitle?: string | null;
  description: string;
  instructions?: string | null;
  duration_mins: number;
  price_label: string;
  price_numeric?: number;
  currency?: string;
  deliverables: string[];
  inclusions?: string[];
  restrictions?: string | null;
  frame_printing_enabled?: boolean;
  max_people?: number | null;
  is_featured: boolean;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface AvailabilityRule {
  id: string;
  resource_pool: string;
  day_of_week: number; // 0 (Sunday) .. 6 (Saturday)
  is_open: boolean;
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  slot_interval_mins: number;
  capacity_per_slot: number;
  updated_at?: string;
}

export interface AvailabilityBlock {
  id: string;
  title: string;
  reason?: string | null;
  resource_pool: string;
  event_id?: string | null;
  service_id?: string | null;
  start_at: string;
  end_at: string;
  is_all_day: boolean;
  created_by?: string | null;
  created_at?: string;
}

export type BookingType = 'convocation' | 'special' | 'traditional';

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'rescheduled'
  | 'cancelled'
  | 'completed';

export type CalendarSyncStatus =
  | 'pending'
  | 'synced'
  | 'failed'
  | 'disabled'
  | 'not_configured'
  | 'cancelled';

export type EmailSendStatus =
  | 'pending'
  | 'sent'
  | 'failed'
  | 'disabled'
  | 'not_configured';

export interface Booking {
  id: string;
  booking_ref: string;
  idempotency_key?: string | null;
  user_id?: string | null;
  booking_type: BookingType;
  event_id?: string | null;
  session_id?: string | null;
  slot_id?: string | null;
  service_id?: string | null;
  package_id?: string | null;
  package_name?: string | null;
  package_price_label?: string | null;
  service_or_event_title: string;
  event_slug_snapshot?: string | null;
  event_category_snapshot?: string | null;
  resource_pool: string;
  timezone: string;
  booking_date: string; // YYYY-MM-DD
  start_at: string; // ISO timestamptz
  end_at: string; // ISO timestamptz
  buffer_before_mins: number;
  buffer_after_mins: number;
  effective_start_at: string;
  effective_end_at: string;
  duration_mins: number;
  client_name: string;
  client_email: string;
  client_phone: string;
  company_or_institution?: string | null;
  student_id?: string | null;
  degree_or_department?: string | null;
  guests_count: number;
  location: string;
  client_notes?: string | null;
  custom_fields?: Record<string, string | string[]>;
  status: BookingStatus;
  cancellation_reason?: string | null;
  cancelled_at?: string | null;
  cancelled_by?: 'client' | 'admin' | null;
  rescheduled_count: number;
  last_rescheduled_at?: string | null;
  cancellation_cutoff_hours: number;
  reschedule_cutoff_hours: number;
  package_base_price?: number;
  frame_printing_selected?: boolean;
  frame_type_id?: string | null;
  frame_type_name?: string | null;
  frame_quantity?: number;
  frame_unit_price?: number;
  frame_total_price?: number;
  total_price?: number;
  pricing_snapshot?: BookingPricingSnapshot;
  calendar_sync_status: CalendarSyncStatus;
  google_calendar_event_id?: string | null;
  google_calendar_id?: string | null;
  calendar_sync_error?: string | null;
  calendar_last_synced_at?: string | null;
  email_send_status: EmailSendStatus;
  email_last_sent_at?: string | null;
  email_send_error?: string | null;
  workflow_stage_id?: string | null;
  workflow_stage?: WorkflowStage | null;
  delivery_url?: string | null;
  delivery_status?: 'pending' | 'delivered' | 'expired' | null;
  delivery_validity_days?: number | null;
  delivery_expires_at?: string | null;
  delivery_sent_at?: string | null;
  delivery_message?: string | null;
  created_at: string;
  updated_at: string;
  // Admin-only joined field (never populated for client queries)
  internal_notes?: string;
}

export interface WorkflowStage {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  client_facing_description?: string | null;
  sort_order: number;
  is_active: boolean;
  is_final_delivery: boolean;
  is_visible_to_client: boolean;
  color?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface BookingStatusHistory {
  id: string;
  booking_id: string;
  previous_status?: string | null;
  new_status: string;
  action: string;
  previous_start_at?: string | null;
  new_start_at?: string | null;
  actor_id?: string | null;
  actor_role: string;
  reason?: string | null;
  created_at: string;
}

export type NotificationType =
  | 'booking_confirmed'
  | 'booking_rescheduled'
  | 'booking_cancelled'
  | 'booking_updated'
  | 'schedule_changed'
  | 'delivery_ready';

export interface EmailNotification {
  id: string;
  booking_id: string;
  notification_type: NotificationType;
  idempotency_key: string;
  recipient_email: string;
  recipient_name: string;
  subject: string;
  body_html: string;
  body_text: string;
  status: 'pending' | 'sent' | 'failed';
  provider_message_id?: string | null;
  attempt_count: number;
  error_message?: string | null;
  sent_at?: string | null;
  last_attempted_at?: string | null;
  created_at: string;
}

export interface CalendarSyncLog {
  id: string;
  booking_id: string;
  operation: 'create' | 'update' | 'cancel';
  idempotency_key: string;
  calendar_id: string;
  google_event_id?: string | null;
  status: 'pending' | 'synced' | 'failed';
  attempt_count: number;
  error_message?: string | null;
  synced_at?: string | null;
  last_attempted_at?: string | null;
  created_at: string;
}

export interface EmailTemplate {
  id: NotificationType;
  name: string;
  subject_template: string;
  heading: string;
  intro_text: string;
  instructions_text: string;
  footer_text: string;
  include_policy_summary: boolean;
  is_active: boolean;
  updated_at?: string;
}

export interface GoogleIntegrationStatus {
  oauth_configured_in_env: boolean;
  connected: boolean;
  connected_email?: string | null;
  calendar_id: string;
  calendar_sync_enabled: boolean;
  gmail_send_enabled: boolean;
  token_expiry?: string | null;
  last_error?: string | null;
  updated_at?: string | null;
}

export interface ComputedTimeSlot {
  slot_id?: string;
  session_id?: string | null;
  session_title?: string | null;
  date: string; // YYYY-MM-DD in Asia/Dhaka
  start_at: string; // ISO timestamptz
  end_at: string; // ISO timestamptz
  start_time_label: string; // e.g., "10:00 AM"
  end_time_label: string; // e.g., "10:30 AM"
  duration_mins: number;
  buffer_before_mins: number;
  buffer_after_mins: number;
  capacity: number;
  booked_count: number;
  remaining_capacity: number;
  state: 'available' | 'full' | 'unavailable';
  unavailable_reason?: string;
}

export interface DayAvailabilitySummary {
  date: string; // YYYY-MM-DD
  status: 'available' | 'full' | 'unavailable';
  available_slots_count: number;
  total_slots_count: number;
  reason?: string;
}

// =============================================================================
// WEBSITE CMS & HERO SLIDER TYPES
// =============================================================================

export interface HeroSlide {
  id: string;
  title: string;
  subtitle?: string | null;
  eyebrow?: string | null;
  cta_label?: string | null;
  cta_href?: string | null;
  image_url: string;
  storage_path?: string | null;
  alt_text?: string | null;
  focal_point?: string;
  text_align?: 'left' | 'center' | 'right';
  sort_order: number;
  is_published: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Testimonial {
  id: string;
  quote: string;
  author: string;
  role_or_title?: string | null;
  organization?: string | null;
  project_tag?: string | null;
  avatar_url?: string | null;
  sort_order: number;
  is_published: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface HomepageConfig {
  hero_autoplay: boolean;
  hero_interval_sec: number;
  show_ticker: boolean;
  show_flagship: boolean;
  show_testimonials: boolean;
  show_services: boolean;
  show_print_bridge: boolean;
  show_quote_builder: boolean;
  show_closing_cta: boolean;
  flagship_heading: string;
  flagship_subheading: string;
  services_heading: string;
  services_subheading: string;
  closing_cta_heading: string;
  closing_cta_subheading: string;
  closing_cta_button_label: string;
  closing_cta_button_href: string;
  closing_cta_image_url: string;
  ticker_items: string[];
}

// =============================================================================
// WORK ARCHIVE, SUPABASE MEDIA FOLDERS & EVENT HIGHLIGHTS
// =============================================================================

export type MediaFolderType = 'event-archive' | 'event-highlight';

export interface MediaFolder {
  id: string;
  name: string;
  slug: string;
  folder_type: MediaFolderType;
  storage_prefix: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MediaFolderWithMeta extends MediaFolder {
  photo_count: number;
  assigned_events_count: number;
  assigned_highlights_count: number;
  storage_status?: 'available' | 'empty' | 'missing';
}

export interface MediaFolderPhoto {
  id: string;
  folder_id: string;
  storage_path: string;
  public_url: string;
  file_name: string;
  size_bytes: number;
  mime_type: string;
  width?: number | null;
  height?: number | null;
  aspect_ratio: 'portrait' | 'landscape' | 'square';
  focal_point: string;
  caption?: string | null;
  alt_text?: string | null;
  sort_order: number;
  is_cover: boolean;
  created_at: string;
}

export interface EventHeroSlide {
  id: string;
  image_url: string;
  storage_path?: string | null;
  caption?: string | null;
  alt_text?: string | null;
  focal_point?: string; // "center" | "top" | "bottom" | "50% 30%"
  sort_order: number;
  is_cover?: boolean;
}

export interface EventArchive {
  id: string;
  title: string;
  slug: string;
  event_date: string;
  short_description: string;
  full_description?: string | null;
  cover_image_url?: string | null;
  cover_storage_path?: string | null;
  cover_alt_text?: string | null;
  folder_id?: string | null;
  category: string;
  location?: string | null;
  client_or_institution?: string | null;
  sort_order: number;
  is_published: boolean;
  is_featured: boolean;
  hero_slides?: EventHeroSlide[] | null;
  created_at: string;
  updated_at: string;
  folder?: MediaFolder | null;
  photos?: MediaFolderPhoto[];
  highlights?: EventHighlight[];
}

export interface EventHighlight {
  id: string;
  event_id: string;
  title: string;
  slug: string;
  short_description: string;
  cover_image_url: string;
  cover_storage_path?: string | null;
  folder_id?: string | null;
  sort_order: number;
  is_published: boolean;
  hero_slides?: EventHeroSlide[] | null;
  created_at: string;
  updated_at: string;
  folder?: MediaFolder | null;
  photos?: MediaFolderPhoto[];
}

