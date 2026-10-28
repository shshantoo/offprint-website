-- ==============================================================================
-- MIGRATION 03: ROW LEVEL SECURITY (RLS), ATOMIC BOOKING RPCS & INITIAL CONFIG
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ------------------------------------------------------------------------------
alter table public.portfolio_projects enable row level security;
alter table public.print_products enable row level security;
alter table public.leads enable row level security;
alter table public.profiles enable row level security;
alter table public.booking_events enable row level security;
alter table public.event_sessions enable row level security;
alter table public.event_time_slots enable row level security;
alter table public.photography_services enable row level security;
alter table public.photography_packages enable row level security;
alter table public.availability_rules enable row level security;
alter table public.availability_blocks enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_internal_notes enable row level security;
alter table public.booking_status_history enable row level security;
alter table public.email_notifications enable row level security;
alter table public.calendar_sync_logs enable row level security;
alter table public.google_oauth_tokens enable row level security;
alter table public.email_templates enable row level security;
alter table public.site_settings enable row level security;

-- ------------------------------------------------------------------------------
-- 2. RLS POLICIES
-- ------------------------------------------------------------------------------

-- Portfolio Projects: Public read, Admin write
drop policy if exists "Public can view portfolio projects" on public.portfolio_projects;
create policy "Public can view portfolio projects"
  on public.portfolio_projects for select using (true);

drop policy if exists "Authenticated users can manage portfolio projects" on public.portfolio_projects;
drop policy if exists "Admins can manage portfolio projects" on public.portfolio_projects;
create policy "Admins can manage portfolio projects"
  on public.portfolio_projects for all using (public.is_admin()) with check (public.is_admin());

-- Print Products: Public read, Admin write
drop policy if exists "Public can view print products" on public.print_products;
create policy "Public can view print products"
  on public.print_products for select using (true);

drop policy if exists "Authenticated users can manage print products" on public.print_products;
drop policy if exists "Admins can manage print products" on public.print_products;
create policy "Admins can manage print products"
  on public.print_products for all using (public.is_admin()) with check (public.is_admin());

-- Leads: Public insert, Admin read/write
drop policy if exists "Public can insert leads" on public.leads;
create policy "Public can insert leads"
  on public.leads for insert with check (true);

drop policy if exists "Authenticated users can view and manage leads" on public.leads;
drop policy if exists "Admins can view and manage leads" on public.leads;
create policy "Admins can view and manage leads"
  on public.leads for all using (public.is_admin()) with check (public.is_admin());

-- Profiles: Users read/update own profile (role escalation blocked by trigger), Admins read/manage all
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists "Users can insert own client profile" on public.profiles;
create policy "Users can insert own client profile"
  on public.profiles for insert
  with check (auth.uid() = id and role = 'client');

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id or public.is_admin())
  with check (
    (auth.uid() = id and role = (select p.role from public.profiles p where p.id = auth.uid()))
    or public.is_admin()
  );

-- Booking Events, Sessions, Time Slots, Services, Packages, Availability Rules & Blocks:
-- Public read for calendar/booking display; Admin full CRUD
drop policy if exists "Public can read booking events" on public.booking_events;
create policy "Public can read booking events"
  on public.booking_events for select using (true);

drop policy if exists "Admins manage booking events" on public.booking_events;
create policy "Admins manage booking events"
  on public.booking_events for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public can read event sessions" on public.event_sessions;
create policy "Public can read event sessions"
  on public.event_sessions for select using (true);

drop policy if exists "Admins manage event sessions" on public.event_sessions;
create policy "Admins manage event sessions"
  on public.event_sessions for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public can read event time slots" on public.event_time_slots;
create policy "Public can read event time slots"
  on public.event_time_slots for select using (true);

drop policy if exists "Admins manage event time slots" on public.event_time_slots;
create policy "Admins manage event time slots"
  on public.event_time_slots for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public can read photography services" on public.photography_services;
create policy "Public can read photography services"
  on public.photography_services for select using (true);

drop policy if exists "Admins manage photography services" on public.photography_services;
create policy "Admins manage photography services"
  on public.photography_services for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public can read photography packages" on public.photography_packages;
create policy "Public can read photography packages"
  on public.photography_packages for select using (true);

drop policy if exists "Admins manage photography packages" on public.photography_packages;
create policy "Admins manage photography packages"
  on public.photography_packages for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public can read availability rules" on public.availability_rules;
create policy "Public can read availability rules"
  on public.availability_rules for select using (true);

drop policy if exists "Admins manage availability rules" on public.availability_rules;
create policy "Admins manage availability rules"
  on public.availability_rules for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public can read availability blocks" on public.availability_blocks;
create policy "Public can read availability blocks"
  on public.availability_blocks for select using (true);

drop policy if exists "Admins manage availability blocks" on public.availability_blocks;
create policy "Admins manage availability blocks"
  on public.availability_blocks for all using (public.is_admin()) with check (public.is_admin());

-- Bookings: Clients can ONLY view their own bookings (never another client's booking!); Admins manage all
drop policy if exists "Clients view own bookings and admins view all" on public.bookings;
create policy "Clients view own bookings and admins view all"
  on public.bookings for select
  using (
    (auth.uid() is not null and user_id = auth.uid())
    or public.is_admin()
  );

drop policy if exists "Admins manage all bookings" on public.bookings;
create policy "Admins manage all bookings"
  on public.bookings for all
  using (public.is_admin())
  with check (public.is_admin());

-- Internal Admin Notes: STRICTLY Admin-only (Clients can NEVER view internal notes)
drop policy if exists "Admins only internal notes" on public.booking_internal_notes;
create policy "Admins only internal notes"
  on public.booking_internal_notes for all
  using (public.is_admin())
  with check (public.is_admin());

-- Booking Status History: Clients can view history of their own bookings; Admins view/manage all
drop policy if exists "Clients view own booking history and admins view all" on public.booking_status_history;
create policy "Clients view own booking history and admins view all"
  on public.booking_status_history for select
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_status_history.booking_id
        and b.user_id = auth.uid()
    )
    or public.is_admin()
  );

drop policy if exists "Admins manage booking history" on public.booking_status_history;
create policy "Admins manage booking history"
  on public.booking_status_history for all
  using (public.is_admin())
  with check (public.is_admin());

-- Email Notifications & Calendar Sync Logs: Admin-only + client read own booking notification status
drop policy if exists "Clients view own email status and admins all" on public.email_notifications;
create policy "Clients view own email status and admins all"
  on public.email_notifications for select
  using (
    exists (
      select 1 from public.bookings b
      where b.id = email_notifications.booking_id
        and b.user_id = auth.uid()
    )
    or public.is_admin()
  );

