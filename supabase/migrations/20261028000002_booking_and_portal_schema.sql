-- ==============================================================================
-- MIGRATION 02: PHOTOGRAPHY BOOKING SYSTEM, CLIENT PORTAL, CMS & INTEGRATIONS
-- ==============================================================================

-- 1. Client Profiles & Role Authorization
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  phone text not null default '',
  company_or_institution text,
  student_id text,
  role text not null default 'client' check (role in ('client', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_profiles_role on public.profiles(role);

-- Trusted server-side helper to check if the current authenticated user is an admin
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

-- Trigger to automatically create a client profile when a user registers via Supabase Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, student_id, company_or_institution, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    nullif(coalesce(new.raw_user_meta_data->>'student_id', ''), ''),
    nullif(coalesce(new.raw_user_meta_data->>'company_or_institution', ''), ''),
    'client' -- Never allow client signup metadata to self-assign admin role
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = case when public.profiles.full_name = '' then excluded.full_name else public.profiles.full_name end,
    phone = case when public.profiles.phone = '' then excluded.phone else public.profiles.phone end,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trigger to prevent privilege escalation on profiles.role by non-admin users
create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    -- Allow change only if executed by service_role/postgres (auth.uid() is null) or an existing admin
    if auth.uid() is not null and not public.is_admin() then
      raise exception 'UNAUTHORIZED_ROLE_CHANGE: Users cannot modify their own authorization role.';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_prevent_role_self_escalation on public.profiles;
create trigger trg_prevent_role_self_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_self_escalation();

-- 2. Configurable Booking Events (IUB 27th Convocation & Special Events)
create table if not exists public.booking_events (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  title text not null,
  subtitle text,
  description text not null,
  venue text,
  hero_image_url text,
  status text not null default 'draft' check (status in ('draft', 'published', 'paused', 'closed', 'archived')),
  booking_opens_at timestamptz,
  booking_closes_at timestamptz,
  default_slot_duration_mins integer not null default 30 check (default_slot_duration_mins > 0),
  buffer_before_mins integer not null default 0 check (buffer_before_mins >= 0),
  buffer_after_mins integer not null default 10 check (buffer_after_mins >= 0),
  default_slot_capacity integer not null default 1 check (default_slot_capacity > 0),
  cancellation_cutoff_hours integer not null default 48 check (cancellation_cutoff_hours >= 0),
  reschedule_cutoff_hours integer not null default 24 check (reschedule_cutoff_hours >= 0),
  cancellation_policy text not null default 'Bookings may be rescheduled up to 24 hours and cancelled up to 48 hours prior to the scheduled session time.',
  instructions text,
  resource_pool text not null default 'primary_studio',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (booking_closes_at is null or booking_opens_at is null or booking_closes_at > booking_opens_at)
);

create index if not exists idx_booking_events_slug on public.booking_events(slug);
create index if not exists idx_booking_events_status on public.booking_events(status);

-- 3. Event Dates & Sessions (Multiple Dates & Sessions per Event)
create table if not exists public.event_sessions (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.booking_events(id) on delete cascade,
  session_date date not null,
  title text not null,
  start_time time not null,
  end_time time not null,
  slot_duration_mins integer not null default 30 check (slot_duration_mins > 0),
  buffer_before_mins integer not null default 0 check (buffer_before_mins >= 0),
  buffer_after_mins integer not null default 10 check (buffer_after_mins >= 0),
  capacity_per_slot integer not null default 1 check (capacity_per_slot > 0),
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);

create index if not exists idx_event_sessions_event_date on public.event_sessions(event_id, session_date);

-- 4. Event Bookable Time Slots
create table if not exists public.event_time_slots (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.booking_events(id) on delete cascade,
  session_id uuid references public.event_sessions(id) on delete cascade,
  slot_date date not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  buffer_before_mins integer not null default 0 check (buffer_before_mins >= 0),
  buffer_after_mins integer not null default 10 check (buffer_after_mins >= 0),
  effective_start_at timestamptz not null,
  effective_end_at timestamptz not null,
  capacity integer not null default 1 check (capacity > 0),
  booked_count integer not null default 0 check (booked_count >= 0 and booked_count <= capacity),
  status text not null default 'available' check (status in ('available', 'blocked', 'closed')),
  label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at),
  check (effective_end_at >= end_at and effective_start_at <= start_at),
  unique (event_id, start_at, end_at)
);

create index if not exists idx_event_time_slots_event_date on public.event_time_slots(event_id, slot_date);
create index if not exists idx_event_time_slots_range on public.event_time_slots(start_at, end_at);

-- 5. Traditional Photography Services
create table if not exists public.photography_services (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name text not null,
  category text not null default 'portrait',
  tagline text,
  short_description text not null,
  full_description text,
  base_duration_mins integer not null default 60 check (base_duration_mins > 0),
  allowed_durations integer[] not null default array[60, 120, 240],
  buffer_before_mins integer not null default 15 check (buffer_before_mins >= 0),
  buffer_after_mins integer not null default 15 check (buffer_after_mins >= 0),
  min_notice_hours integer not null default 24 check (min_notice_hours >= 0),
  max_advance_days integer not null default 90 check (max_advance_days > 0),
  cancellation_cutoff_hours integer not null default 24 check (cancellation_cutoff_hours >= 0),
  reschedule_cutoff_hours integer not null default 24 check (reschedule_cutoff_hours >= 0),
  default_location_type text not null default 'studio_or_on_location',
  resource_pool text not null default 'primary_studio',
  max_concurrent_bookings integer not null default 1 check (max_concurrent_bookings > 0),
  image_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_photography_services_active on public.photography_services(is_active, sort_order);

-- 6. Photography Packages (Linked to either a Booking Event or a Traditional Service)
create table if not exists public.photography_packages (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references public.booking_events(id) on delete cascade,
  service_id uuid references public.photography_services(id) on delete cascade,
  name text not null,
  subtitle text,
  description text not null,
  duration_mins integer not null default 30 check (duration_mins > 0),
  price_label text not null default 'Bespoke Consultation',
  deliverables text[] not null default array[]::text[],
  max_people integer,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (event_id is not null or service_id is not null)
);

create index if not exists idx_photography_packages_event on public.photography_packages(event_id);
create index if not exists idx_photography_packages_service on public.photography_packages(service_id);

-- 7. Weekly Operating Hours / Availability Rules (Asia/Dhaka)
create table if not exists public.availability_rules (
  id uuid primary key default uuid_generate_v4(),
  resource_pool text not null default 'primary_studio',
  day_of_week integer not null check (day_of_week between 0 and 6),
  is_open boolean not null default true,
  start_time time not null default '09:00',
  end_time time not null default '19:00',
  slot_interval_mins integer not null default 60 check (slot_interval_mins >= 15),
  capacity_per_slot integer not null default 1 check (capacity_per_slot > 0),
  updated_at timestamptz not null default now(),
  check (end_time > start_time),
  unique (resource_pool, day_of_week)
);

-- 8. Blackout Periods & Manual Time Blocks
create table if not exists public.availability_blocks (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  reason text,
  resource_pool text not null default 'primary_studio',
  event_id uuid references public.booking_events(id) on delete cascade,
  service_id uuid references public.photography_services(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  is_all_day boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (end_at > start_at)
);

create index if not exists idx_availability_blocks_range on public.availability_blocks(resource_pool, start_at, end_at);

-- 9. Bookings (Authoritative Reservations)
create table if not exists public.bookings (
  id uuid primary key default uuid_generate_v4(),
  booking_ref text unique not null,
  idempotency_key text unique,
  user_id uuid references auth.users(id) on delete set null,
  booking_type text not null check (booking_type in ('convocation', 'traditional')),
  event_id uuid references public.booking_events(id) on delete restrict,
  session_id uuid references public.event_sessions(id) on delete restrict,
  slot_id uuid references public.event_time_slots(id) on delete restrict,
  service_id uuid references public.photography_services(id) on delete restrict,
  package_id uuid references public.photography_packages(id) on delete set null,
  package_name text,
  package_price_label text,
  service_or_event_title text not null,
  resource_pool text not null default 'primary_studio',
  timezone text not null default 'Asia/Dhaka',
  booking_date date not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  buffer_before_mins integer not null default 0 check (buffer_before_mins >= 0),
  buffer_after_mins integer not null default 10 check (buffer_after_mins >= 0),
  effective_start_at timestamptz not null,
  effective_end_at timestamptz not null,
  duration_mins integer not null check (duration_mins > 0),
  client_name text not null,
  client_email text not null,
  client_phone text not null,
  company_or_institution text,
  student_id text,
  degree_or_department text,
  guests_count integer not null default 1 check (guests_count >= 1),
  location text not null,
  client_notes text,
  status text not null default 'confirmed' check (status in ('pending', 'confirmed', 'rescheduled', 'cancelled', 'completed')),
  cancellation_reason text,
  cancelled_at timestamptz,
  cancelled_by text check (cancelled_by is null or cancelled_by in ('client', 'admin')),
  rescheduled_count integer not null default 0 check (rescheduled_count >= 0),
  last_rescheduled_at timestamptz,
  cancellation_cutoff_hours integer not null default 24 check (cancellation_cutoff_hours >= 0),
  reschedule_cutoff_hours integer not null default 24 check (reschedule_cutoff_hours >= 0),
  calendar_sync_status text not null default 'pending' check (calendar_sync_status in ('pending', 'synced', 'failed', 'disabled', 'not_configured', 'cancelled')),
  google_calendar_event_id text,
  google_calendar_id text,
  calendar_sync_error text,
  calendar_last_synced_at timestamptz,
  email_send_status text not null default 'pending' check (email_send_status in ('pending', 'sent', 'failed', 'disabled', 'not_configured')),
  email_last_sent_at timestamptz,
  email_send_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at),
  check (effective_end_at >= end_at and effective_start_at <= start_at),
  check (
    (booking_type = 'convocation' and event_id is not null and slot_id is not null)
    or
    (booking_type = 'traditional' and service_id is not null)
  )
);

create index if not exists idx_bookings_user_id on public.bookings(user_id);
create index if not exists idx_bookings_client_email on public.bookings(lower(client_email));
create index if not exists idx_bookings_date_status on public.bookings(booking_date, status);
create index if not exists idx_bookings_effective_range on public.bookings(resource_pool, effective_start_at, effective_end_at)
  where status in ('pending', 'confirmed', 'rescheduled');
create index if not exists idx_bookings_slot_id on public.bookings(slot_id)
  where status in ('pending', 'confirmed', 'rescheduled');

-- 10. Private Admin Internal Notes (Isolated table so clients can NEVER read internal notes via RLS)
create table if not exists public.booking_internal_notes (
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  internal_notes text not null default '',
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- 11. Booking Status & Audit History
create table if not exists public.booking_status_history (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  previous_status text,
  new_status text not null,
  action text not null,
  previous_start_at timestamptz,
  new_start_at timestamptz,
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text not null default 'client',
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_booking_status_history_booking on public.booking_status_history(booking_id, created_at desc);

-- 12. Email Notification Records & Retry Tracking
create table if not exists public.email_notifications (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  notification_type text not null check (notification_type in ('booking_confirmed', 'booking_rescheduled', 'booking_cancelled', 'booking_updated', 'schedule_changed')),
  idempotency_key text unique not null,
  recipient_email text not null,
  recipient_name text not null,
  subject text not null,
  body_html text not null,
  body_text text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  provider_message_id text,
  attempt_count integer not null default 0,
  error_message text,
  sent_at timestamptz,
  last_attempted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_email_notifications_booking on public.email_notifications(booking_id, created_at desc);
create index if not exists idx_email_notifications_status on public.email_notifications(status);

-- 13. Google Calendar Synchronization Logs & Retry Tracking
create table if not exists public.calendar_sync_logs (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  operation text not null check (operation in ('create', 'update', 'cancel')),
  idempotency_key text unique not null,
  calendar_id text not null default 'primary',
  google_event_id text,
  status text not null default 'pending' check (status in ('pending', 'synced', 'failed')),
  attempt_count integer not null default 0,
  error_message text,
  synced_at timestamptz,
  last_attempted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_calendar_sync_logs_booking on public.calendar_sync_logs(booking_id, created_at desc);
create index if not exists idx_calendar_sync_logs_status on public.calendar_sync_logs(status);

-- 14. Secure Google OAuth & Integration Configuration (Admin/Server Only)
create table if not exists public.google_oauth_tokens (
  id text primary key default 'default' check (id = 'default'),
  connected_email text,
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expiry timestamptz,
  scopes text[] default array[]::text[],
  calendar_id text not null default 'primary',
  calendar_sync_enabled boolean not null default true,
  gmail_send_enabled boolean not null default true,
  last_error text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- 15. Configurable Email Templates
create table if not exists public.email_templates (
  id text primary key check (id in ('booking_confirmed', 'booking_rescheduled', 'booking_cancelled', 'booking_updated', 'schedule_changed')),
  name text not null,
  subject_template text not null,
  heading text not null,
  intro_text text not null,
  instructions_text text not null default '',
  footer_text text not null,
  include_policy_summary boolean not null default true,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

-- 16. Website CMS Settings (Homepage, About, Contact, Booking Page Content)
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