drop policy if exists "Admins manage email notifications" on public.email_notifications;
create policy "Admins manage email notifications"
  on public.email_notifications for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins manage calendar sync logs" on public.calendar_sync_logs;
create policy "Admins manage calendar sync logs"
  on public.calendar_sync_logs for all
  using (public.is_admin())
  with check (public.is_admin());

-- Google OAuth Tokens: STRICTLY Admin-only
drop policy if exists "Admins manage google oauth tokens" on public.google_oauth_tokens;
create policy "Admins manage google oauth tokens"
  on public.google_oauth_tokens for all
  using (public.is_admin())
  with check (public.is_admin());

-- Email Templates & Site Settings: Public read, Admin write
drop policy if exists "Public can read email templates" on public.email_templates;
create policy "Public can read email templates"
  on public.email_templates for select using (true);

drop policy if exists "Admins manage email templates" on public.email_templates;
create policy "Admins manage email templates"
  on public.email_templates for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public can read site settings" on public.site_settings;
create policy "Public can read site settings"
  on public.site_settings for select using (true);

drop policy if exists "Admins manage site settings" on public.site_settings;
create policy "Admins manage site settings"
  on public.site_settings for all using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------------------------
-- 3. PRIVACY-SAFE BUSY INTERVALS RPC (FOR PUBLIC AVAILABILITY CHECKS)
-- Returns only non-PII busy time windows for a resource_pool and date range
-- ------------------------------------------------------------------------------
create or replace function public.get_busy_intervals(
  p_resource_pool text,
  p_range_start timestamptz,
  p_range_end timestamptz,
  p_exclude_booking_id uuid default null
)
returns table (
  booking_id uuid,
  booking_type text,
  slot_id uuid,
  start_at timestamptz,
  end_at timestamptz,
  effective_start_at timestamptz,
  effective_end_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    b.id as booking_id,
    b.booking_type,
    b.slot_id,
    b.start_at,
    b.end_at,
    b.effective_start_at,
    b.effective_end_at
  from public.bookings b
  where b.resource_pool = p_resource_pool
    and b.status in ('pending', 'confirmed', 'rescheduled')
    and b.effective_start_at < p_range_end
    and b.effective_end_at > p_range_start
    and (p_exclude_booking_id is null or b.id <> p_exclude_booking_id);
$$;

grant execute on function public.get_busy_intervals(text, timestamptz, timestamptz, uuid) to anon, authenticated;

-- ------------------------------------------------------------------------------
-- 4. ATOMIC BOOKING CREATION RPC (CONCURRENCY-SAFE WITH ADVISORY & ROW LOCKS)
-- ------------------------------------------------------------------------------
create or replace function public.create_booking_atomic(
  p_idempotency_key text,
  p_user_id uuid,
  p_booking_type text,
  p_event_id uuid,
  p_session_id uuid,
  p_slot_id uuid,
  p_service_id uuid,
  p_package_id uuid,
  p_booking_date date,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_duration_mins integer,
  p_client_name text,
  p_client_email text,
  p_client_phone text,
  p_company_or_institution text,
  p_student_id text,
  p_degree_or_department text,
  p_guests_count integer,
  p_location text,
  p_client_notes text,
  p_actor_role text default 'client'
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.bookings;
  v_event public.booking_events;
  v_slot public.event_time_slots;
  v_service public.photography_services;
  v_package public.photography_packages;
  v_resource_pool text := 'primary_studio';
  v_buffer_before integer := 0;
  v_buffer_after integer := 10;
  v_eff_start timestamptz;
  v_eff_end timestamptz;
  v_cancel_cutoff integer := 24;
  v_resched_cutoff integer := 24;
  v_title text;
  v_pkg_name text := null;
  v_pkg_price text := null;
  v_overlap_count integer := 0;
  v_block_count integer := 0;
  v_max_concurrent integer := 1;
  v_dhaka_dow integer;
  v_dhaka_start_time time;
  v_dhaka_end_time time;
  v_rule public.availability_rules;
  v_booking_ref text;
  v_created public.bookings;
begin
  -- 1. Idempotency check (if same idempotency_key was already processed, return existing booking)
  if p_idempotency_key is not null and btrim(p_idempotency_key) <> '' then
    select * into v_existing
    from public.bookings
    where idempotency_key = p_idempotency_key
    limit 1;
    if found then
      return v_existing;
    end if;
  end if;

  if p_end_at <= p_start_at then
    raise exception 'INVALID_TIME_RANGE: End time must be after start time.';
  end if;

  -- 2. Resolve Event or Service configuration and Resource Pool
  if p_booking_type = 'convocation' then
    if p_event_id is null or p_slot_id is null then
      raise exception 'MISSING_EVENT_SLOT: Convocation booking requires a valid event and time slot.';
    end if;

    select * into v_event
    from public.booking_events
    where id = p_event_id
    for share;

    if not found then
      raise exception 'EVENT_NOT_FOUND: Selected convocation event does not exist.';
    end if;

    if v_event.status <> 'published' and p_actor_role <> 'admin' then
      raise exception 'EVENT_NOT_OPEN: This event is currently % and not accepting public bookings.', v_event.status;
    end if;

    if p_actor_role <> 'admin' then
      if v_event.booking_opens_at is not null and now() < v_event.booking_opens_at then
        raise exception 'BOOKING_NOT_OPEN_YET: Bookings for this event have not opened yet.';
      end if;
      if v_event.booking_closes_at is not null and now() > v_event.booking_closes_at then
        raise exception 'BOOKING_WINDOW_CLOSED: The booking window for this event has closed.';
      end if;
    end if;

    v_resource_pool := coalesce(v_event.resource_pool, 'primary_studio');
    -- Acquire transaction-scoped advisory lock on the resource pool to serialize concurrent bookings
    perform pg_advisory_xact_lock(hashtext('offprint_pool_' || v_resource_pool));

    -- Lock the specific time slot row FOR UPDATE
    select * into v_slot
    from public.event_time_slots
    where id = p_slot_id
      and event_id = p_event_id
    for update;

    if not found then
      raise exception 'SLOT_NOT_FOUND: Selected time slot does not exist for this event.';
    end if;

    if v_slot.status <> 'available' then
      raise exception 'SLOT_UNAVAILABLE: Selected time slot is %. Please select another slot.', v_slot.status;
    end if;

    if v_slot.booked_count >= v_slot.capacity then
      raise exception 'SLOT_CAPACITY_EXHAUSTED: This time slot is fully booked. Please select another slot.';
    end if;

    v_buffer_before := v_slot.buffer_before_mins;
    v_buffer_after := v_slot.buffer_after_mins;
    p_start_at := v_slot.start_at;
    p_end_at := v_slot.end_at;
    v_eff_start := v_slot.effective_start_at;
    v_eff_end := v_slot.effective_end_at;
    p_booking_date := v_slot.slot_date;
    p_session_id := v_slot.session_id;
    p_duration_mins := greatest(1, extract(epoch from (v_slot.end_at - v_slot.start_at))::integer / 60);
    v_cancel_cutoff := v_event.cancellation_cutoff_hours;
    v_resched_cutoff := v_event.reschedule_cutoff_hours;
    v_title := v_event.title;

    -- Check blackout blocks overlapping this slot
    select count(*) into v_block_count
    from public.availability_blocks ab
    where (ab.resource_pool = v_resource_pool or ab.event_id = p_event_id)
      and ab.start_at < v_eff_end
      and ab.end_at > v_eff_start;

    if v_block_count > 0 then
      raise exception 'SLOT_BLOCKED: Selected time slot falls within a blocked or blackout period.';
    end if;

    -- Check conflicting active TRADITIONAL bookings on the same resource pool
    select count(*) into v_overlap_count
    from public.bookings b
    where b.resource_pool = v_resource_pool
      and b.booking_type = 'traditional'
      and b.status in ('pending', 'confirmed', 'rescheduled')
      and b.effective_start_at < v_eff_end
      and b.effective_end_at > v_eff_start;

    if v_overlap_count > 0 then
      raise exception 'RESOURCE_CONFLICT: Another photography session is already scheduled during this time window.';
    end if;

    -- Increment slot booked_count atomically
    update public.event_time_slots
    set booked_count = booked_count + 1,
        updated_at = now()
    where id = v_slot.id;

  elsif p_booking_type = 'traditional' then
    if p_service_id is null then
      raise exception 'MISSING_SERVICE: Traditional booking requires a valid photography service.';
    end if;

    select * into v_service
    from public.photography_services
    where id = p_service_id
    for share;

    if not found then
      raise exception 'SERVICE_NOT_FOUND: Selected photography service does not exist.';
    end if;

    if not v_service.is_active and p_actor_role <> 'admin' then
      raise exception 'SERVICE_INACTIVE: Selected photography service is currently unavailable.';
    end if;

    v_resource_pool := coalesce(v_service.resource_pool, 'primary_studio');
    -- Acquire transaction-scoped advisory lock on the resource pool
    perform pg_advisory_xact_lock(hashtext('offprint_pool_' || v_resource_pool));

    v_buffer_before := v_service.buffer_before_mins;
    v_buffer_after := v_service.buffer_after_mins;
    v_eff_start := p_start_at - make_interval(mins => v_buffer_before);
    v_eff_end := p_end_at + make_interval(mins => v_buffer_after);
    v_cancel_cutoff := v_service.cancellation_cutoff_hours;
    v_resched_cutoff := v_service.reschedule_cutoff_hours;
    v_max_concurrent := v_service.max_concurrent_bookings;
    v_title := v_service.name;

    -- Enforce notice & advance window for public bookings
    if p_actor_role <> 'admin' then
      if p_start_at < (now() + make_interval(hours => v_service.min_notice_hours)) then
        raise exception 'INSUFFICIENT_NOTICE: Bookings for this service require at least % hours advance notice.', v_service.min_notice_hours;
      end if;
      if p_start_at > (now() + make_interval(days => v_service.max_advance_days)) then
        raise exception 'TOO_FAR_IN_ADVANCE: Bookings cannot be scheduled more than % days in advance.', v_service.max_advance_days;
      end if;
    end if;

    -- Check weekly operating hours in Asia/Dhaka
    v_dhaka_dow := extract(dow from (p_start_at at time zone 'Asia/Dhaka'))::integer;
    v_dhaka_start_time := (p_start_at at time zone 'Asia/Dhaka')::time;
    v_dhaka_end_time := (p_end_at at time zone 'Asia/Dhaka')::time;

    select * into v_rule
    from public.availability_rules
    where resource_pool = v_resource_pool
      and day_of_week = v_dhaka_dow;

    if found and p_actor_role <> 'admin' then
      if not v_rule.is_open then
        raise exception 'CLOSED_DAY: Studio is closed on the selected day of the week.';
      end if;
      if v_dhaka_start_time < v_rule.start_time or v_dhaka_end_time > v_rule.end_time then
        raise exception 'OUTSIDE_OPERATING_HOURS: Requested time falls outside operating hours (% to % BST).', v_rule.start_time, v_rule.end_time;
      end if;
    end if;

    -- Check blackout blocks overlapping [v_eff_start, v_eff_end]
    select count(*) into v_block_count
    from public.availability_blocks ab
    where (ab.resource_pool = v_resource_pool or ab.service_id = p_service_id)
      and ab.start_at < v_eff_end
      and ab.end_at > v_eff_start;

    if v_block_count > 0 then
      raise exception 'TIME_BLOCKED: Requested time overlaps with a blocked date or blackout period.';
    end if;

    -- Check overlapping active bookings across BOTH convocation and traditional on the same resource pool
    select count(*) into v_overlap_count
    from public.bookings b
    where b.resource_pool = v_resource_pool
      and b.status in ('pending', 'confirmed', 'rescheduled')
      and b.effective_start_at < v_eff_end
      and b.effective_end_at > v_eff_start;

    if v_overlap_count >= v_max_concurrent then
      raise exception 'SLOT_UNAVAILABLE: This time slot is no longer available due to an existing reservation.';
    end if;

    -- Also ensure no convocation booking overlaps even if v_max_concurrent > 1
    if exists (
      select 1 from public.bookings b
      where b.resource_pool = v_resource_pool
        and b.booking_type = 'convocation'
        and b.status in ('pending', 'confirmed', 'rescheduled')
        and b.effective_start_at < v_eff_end
        and b.effective_end_at > v_eff_start
    ) then
      raise exception 'CONVOCATION_CONFLICT: This time window conflicts with a scheduled convocation photography session.';
    end if;
  else
    raise exception 'INVALID_BOOKING_TYPE: Must be convocation or traditional.';
  end if;

  -- 3. Resolve optional package metadata
  if p_package_id is not null then
    select * into v_package
    from public.photography_packages
    where id = p_package_id;
    if found then
      v_pkg_name := v_package.name;
      v_pkg_price := v_package.price_label;
    end if;
  end if;

  -- 4. Generate unique human-readable booking reference
  v_booking_ref := 'OFP-' || to_char(p_start_at at time zone 'Asia/Dhaka', 'YYYY') || '-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));

  -- 5. Insert booking record
  insert into public.bookings (
    booking_ref,
    idempotency_key,
    user_id,
    booking_type,
    event_id,
    session_id,
    slot_id,
    service_id,
    package_id,
    package_name,
    package_price_label,
    service_or_event_title,
    resource_pool,
    timezone,
    booking_date,
    start_at,
    end_at,
    buffer_before_mins,
    buffer_after_mins,
    effective_start_at,
    effective_end_at,
    duration_mins,
    client_name,
    client_email,
    client_phone,
    company_or_institution,
    student_id,
    degree_or_department,
    guests_count,
    location,
    client_notes,
    status,
    cancellation_cutoff_hours,
    reschedule_cutoff_hours,
    calendar_sync_status,
    email_send_status
  )
  values (
    v_booking_ref,
    nullif(btrim(coalesce(p_idempotency_key, '')), ''),
    p_user_id,
    p_booking_type,
    p_event_id,
    p_session_id,
    p_slot_id,
    p_service_id,
    p_package_id,
    v_pkg_name,
    v_pkg_price,
    v_title,
    v_resource_pool,
    'Asia/Dhaka',
    p_booking_date,
    p_start_at,
    p_end_at,
    v_buffer_before,
    v_buffer_after,
    v_eff_start,
    v_eff_end,
    p_duration_mins,
    btrim(p_client_name),
    lower(btrim(p_client_email)),
    btrim(p_client_phone),
    nullif(btrim(coalesce(p_company_or_institution, '')), ''),
    nullif(btrim(coalesce(p_student_id, '')), ''),
    nullif(btrim(coalesce(p_degree_or_department, '')), ''),
    coalesce(p_guests_count, 1),
    btrim(p_location),
    nullif(btrim(coalesce(p_client_notes, '')), ''),
    'confirmed',
    v_cancel_cutoff,
    v_resched_cutoff,
    'pending',
    'pending'
  )
  returning * into v_created;

  -- 6. Record audit history
  insert into public.booking_status_history (
    booking_id,
    previous_status,
    new_status,
    action,
    previous_start_at,
    new_start_at,
    actor_id,
    actor_role,
    reason
  )
  values (
    v_created.id,
    null,
    'confirmed',
    'created',
    null,
    v_created.start_at,
    p_user_id,
    coalesce(p_actor_role, 'client'),
    'Initial reservation confirmed'
  );

  return v_created;
end;
$$;

grant execute on function public.create_booking_atomic(
  text, uuid, text, uuid, uuid, uuid, uuid, uuid, date, timestamptz, timestamptz, integer,
  text, text, text, text, text, text, integer, text, text, text
) to anon, authenticated;

-- ------------------------------------------------------------------------------
-- 5. ATOMIC RESCHEDULE BOOKING RPC (ALL-OR-NOTHING TRANSACTION)
-- Never leaves client with 0 or 2 reservations if any check fails
-- ------------------------------------------------------------------------------
create or replace function public.reschedule_booking_atomic(
  p_booking_id uuid,
  p_actor_id uuid,
  p_actor_role text,
  p_new_slot_id uuid,
  p_new_date date,
  p_new_start_at timestamptz,
  p_new_end_at timestamptz,
  p_reason text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings;
  v_new_slot public.event_time_slots;
  v_service public.photography_services;
  v_eff_start timestamptz;
  v_eff_end timestamptz;
  v_buffer_before integer;
  v_buffer_after integer;
  v_new_session_id uuid := null;
  v_new_duration integer;
  v_overlap_count integer := 0;
  v_block_count integer := 0;
  v_max_concurrent integer := 1;
  v_updated public.bookings;
begin
  -- 1. Lock the existing booking row
  select * into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'BOOKING_NOT_FOUND: Reservation does not exist.';
  end if;

  -- 2. Verify ownership or admin privileges
  if p_actor_role <> 'admin' then
    if p_actor_id is null or v_booking.user_id is distinct from p_actor_id then
      raise exception 'FORBIDDEN: You do not have permission to reschedule this booking.';
    end if;
  end if;

  if v_booking.status in ('cancelled', 'completed') then
    raise exception 'INVALID_STATUS: Cannot reschedule a % booking.', v_booking.status;
  end if;

  -- 3. Enforce rescheduling deadline for clients
  if p_actor_role <> 'admin' then
    if v_booking.start_at < (now() + make_interval(hours => v_booking.reschedule_cutoff_hours)) then
      raise exception 'RESCHEDULE_DEADLINE_PASSED: Bookings must be rescheduled at least % hours before the scheduled start time.', v_booking.reschedule_cutoff_hours;
    end if;
  end if;

  -- Acquire transaction-level advisory lock on the resource pool
  perform pg_advisory_xact_lock(hashtext('offprint_pool_' || v_booking.resource_pool));

  -- 4. Validate and reserve the new slot / time window
  if v_booking.booking_type = 'convocation' then
    if p_new_slot_id is null then
      raise exception 'MISSING_NEW_SLOT: Please select a new convocation time slot.';
    end if;

    if p_new_slot_id = v_booking.slot_id then
      raise exception 'SAME_SLOT: Please select a different time slot to reschedule.';
    end if;

    select * into v_new_slot
    from public.event_time_slots
    where id = p_new_slot_id
      and event_id = v_booking.event_id
    for update;

    if not found then
      raise exception 'SLOT_NOT_FOUND: Target convocation slot does not exist.';
    end if;

    if v_new_slot.status <> 'available' then
      raise exception 'SLOT_UNAVAILABLE: Target time slot is not available.';
    end if;

    if v_new_slot.booked_count >= v_new_slot.capacity then
      raise exception 'SLOT_CAPACITY_EXHAUSTED: Target time slot is already full.';
    end if;

    v_buffer_before := v_new_slot.buffer_before_mins;
    v_buffer_after := v_new_slot.buffer_after_mins;
    p_new_start_at := v_new_slot.start_at;
    p_new_end_at := v_new_slot.end_at;
    v_eff_start := v_new_slot.effective_start_at;
    v_eff_end := v_new_slot.effective_end_at;
    p_new_date := v_new_slot.slot_date;
    v_new_session_id := v_new_slot.session_id;
    v_new_duration := greatest(1, extract(epoch from (v_new_slot.end_at - v_new_slot.start_at))::integer / 60);

    -- Check blackout blocks
    select count(*) into v_block_count
    from public.availability_blocks ab
    where (ab.resource_pool = v_booking.resource_pool or ab.event_id = v_booking.event_id)
      and ab.start_at < v_eff_end
      and ab.end_at > v_eff_start;

    if v_block_count > 0 then
      raise exception 'SLOT_BLOCKED: Target time slot falls within a blocked period.';
    end if;

    -- Check cross-type traditional conflicts (excluding current booking)
    select count(*) into v_overlap_count
    from public.bookings b
    where b.resource_pool = v_booking.resource_pool
      and b.id <> v_booking.id
      and b.booking_type = 'traditional'
      and b.status in ('pending', 'confirmed', 'rescheduled')
      and b.effective_start_at < v_eff_end
      and b.effective_end_at > v_eff_start;

    if v_overlap_count > 0 then
      raise exception 'RESOURCE_CONFLICT: Another photography session conflicts with the selected slot.';
    end if;

    -- Reserve new slot and release old slot atomically
    update public.event_time_slots
    set booked_count = booked_count + 1,
        updated_at = now()
    where id = v_new_slot.id;

    if v_booking.slot_id is not null then
      update public.event_time_slots
      set booked_count = greatest(0, booked_count - 1),
          updated_at = now()
      where id = v_booking.slot_id;
    end if;

  else
    -- Traditional booking reschedule
    if p_new_end_at <= p_new_start_at then
      raise exception 'INVALID_TIME_RANGE: New end time must be after start time.';
    end if;

    select * into v_service
    from public.photography_services
    where id = v_booking.service_id;

    v_buffer_before := coalesce(v_service.buffer_before_mins, v_booking.buffer_before_mins);
    v_buffer_after := coalesce(v_service.buffer_after_mins, v_booking.buffer_after_mins);
    v_max_concurrent := coalesce(v_service.max_concurrent_bookings, 1);
    v_eff_start := p_new_start_at - make_interval(mins => v_buffer_before);
    v_eff_end := p_new_end_at + make_interval(mins => v_buffer_after);
    v_new_duration := greatest(1, extract(epoch from (p_new_end_at - p_new_start_at))::integer / 60);

    -- Check blackout blocks
    select count(*) into v_block_count
    from public.availability_blocks ab
    where (ab.resource_pool = v_booking.resource_pool or ab.service_id = v_booking.service_id)
      and ab.start_at < v_eff_end
      and ab.end_at > v_eff_start;

    if v_block_count > 0 then
      raise exception 'TIME_BLOCKED: Target time overlaps with a blackout period.';
    end if;

    -- Check overlapping active bookings (excluding current booking)
    select count(*) into v_overlap_count
    from public.bookings b
    where b.resource_pool = v_booking.resource_pool
      and b.id <> v_booking.id
      and b.status in ('pending', 'confirmed', 'rescheduled')
      and b.effective_start_at < v_eff_end
      and b.effective_end_at > v_eff_start;

    if v_overlap_count >= v_max_concurrent then
      raise exception 'SLOT_UNAVAILABLE: Target time slot is already booked.';
    end if;

    if exists (
      select 1 from public.bookings b
      where b.resource_pool = v_booking.resource_pool
        and b.id <> v_booking.id
        and b.booking_type = 'convocation'
        and b.status in ('pending', 'confirmed', 'rescheduled')
        and b.effective_start_at < v_eff_end
        and b.effective_end_at > v_eff_start
    ) then
      raise exception 'CONVOCATION_CONFLICT: Target time conflicts with a convocation photography session.';
    end if;
  end if;

  -- 5. Update booking record
  update public.bookings
  set
    slot_id = case when v_booking.booking_type = 'convocation' then p_new_slot_id else slot_id end,
    session_id = case when v_booking.booking_type = 'convocation' then v_new_session_id else session_id end,
    booking_date = p_new_date,
    start_at = p_new_start_at,
    end_at = p_new_end_at,
    buffer_before_mins = v_buffer_before,
    buffer_after_mins = v_buffer_after,
    effective_start_at = v_eff_start,
    effective_end_at = v_eff_end,
    duration_mins = v_new_duration,
    status = 'rescheduled',
    rescheduled_count = rescheduled_count + 1,
    last_rescheduled_at = now(),
    calendar_sync_status = 'pending',
    email_send_status = 'pending',
    updated_at = now()
  where id = v_booking.id
  returning * into v_updated;

  -- 6. Log status history
  insert into public.booking_status_history (
    booking_id,
    previous_status,
    new_status,
    action,
    previous_start_at,
    new_start_at,
    actor_id,
    actor_role,
    reason
  )
  values (
    v_booking.id,
    v_booking.status,
    'rescheduled',
    'rescheduled',
    v_booking.start_at,
    p_new_start_at,
    p_actor_id,
    coalesce(p_actor_role, 'client'),
    coalesce(p_reason, 'Booking rescheduled to new time slot')
  );

  return v_updated;
end;
$$;

grant execute on function public.reschedule_booking_atomic(
  uuid, uuid, text, uuid, date, timestamptz, timestamptz, text
) to authenticated;

-- ------------------------------------------------------------------------------
-- 6. ATOMIC CANCEL BOOKING RPC (RELEASES RESERVED CAPACITY SAFELY)
-- ------------------------------------------------------------------------------
create or replace function public.cancel_booking_atomic(
  p_booking_id uuid,
  p_actor_id uuid,
  p_actor_role text,
  p_reason text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings;
  v_updated public.bookings;
begin
  select * into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'BOOKING_NOT_FOUND: Reservation does not exist.';
  end if;

  if p_actor_role <> 'admin' then
    if p_actor_id is null or v_booking.user_id is distinct from p_actor_id then
      raise exception 'FORBIDDEN: You do not have permission to cancel this booking.';
    end if;
  end if;

  if v_booking.status = 'cancelled' then
    return v_booking;
  end if;

  if v_booking.status = 'completed' and p_actor_role <> 'admin' then
    raise exception 'ALREADY_COMPLETED: Completed bookings cannot be cancelled.';
  end if;

  -- Enforce cancellation cutoff window for clients
  if p_actor_role <> 'admin' then
    if v_booking.start_at < (now() + make_interval(hours => v_booking.cancellation_cutoff_hours)) then
      raise exception 'CANCELLATION_DEADLINE_PASSED: Cancellations must be requested at least % hours prior to the session.', v_booking.cancellation_cutoff_hours;
    end if;
  end if;

  -- Release slot capacity if linked to an event time slot
  if v_booking.slot_id is not null then
    update public.event_time_slots
    set booked_count = greatest(0, booked_count - 1),
        updated_at = now()
    where id = v_booking.slot_id;
  end if;

  update public.bookings
  set
    status = 'cancelled',
    cancellation_reason = coalesce(nullif(btrim(p_reason), ''), 'Cancelled by ' || coalesce(p_actor_role, 'client')),
    cancelled_at = now(),
    cancelled_by = case when p_actor_role = 'admin' then 'admin' else 'client' end,
    calendar_sync_status = 'pending',
    email_send_status = 'pending',
    updated_at = now()
  where id = v_booking.id
  returning * into v_updated;

  insert into public.booking_status_history (
    booking_id,
    previous_status,
    new_status,
    action,
    previous_start_at,
    new_start_at,
    actor_id,
    actor_role,
    reason
  )
  values (
    v_booking.id,
    v_booking.status,
    'cancelled',
    'cancelled',
    v_booking.start_at,
    v_booking.start_at,
    p_actor_id,
    coalesce(p_actor_role, 'client'),
    v_updated.cancellation_reason
  );

  return v_updated;
end;
$$;

grant execute on function public.cancel_booking_atomic(uuid, uuid, text, text) to authenticated;

-- ------------------------------------------------------------------------------
-- 7. ADMIN SLOT GENERATOR RPC FOR EVENT SESSIONS
-- Generates bookable time slots for an event_session without overwriting active bookings
-- ------------------------------------------------------------------------------
create or replace function public.generate_event_session_slots(
  p_session_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.event_sessions;
  v_cursor timestamptz;
  v_session_end timestamptz;
  v_slot_end timestamptz;
  v_eff_start timestamptz;
  v_eff_end timestamptz;
  v_inserted_count integer := 0;
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'FORBIDDEN: Only administrators can generate session slots.';
  end if;

  select * into v_session
  from public.event_sessions
  where id = p_session_id;

  if not found then
    raise exception 'SESSION_NOT_FOUND: Event session does not exist.';
  end if;

  -- Interpret session_date + start_time / end_time in Asia/Dhaka timezone
  v_cursor := ((v_session.session_date::text || ' ' || v_session.start_time::text)::timestamp at time zone 'Asia/Dhaka');
  v_session_end := ((v_session.session_date::text || ' ' || v_session.end_time::text)::timestamp at time zone 'Asia/Dhaka');

  while (v_cursor + make_interval(mins => v_session.slot_duration_mins)) <= v_session_end loop
    v_slot_end := v_cursor + make_interval(mins => v_session.slot_duration_mins);
    v_eff_start := v_cursor - make_interval(mins => v_session.buffer_before_mins);
    v_eff_end := v_slot_end + make_interval(mins => v_session.buffer_after_mins);

    insert into public.event_time_slots (
      event_id,
      session_id,
      slot_date,
      start_at,
      end_at,
      buffer_before_mins,
      buffer_after_mins,
      effective_start_at,
      effective_end_at,
      capacity,
      booked_count,
      status,
      label
    )
    values (
      v_session.event_id,
      v_session.id,
      v_session.session_date,
      v_cursor,
      v_slot_end,
      v_session.buffer_before_mins,
      v_session.buffer_after_mins,
      v_eff_start,
      v_eff_end,
      v_session.capacity_per_slot,
      0,
      'available',
      v_session.title
    )
    on conflict (event_id, start_at, end_at) do update
    set
      session_id = excluded.session_id,
      buffer_before_mins = excluded.buffer_before_mins,
      buffer_after_mins = excluded.buffer_after_mins,
      effective_start_at = excluded.effective_start_at,
      effective_end_at = excluded.effective_end_at,
      capacity = greatest(public.event_time_slots.booked_count, excluded.capacity),
      label = excluded.label,
      updated_at = now();

    v_inserted_count := v_inserted_count + 1;
    v_cursor := v_slot_end + make_interval(mins => v_session.buffer_after_mins);
  end loop;

  return v_inserted_count;
end;
$$;

grant execute on function public.generate_event_session_slots(uuid) to authenticated;

-- ------------------------------------------------------------------------------
-- 8. SAFE INITIAL CONFIGURATION SEED DATA
-- Does NOT invent a fake final convocation date or fake confirmed bookings.
-- ------------------------------------------------------------------------------

-- Default Weekly Operating Hours (Sunday - Thursday 09:00-19:00 BST, Saturday 10:00-18:00 BST, Friday Closed)
insert into public.availability_rules (resource_pool, day_of_week, is_open, start_time, end_time, slot_interval_mins, capacity_per_slot)
values
  ('primary_studio', 0, true,  '09:00', '19:00', 60, 1), -- Sunday
  ('primary_studio', 1, true,  '09:00', '19:00', 60, 1), -- Monday
  ('primary_studio', 2, true,  '09:00', '19:00', 60, 1), -- Tuesday
  ('primary_studio', 3, true,  '09:00', '19:00', 60, 1), -- Wednesday
  ('primary_studio', 4, true,  '09:00', '19:00', 60, 1), -- Thursday
  ('primary_studio', 5, false, '10:00', '18:00', 60, 1), -- Friday (Closed by default, configurable)
  ('primary_studio', 6, true,  '10:00', '18:00', 60, 1)  -- Saturday
on conflict (resource_pool, day_of_week) do nothing;

-- IUB 27th Convocation Event (Initialized in 'draft' state so admin can configure official dates/venue before opening)
insert into public.booking_events (
  slug,
  title,
  subtitle,
  description,
  venue,
  hero_image_url,
  status,
  default_slot_duration_mins,
  buffer_before_mins,
  buffer_after_mins,
  default_slot_capacity,
  cancellation_cutoff_hours,
  reschedule_cutoff_hours,
  cancellation_policy,
  instructions,
  resource_pool
)
values (
  'iub-27th-convocation',
  'IUB 27th Convocation Photography',
  'Editorial Academic Portraits, Family Sessions & Commemorative Keepsakes',
  'Celebrate your milestone at Independent University, Bangladesh (IUB) 27th Convocation with OFFPRINT''s editorial portrait team. We provide dedicated individual graduate portraits, family group frames, and archival print editions crafted with studio-grade lighting and signature color grading.',
  'Independent University, Bangladesh (IUB) Campus, Bashundhara R/A, Dhaka (Official Venue & Schedule Configurable by Admin)',
  'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1400&q=80',
  'draft',
  30,
  0,
  10,
  1,
  48,
  24,
  'Convocation sessions may be rescheduled up to 24 hours prior to the reserved slot subject to availability. Cancellations must be submitted at least 48 hours before the scheduled session.',
  'Please arrive 10 minutes prior to your reserved slot in full academic regalia (gown, hood, and mortarboard). Our production coordinator will meet you at the designated OFFPRINT portrait point.',
  'primary_studio'
)
on conflict (slug) do nothing;

-- Default Packages for IUB 27th Convocation
do $$
declare
  v_conv_id uuid;
begin
  select id into v_conv_id from public.booking_events where slug = 'iub-27th-convocation' limit 1;
  if v_conv_id is not null and not exists (select 1 from public.photography_packages where event_id = v_conv_id) then
    insert into public.photography_packages (
      event_id, name, subtitle, description, duration_mins, price_label, deliverables, max_people, is_featured, is_active, sort_order
    )
    values
      (
        v_conv_id,
        'The Graduate Solo Edition',
        'Individual Regalia & Editorial Portrait Session',
        'Dedicated solo session capturing formal academic regalia portraits and campus architectural frames.',
        30,
        'BDT 3,500',
        array[
          '30-minute dedicated portrait session',
          '15 signature color-graded high-resolution digital photographs',
          '3 master-retouched editorial portraits',
          'Online private gallery delivery within 5 business days'
        ],
        1,
        false,
        true,
        1
      ),
      (
        v_conv_id,
        'The Laureate & Family Collection',
        'Graduate Solo + Immediate Family & Friends Portraits',
        'Comprehensive convocation session designed for graduates celebrating alongside parents, family members, and peers.',
        45,
        'BDT 6,000',
        array[
          '45-minute extended portrait & family session',
          '30 signature color-graded high-resolution digital photographs',
          '6 master-retouched editorial & family portraits',
          '1 archival 8x10 matte fine-art commemorative print',
          'Priority 72-hour private gallery delivery'
        ],
        6,
        true,
        true,
        2
      ),
      (
        v_conv_id,
        'The Chancellor''s Archival Suite',
        'Full Documentary Coverage + Optical Acrylic Commemorative Frame',
        'Our flagship convocation commission pairing extended portrait coverage with OFFPRINT''s signature 12mm optical cast acrylic desk frame.',
        60,
        'BDT 9,500',
        array[
          '60-minute premier campus & family portrait session',
          '45+ high-resolution digital photographs',
          '10 master-retouched portraits',
          '1 bespoke 12mm optical clear acrylic award frame with brass standoffs',
          'Express 48-hour gallery turnaround'
        ],
        8,
        false,
        true,
        3
      );
  end if;
end $$;

-- Initial Traditional Photography Services
insert into public.photography_services (
  slug, name, category, tagline, short_description, full_description,
  base_duration_mins, allowed_durations, buffer_before_mins, buffer_after_mins,
  min_notice_hours, max_advance_days, cancellation_cutoff_hours, reschedule_cutoff_hours,
  default_location_type, resource_pool, max_concurrent_bookings, image_url, is_active, sort_order
)
values
  (
    'executive-portraits',
    'Executive Headshots & C-Suite Portraits',
    'headshot',
    'Studio-Grade Portability for Boardrooms & Individuals',
    'Tethered studio portrait sessions at our Dhaka studio or deployed directly at your corporate headquarters.',
    'Engineered for board members, executives, academics, and creative leaders. Includes calibrated lighting setups, live tethered review for immediate frame selection, and natural editorial retouching.',
    60,
    array[60, 120, 180],
    15,
    15,
    24,
    90,
    24,
    24,
    'Dhaka Studio or On-Location Office',
    'primary_studio',
    1,
    'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80',
    true,
    1
  ),
  (
    'corporate-summit-coverage',
    'Corporate Summits, Seminars & Forums',
    'corporate_summit',
    'Multi-Camera 4K Coverage & Same-Day PR Stills',
    'Comprehensive visual documentation for conferences, AGM meetings, diplomatic receptions, and institutional seminars.',
    'We deploy synchronized multi-camera teams, clean board audio capture, keynote stage lighting setups, and rapid same-day press release image suites.',
    180,
    array[120, 180, 240, 480],
    30,
    30,
    48,
    180,
    48,
    48,
    'Client Venue (Dhaka & Nationwide)',
    'primary_studio',
    1,
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
    true,
    2
  ),
  (
    'brand-documentary-production',
    'Brand Documentaries & Editorial Commercials',
    'documentary',
    'Narrative-Driven Visual Architecture for Institutions & Brands',
    'Editorial photography and cinema production for heritage brands, architectural spaces, fine dining, and apparel labels.',
    'From art-directed lookbooks and culinary stories to industrial heritage documentaries, our production team crafts enduring visual assets.',
    180,
    array[120, 180, 240, 360],
    30,
    30,
    48,
    180,
    48,
    48,
    'On-Location / Client Facility',
    'primary_studio',
    1,
    'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80',
    true,
    3
  ),
  (
    'bespoke-wedding-chronicles',
    'Seasonal Bespoke Weddings & Private Affairs',
    'wedding',
    'Editorial Fine-Art Coverage for Intimate & Grand Celebrations',
    'Selective seasonal commissions combining unobtrusive documentary storytelling with editorial portrait direction.',
    'Limited seasonal quota ensuring dedicated senior creative direction, medium-format detail capture, and archival handcrafted print editions.',
    240,
    array[180, 240, 360, 480],
    30,
    30,
    72,
    365,
    72,
    48,
    'Client Venue / Destination',
    'primary_studio',
    1,
    'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
    true,
    4
  )
on conflict (slug) do nothing;

-- Default Packages for Traditional Services
do $$
declare
  v_exec_id uuid;
  v_corp_id uuid;
  v_doc_id uuid;
  v_wed_id uuid;
begin
  select id into v_exec_id from public.photography_services where slug = 'executive-portraits' limit 1;
  if v_exec_id is not null and not exists (select 1 from public.photography_packages where service_id = v_exec_id) then
    insert into public.photography_packages (service_id, name, subtitle, description, duration_mins, price_label, deliverables, is_featured, is_active, sort_order)
    values
      (v_exec_id, 'Individual Executive Session', '1 Hour Studio or Office Session', 'Ideal for individual C-suite profiles, academic portraits, and editorial press kits.', 60, 'BDT 7,500', array['60-minute tethered portrait session', '2 backdrop & lighting configurations', '6 master-retouched high-res portraits', 'All color-graded selects included'], true, true, 1),
      (v_exec_id, 'Leadership Team Half-Day', '3 Hours On-Location Boardroom Deployment', 'Mobile studio setup at your Dhaka office for up to 10 executives.', 180, 'BDT 24,000', array['3-hour mobile studio deployment', 'Consistent lighting & backdrop calibration', '3 retouched portraits per executive', '48-hour expedited corporate delivery'], false, true, 2);
  end if;

  select id into v_corp_id from public.photography_services where slug = 'corporate-summit-coverage' limit 1;
  if v_corp_id is not null and not exists (select 1 from public.photography_packages where service_id = v_corp_id) then
    insert into public.photography_packages (service_id, name, subtitle, description, duration_mins, price_label, deliverables, is_featured, is_active, sort_order)
    values
      (v_corp_id, 'Half-Day Seminar & Keynote Coverage', 'Up to 3 Hours • Dual Photographer & Cinema Unit', 'Focused coverage for corporate press briefings, panel discussions, and executive forums.', 180, 'Bespoke Consultation', array['Senior lead photographer + cinema operator', 'Same-day 15-image PR press suite', 'Full curated high-resolution archive'], true, true, 1),
      (v_corp_id, 'Full-Day Summit Production', 'Up to 8 Hours • Multi-Cam 4K & Instant PR Desk', 'Complete summit documentation with on-site editor for real-time media distribution.', 480, 'Bespoke Consultation', array['Multi-camera 4K keynote recording', 'Dedicated on-site photo editor', '24-hour executive highlight film'], false, true, 2);
  end if;

  select id into v_doc_id from public.photography_services where slug = 'brand-documentary-production' limit 1;
  if v_doc_id is not null and not exists (select 1 from public.photography_packages where service_id = v_doc_id) then
    insert into public.photography_packages (service_id, name, subtitle, description, duration_mins, price_label, deliverables, is_featured, is_active, sort_order)
    values
      (v_doc_id, 'Editorial Campaign & Lookbook Session', '3 Hours Art-Directed Production', 'Tailored for fashion labels, culinary launches, and architectural interiors.', 180, 'Bespoke Consultation', array['Pre-production moodboard & lighting design', 'High-resolution commercial archive', 'Print-ready CMYK & digital color profiles'], true, true, 1);
  end if;

  select id into v_wed_id from public.photography_services where slug = 'bespoke-wedding-chronicles' limit 1;
  if v_wed_id is not null and not exists (select 1 from public.photography_packages where service_id = v_wed_id) then
    insert into public.photography_packages (service_id, name, subtitle, description, duration_mins, price_label, deliverables, is_featured, is_active, sort_order)
    values
      (v_wed_id, 'Signature Single-Event Chronicle', '4 Hours Editorial Portrait & Documentary Coverage', 'Intimate nikah, reception, or private family celebration coverage.', 240, 'Bespoke Consultation', array['Lead editorial photographer + second shooter', 'Cinematic highlight reel option', 'Curated online gallery & fine-art print box'], true, true, 1);
  end if;
end $$;

-- Default Email Templates
insert into public.email_templates (id, name, subject_template, heading, intro_text, instructions_text, footer_text, include_policy_summary, is_active)
values
  (
    'booking_confirmed',
    'Booking Confirmation Email',
    'Booking Confirmed: {{service_title}} ({{booking_ref}}) — OFFPRINT',
    'Your Photography Session is Confirmed',
    'Thank you for reserving your session with OFFPRINT (অফপ্রিন্ট). Your appointment has been registered in our production schedule with the details below.',
    'Please arrive 10 minutes prior to your scheduled start time. If you need to review, reschedule, or manage your reservation, visit your Client Portal using the link below.',
    'OFFPRINT (অফপ্রিন্ট) • Govt. Registered Photography & Bespoke Print Agency • Dhaka, Bangladesh',
    true,
    true
  ),
  (
    'booking_rescheduled',
    'Booking Rescheduled Email',
    'Schedule Updated: {{service_title}} ({{booking_ref}}) — OFFPRINT',
    'Your Session Has Been Rescheduled',
    'Your reservation with OFFPRINT has been moved to a new date and time slot as requested. Please review your updated schedule below.',
    'Your original time slot has been released and your new slot is confirmed.',
    'OFFPRINT (অফপ্রিন্ট) • Govt. Registered Photography & Bespoke Print Agency • Dhaka, Bangladesh',
    true,
    true
  ),
  (
    'booking_cancelled',
    'Booking Cancellation Email',
    'Booking Cancelled: {{service_title}} ({{booking_ref}}) — OFFPRINT',
    'Your Reservation Has Been Cancelled',
    'This email confirms that your photography reservation with OFFPRINT has been cancelled and the time slot has been released.',
    'If you wish to book a new session in the future, you are always welcome to visit our booking portal.',
    'OFFPRINT (অফপ্রিন্ট) • Govt. Registered Photography & Bespoke Print Agency • Dhaka, Bangladesh',
    false,
    true
  ),
  (
    'booking_updated',
    'Booking Updated by Admin Email',
    'Reservation Update: {{service_title}} ({{booking_ref}}) — OFFPRINT',
    'Important Update to Your Reservation',
    'Our production desk has updated the details of your photography reservation. Please review the latest summary below.',
    'You can view the complete details anytime in your Client Portal.',
    'OFFPRINT (অফপ্রিন্ট) • Govt. Registered Photography & Bespoke Print Agency • Dhaka, Bangladesh',
    true,
    true
  ),
  (
    'schedule_changed',
    'Event Schedule Change Notification',
    'Schedule Notice: {{service_title}} ({{booking_ref}}) — OFFPRINT',
    'Event Schedule Notification',
    'Please note an update regarding the schedule or venue details for your upcoming session with OFFPRINT.',
    'Please review the updated timing and location details carefully.',
    'OFFPRINT (অফপ্রিন্ট) • Govt. Registered Photography & Bespoke Print Agency • Dhaka, Bangladesh',
    true,
    true
  )
on conflict (id) do nothing;

-- Default Google Integration Config Row
insert into public.google_oauth_tokens (id, calendar_id, calendar_sync_enabled, gmail_send_enabled)
values ('default', 'primary', true, true)
on conflict (id) do nothing;

-- Default Site Settings for CMS
insert into public.site_settings (key, value)
values
  (
    'general',
    '{
      "agency_name": "OFFPRINT (অফপ্রিন্ট)",
      "tagline": "Editorial Photography, Convocation Portraits & Bespoke Print Craftsmanship",
      "established": "September 2025",
      "registration_badge": "Govt. Registered Agency in Bangladesh",
      "phone": "+880 1700-000000",
      "email": "inquiry@offprint.agency",
      "address": "Gulshan & Banani Corporate Corridor, Dhaka, Bangladesh",
      "operating_hours_label": "Sunday – Thursday (9:00 AM – 7:00 PM BST) • Saturday (10:00 AM – 6:00 PM BST)",
      "instagram_url": "https://instagram.com/offprint.agency",
      "facebook_url": "https://facebook.com/offprint.agency",
      "linkedin_url": "https://linkedin.com/company/offprint-agency"
    }'::jsonb
  ),
  (
    'homepage',
    '{
      "hero_eyebrow": "Govt. Registered Photography & Print Studio • Est. Sep 2025",
      "hero_title": "Enduring Visual Legacies & Bespoke Portrait Commissions.",
      "hero_subtitle": "From IUB 27th Convocation portrait sessions and executive headshots to multi-camera corporate summits and tactile 650 GSM print collateral.",
      "primary_cta_label": "Book a Session",
      "secondary_cta_label": "Explore Works Archive"
    }'::jsonb
  ),
  (
    'booking_page',
    '{
      "heading": "Reserve Your Photography Session",
      "subheading": "Select between our dedicated IUB 27th Convocation portrait sessions or schedule a bespoke traditional photography commission with live calendar availability.",
      "convocation_card_badge": "Dedicated Event Portal",
      "traditional_card_badge": "Studio & On-Location"
    }'::jsonb
  )
on conflict (key) do nothing;

