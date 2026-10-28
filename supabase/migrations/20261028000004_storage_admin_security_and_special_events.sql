-- ==============================================================================
-- MIGRATION 04: SUPABASE STORAGE POLICIES, PORTFOLIO GALLERY METADATA,
-- ADMIN FIRST-LOGIN CREDENTIAL SECURITY & DYNAMIC SPECIAL BOOKING TYPES
-- (100% Additive & Non-Destructive)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. STORAGE BUCKET CONFIGURATION & STRICT RLS POLICIES
-- ------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'portfolio-media',
    'portfolio-media',
    true,
    15728640,
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
  ),
  (
    'product-media',
    'product-media',
    true,
    15728640,
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Public can view portfolio and product media'
  ) then
    create policy "Public can view portfolio and product media"
      on storage.objects for select
      to public
      using (bucket_id in ('portfolio-media', 'product-media'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Admins can upload portfolio and product media'
  ) then
    create policy "Admins can upload portfolio and product media"
      on storage.objects for insert
      to authenticated
      with check (
        bucket_id in ('portfolio-media', 'product-media')
        and public.is_admin()
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Admins can update portfolio and product media'
  ) then
    create policy "Admins can update portfolio and product media"
      on storage.objects for update
      to authenticated
      using (
        bucket_id in ('portfolio-media', 'product-media')
        and public.is_admin()
      )
      with check (
        bucket_id in ('portfolio-media', 'product-media')
        and public.is_admin()
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Admins can delete portfolio and product media'
  ) then
    create policy "Admins can delete portfolio and product media"
      on storage.objects for delete
      to authenticated
      using (
        bucket_id in ('portfolio-media', 'product-media')
        and public.is_admin()
      );
  end if;
end $$;

-- ------------------------------------------------------------------------------
-- 2. PORTFOLIO PROJECTS RICH IMAGE METADATA
-- ------------------------------------------------------------------------------
alter table public.portfolio_projects
  add column if not exists cover_storage_path text,
  add column if not exists cover_alt_text text not null default '',
  add column if not exists cover_caption text not null default '',
  add column if not exists gallery_items jsonb not null default '[]'::jsonb,
  add column if not exists updated_at timestamp with time zone not null default timezone('utc'::text, now());

do $$
declare
  v_proj record;
  v_items jsonb;
  v_url text;
  v_idx integer;
begin
  for v_proj in select * from public.portfolio_projects loop
    if v_proj.cover_alt_text = '' then
      update public.portfolio_projects
      set cover_alt_text = v_proj.title || ' — ' || v_proj.client_name
      where id = v_proj.id;
    end if;

    if v_proj.gallery_items is null or jsonb_array_length(v_proj.gallery_items) = 0 then
      v_items := '[]'::jsonb;
      v_idx := 0;
      if v_proj.gallery_urls is not null then
        foreach v_url in array v_proj.gallery_urls loop
          v_idx := v_idx + 1;
          v_items := v_items || jsonb_build_array(
            jsonb_build_object(
              'id', 'img-' || v_proj.id::text || '-' || v_idx::text,
              'url', v_url,
              'storage_path', null,
              'caption', v_proj.title || ' (Frame ' || v_idx::text || ')',
              'alt_text', v_proj.title || ' — Gallery photograph ' || v_idx::text,
              'sort_order', v_idx
            )
          );
        end loop;
      end if;

      update public.portfolio_projects
      set gallery_items = v_items
      where id = v_proj.id;
    end if;
  end loop;
end $$;

-- ------------------------------------------------------------------------------
-- 3. ADMIN USERNAME & FIRST-LOGIN CREDENTIAL CHANGE SECURITY
-- ------------------------------------------------------------------------------
alter table public.profiles
  add column if not exists username text,
  add column if not exists must_change_credentials boolean not null default false,
  add column if not exists credentials_changed_at timestamp with time zone;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_username_format_check'
  ) then
    alter table public.profiles
      add constraint profiles_username_format_check
      check (username is null or username ~ '^[a-zA-Z0-9_.-]{3,32}$');
  end if;
end $$;

create unique index if not exists idx_profiles_username_lower
  on public.profiles (lower(btrim(username)))
  where username is not null and btrim(username) <> '';

create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    if auth.uid() is not null and not public.is_admin() then
      raise exception 'Permission denied: cannot modify account role.';
    end if;
  end if;

  if new.must_change_credentials is distinct from old.must_change_credentials then
    if auth.uid() is not null and not public.is_admin() then
      raise exception 'Permission denied: cannot modify credential requirement flag.';
    end if;
  end if;

  new.updated_at := timezone('utc'::text, now());
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := 'client';
  v_must_change boolean := false;
  v_username text := null;
begin
  if coalesce(new.raw_app_meta_data->>'role', '') = 'admin' then
    v_role := 'admin';
    v_must_change := coalesce((new.raw_app_meta_data->>'must_change_credentials')::boolean, true);
  end if;

  if coalesce(new.raw_user_meta_data->>'username', '') ~ '^[a-zA-Z0-9_.-]{3,32}$' then
    v_username := btrim(new.raw_user_meta_data->>'username');
  end if;

  insert into public.profiles (
    id,
    email,
    username,
    full_name,
    phone,
    role,
    must_change_credentials
  )
  values (
    new.id,
    coalesce(new.email, ''),
    v_username,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    v_role,
    v_must_change
  )
  on conflict (id) do update
  set email = excluded.email,
      updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

-- ------------------------------------------------------------------------------
-- 4. DYNAMIC SPECIAL BOOKING TYPES SCHEMA & CUSTOM FORM QUESTIONS
-- ------------------------------------------------------------------------------
alter table public.booking_events
  add column if not exists category text not null default 'convocation',
  add column if not exists timezone text not null default 'Asia/Dhaka',
  add column if not exists event_start_date date,
  add column if not exists event_end_date date,
  add column if not exists event_start_time time without time zone not null default '09:00:00',
  add column if not exists event_end_time time without time zone not null default '18:00:00',
  add column if not exists min_notice_hours integer not null default 12 check (min_notice_hours >= 0),
  add column if not exists max_advance_days integer not null default 180 check (max_advance_days > 0),
  add column if not exists custom_questions jsonb not null default '[]'::jsonb,
  add column if not exists booking_restrictions text,
  add column if not exists cover_storage_path text,
  add column if not exists is_featured_on_home boolean not null default false;

alter table public.photography_packages
  add column if not exists instructions text;

alter table public.bookings
  add column if not exists custom_fields jsonb not null default '{}'::jsonb,
  add column if not exists event_slug_snapshot text,
  add column if not exists event_category_snapshot text;

do $$
declare
  v_event_id uuid;
  v_session_1_id uuid;
  v_session_2_id uuid;
begin
  select id into v_event_id
  from public.booking_events
  where slug = 'iub-27th-convocation'
  limit 1;

  if v_event_id is not null then
    update public.booking_events
    set
      category = 'convocation',
      timezone = 'Asia/Dhaka',
      is_featured_on_home = true,
      event_start_date = coalesce(event_start_date, '2026-11-15'::date),
      event_end_date = coalesce(event_end_date, '2026-11-16'::date),
      booking_restrictions = coalesce(
        booking_restrictions,
        'Limited to registered IUB 27th Convocation graduates and accompanying family members.'
      ),
      custom_questions = case
        when custom_questions is null or jsonb_array_length(custom_questions) = 0 then
          '[
            {
              "id": "q_student_id",
              "key": "student_id",
              "label": "IUB Student ID",
              "description": "Your 7-digit Independent University, Bangladesh student identification number.",
              "placeholder": "e.g., 2020123",
              "field_type": "short_text",
              "required": true,
              "min_length": 4,
              "max_length": 32,
              "sort_order": 1
            },
            {
              "id": "q_department",
              "key": "degree_or_department",
              "label": "School / Academic Department",
              "description": "Select your graduating school or academic program.",
              "field_type": "dropdown",
              "required": true,
              "options": [
                "SETS — School of Engineering, Technology & Sciences",
                "SBE — School of Business & Entrepreneurship",
                "SLASS — School of Liberal Arts & Social Sciences",
                "SESM — School of Environment & Life Sciences",
                "SPPH — School of Public Health",
                "SLS — School of Law",
                "Graduate / Masters Program"
              ],
              "sort_order": 2
            },
            {
              "id": "q_robe_size",
              "key": "robe_size",
              "label": "Academic Regalia / Gown Size",
              "description": "Used to prepare backup regalia styling clips and hood pins.",
              "field_type": "single_choice",
              "required": true,
              "options": [
                "Small (S)",
                "Medium (M)",
                "Large (L)",
                "Extra Large (XL)"
              ],
              "sort_order": 3
            },
            {
              "id": "q_print_addons",
              "key": "framing_addons",
              "label": "Optional Print & Framing Preferences",
              "description": "Select any physical print editions you would like our studio team to prepare samples for.",
              "field_type": "multiple_choice",
              "required": false,
              "options": [
                "12mm Optical Clear Acrylic Frame",
                "Matte Fine-Art Graduation Print",
                "Family Portrait Archival Folio",
                "Digital Gallery Only"
              ],
              "sort_order": 4
            },
            {
              "id": "q_portrait_notes",
              "key": "portrait_notes",
              "label": "Family & Group Portrait Notes",
              "description": "Share any accessibility needs for elderly family members or specific group portrait requests.",
              "placeholder": "e.g., Parents and 2 siblings will join for the first 15 minutes.",
              "field_type": "long_text",
              "required": false,
              "max_length": 500,
              "sort_order": 5
            }
          ]'::jsonb
        else custom_questions
      end
    where id = v_event_id;

    if not exists (select 1 from public.event_sessions where event_id = v_event_id) then
      insert into public.event_sessions (
        event_id,
        session_date,
        title,
        start_time,
        end_time,
        slot_duration_mins,
        buffer_before_mins,
        buffer_after_mins,
        capacity_per_slot,
        is_active,
        notes
      )
      values (
        v_event_id,
        '2026-11-15'::date,
        'Day 1 Morning & Afternoon Convocation Sessions',
        '09:00:00'::time,
        '17:00:00'::time,
        30,
        0,
        10,
        2,
        true,
        'Main convocation day portrait sessions at IUB Campus & OFFPRINT Studio.'
      )
      returning id into v_session_1_id;

      insert into public.event_sessions (
        event_id,
        session_date,
        title,
        start_time,
        end_time,
        slot_duration_mins,
        buffer_before_mins,
        buffer_after_mins,
        capacity_per_slot,
        is_active,
        notes
      )
      values (
        v_event_id,
        '2026-11-16'::date,
        'Day 2 Extended Graduate & Family Portrait Sessions',
        '10:00:00'::time,
        '17:00:00'::time,
        30,
        0,
        10,
        2,
        true,
        'Post-ceremony studio & campus portrait sessions.'
      )
      returning id into v_session_2_id;

      perform public.generate_event_session_slots(v_session_1_id);
      perform public.generate_event_session_slots(v_session_2_id);
    end if;
  end if;
end $$;

-- ------------------------------------------------------------------------------
-- 5. UPGRADE ATOMIC BOOKING RPCS FOR SPECIAL EVENTS & CUSTOM FIELDS
--    AND HARDEN SECURITY DEFINER GRANTS
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
  p_actor_role text,
  p_custom_fields jsonb
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
  v_effective_actor_role text := coalesce(p_actor_role, 'client');
  v_event_slug_snap text := null;
  v_event_cat_snap text := null;
  v_db_booking_type text := case when p_booking_type = 'special' then 'convocation' else p_booking_type end;
begin
  if v_effective_actor_role = 'admin' and auth.uid() is not null and not public.is_admin() then
    v_effective_actor_role := 'client';
  end if;

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

  if v_db_booking_type = 'convocation' then
    if p_event_id is null or p_slot_id is null then
      raise exception 'MISSING_EVENT_SLOT: Event booking requires a valid event and time slot.';
    end if;

    select * into v_event
    from public.booking_events
    where id = p_event_id
    for share;

    if not found then
      raise exception 'EVENT_NOT_FOUND: Selected event does not exist.';
    end if;

    if v_effective_actor_role <> 'admin' then
      if v_event.status <> 'published' then
        raise exception 'EVENT_NOT_OPEN: This event is currently not open for public reservations (status: %).', v_event.status;
      end if;
      if v_event.booking_opens_at is not null and now() < v_event.booking_opens_at then
        raise exception 'BOOKING_NOT_OPEN_YET: Bookings for this event have not opened yet.';
      end if;
      if v_event.booking_closes_at is not null and now() > v_event.booking_closes_at then
        raise exception 'BOOKING_CLOSED: The booking window for this event has closed.';
      end if;
      if v_event.min_notice_hours > 0 and p_start_at < (now() + make_interval(hours => v_event.min_notice_hours)) then
        raise exception 'ADVANCE_NOTICE_REQUIRED: This event requires at least % hours advance notice.', v_event.min_notice_hours;
      end if;
    end if;

    v_resource_pool := coalesce(v_event.resource_pool, 'primary_studio');
    v_cancel_cutoff := coalesce(v_event.cancellation_cutoff_hours, 48);
    v_resched_cutoff := coalesce(v_event.reschedule_cutoff_hours, 24);
    v_title := v_event.title;
    v_event_slug_snap := v_event.slug;
    v_event_cat_snap := v_event.category;

    perform pg_advisory_xact_lock(hashtext('offprint_pool_' || v_resource_pool));

    select * into v_slot
    from public.event_time_slots
    where id = p_slot_id and event_id = p_event_id
    for update;

    if not found then
      raise exception 'SLOT_NOT_FOUND: Selected time slot does not exist for this event.';
    end if;

    if v_slot.status <> 'available' then
      raise exception 'SLOT_UNAVAILABLE: Selected time slot is blocked or closed.';
    end if;

    if v_slot.booked_count >= v_slot.capacity then
      raise exception 'SLOT_FULL: This time slot has just reached full capacity. Please select another time slot.';
    end if;

    v_buffer_before := v_slot.buffer_before_mins;
    v_buffer_after := v_slot.buffer_after_mins;
    v_eff_start := v_slot.effective_start_at;
    v_eff_end := v_slot.effective_end_at;

    select count(*) into v_block_count
    from public.availability_blocks b
    where (b.resource_pool = v_resource_pool or b.event_id = p_event_id)
      and b.start_at < v_eff_end
      and b.end_at > v_eff_start;

    if v_block_count > 0 then
      raise exception 'SLOT_BLOCKED: Selected time slot falls within a blocked schedule period.';
    end if;

    select count(*) into v_overlap_count
    from public.bookings bk
    where bk.resource_pool = v_resource_pool
      and bk.status in ('pending', 'confirmed', 'rescheduled')
      and (bk.slot_id is null or bk.slot_id <> v_slot.id)
      and bk.effective_start_at < v_eff_end
      and bk.effective_end_at > v_eff_start;

    if v_overlap_count > 0 then
      raise exception 'RESOURCE_CONFLICT: Another photography session is already scheduled during this time window.';
    end if;

    update public.event_time_slots
    set booked_count = booked_count + 1,
        updated_at = timezone('utc'::text, now())
    where id = v_slot.id;

  elsif v_db_booking_type = 'traditional' then
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

    if v_effective_actor_role <> 'admin' and not v_service.is_active then
      raise exception 'SERVICE_INACTIVE: Selected photography service is currently unavailable.';
    end if;

    v_resource_pool := coalesce(v_service.resource_pool, 'primary_studio');
    v_buffer_before := coalesce(v_service.buffer_before_mins, 15);
    v_buffer_after := coalesce(v_service.buffer_after_mins, 15);
    v_eff_start := p_start_at - make_interval(mins => v_buffer_before);
    v_eff_end := p_end_at + make_interval(mins => v_buffer_after);
    v_cancel_cutoff := coalesce(v_service.cancellation_cutoff_hours, 24);
    v_resched_cutoff := coalesce(v_service.reschedule_cutoff_hours, 24);
    v_title := v_service.name;
    v_max_concurrent := greatest(1, coalesce(v_service.max_concurrent_bookings, 1));

    perform pg_advisory_xact_lock(hashtext('offprint_pool_' || v_resource_pool));

    if v_effective_actor_role <> 'admin' then
      if p_start_at < (now() + make_interval(hours => v_service.min_notice_hours)) then
        raise exception 'ADVANCE_NOTICE_REQUIRED: Bookings for this service require at least % hours advance notice.', v_service.min_notice_hours;
      end if;
      if p_start_at > (now() + make_interval(days => v_service.max_advance_days)) then
        raise exception 'MAX_ADVANCE_EXCEEDED: Bookings cannot be scheduled more than % days in advance.', v_service.max_advance_days;
      end if;
    end if;

    v_dhaka_dow := extract(dow from (p_start_at at time zone 'Asia/Dhaka'))::integer;
    v_dhaka_start_time := (p_start_at at time zone 'Asia/Dhaka')::time;
    v_dhaka_end_time := (p_end_at at time zone 'Asia/Dhaka')::time;

    select * into v_rule
    from public.availability_rules
    where resource_pool = v_resource_pool
      and day_of_week = v_dhaka_dow
    limit 1;

    if found and v_effective_actor_role <> 'admin' then
      if not v_rule.is_open then
        raise exception 'DAY_CLOSED: Studio is closed on the selected day of the week.';
      end if;
      if v_dhaka_start_time < v_rule.start_time or v_dhaka_end_time > v_rule.end_time then
        raise exception 'OUTSIDE_OPERATING_HOURS: Selected time is outside studio operating hours (% to %).', v_rule.start_time, v_rule.end_time;
      end if;
      v_max_concurrent := least(v_max_concurrent, greatest(1, v_rule.capacity_per_slot));
    end if;

    select count(*) into v_block_count
    from public.availability_blocks b
    where (b.resource_pool = v_resource_pool or b.service_id = p_service_id)
      and b.start_at < v_eff_end
      and b.end_at > v_eff_start;

    if v_block_count > 0 then
      raise exception 'SLOT_BLOCKED: Selected time window is blocked or unavailable.';
    end if;

    select count(*) into v_overlap_count
    from public.bookings bk
    where bk.resource_pool = v_resource_pool
      and bk.status in ('pending', 'confirmed', 'rescheduled')
      and bk.effective_start_at < v_eff_end
      and bk.effective_end_at > v_eff_start;

    if v_overlap_count >= v_max_concurrent then
      raise exception 'SLOT_FULL: This time window is already reserved. Please select another available slot.';
    end if;
  else
    raise exception 'INVALID_BOOKING_TYPE: Unsupported booking type %.', p_booking_type;
  end if;

  if p_package_id is not null then
    select * into v_package
    from public.photography_packages
    where id = p_package_id
    limit 1;
    if found then
      v_pkg_name := v_package.name;
      v_pkg_price := v_package.price_label;
    end if;
  end if;

  loop
    v_booking_ref := 'OFP-' || to_char(now() at time zone 'Asia/Dhaka', 'YYYY') || '-' ||
      upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
    exit when not exists (select 1 from public.bookings where booking_ref = v_booking_ref);
  end loop;

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
    event_slug_snapshot,
    event_category_snapshot,
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
    custom_fields,
    status,
    cancellation_cutoff_hours,
    reschedule_cutoff_hours
  )
  values (
    v_booking_ref,
    nullif(btrim(p_idempotency_key), ''),
    p_user_id,
    v_db_booking_type,
    p_event_id,
    coalesce(p_session_id, v_slot.session_id),
    p_slot_id,
    p_service_id,
    p_package_id,
    v_pkg_name,
    v_pkg_price,
    v_title,
    v_event_slug_snap,
    v_event_cat_snap,
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
    greatest(1, coalesce(p_guests_count, 1)),
    btrim(p_location),
    nullif(btrim(coalesce(p_client_notes, '')), ''),
    coalesce(p_custom_fields, '{}'::jsonb),
    'confirmed',
    v_cancel_cutoff,
    v_resched_cutoff
  )
  returning * into v_created;

  insert into public.booking_status_history (
    booking_id,
    previous_status,
    new_status,
    action,
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
    v_created.start_at,
    p_user_id,
    v_effective_actor_role,
    'Initial reservation confirmed'
  );

  return v_created;
end;
$$;

-- Keep 22-arg overload delegating to 23-arg version
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
language sql
security definer
set search_path = public
as $$
  select public.create_booking_atomic(
    p_idempotency_key,
    p_user_id,
    p_booking_type,
    p_event_id,
    p_session_id,
    p_slot_id,
    p_service_id,
    p_package_id,
    p_booking_date,
    p_start_at,
    p_end_at,
    p_duration_mins,
    p_client_name,
    p_client_email,
    p_client_phone,
    p_company_or_institution,
    p_student_id,
    p_degree_or_department,
    p_guests_count,
    p_location,
    p_client_notes,
    p_actor_role,
    '{}'::jsonb
  );
$$;

grant execute on function public.create_booking_atomic(
  text, uuid, text, uuid, uuid, uuid, uuid, uuid, date, timestamptz, timestamptz, integer,
  text, text, text, text, text, text, integer, text, text, text, jsonb
) to anon, authenticated;

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
  v_old_slot public.event_time_slots;
  v_new_slot public.event_time_slots;
  v_service public.photography_services;
  v_rule public.availability_rules;
  v_eff_start timestamptz;
  v_eff_end timestamptz;
  v_block_count integer := 0;
  v_overlap_count integer := 0;
  v_max_concurrent integer := 1;
  v_dhaka_dow integer;
  v_dhaka_start_time time;
  v_dhaka_end_time time;
  v_updated public.bookings;
  v_effective_role text := coalesce(p_actor_role, 'client');
begin
  if v_effective_role = 'admin' and auth.uid() is not null and not public.is_admin() then
    raise exception 'UNAUTHORIZED: Only administrators can perform admin reschedules.';
  end if;

  select * into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'BOOKING_NOT_FOUND: Booking record does not exist.';
  end if;

  if v_booking.status not in ('pending', 'confirmed', 'rescheduled') then
    raise exception 'INVALID_STATUS: Cancelled or completed bookings cannot be rescheduled.';
  end if;

  if v_effective_role <> 'admin' then
    if (auth.uid() is not null and v_booking.user_id is distinct from auth.uid())
       or (p_actor_id is null or v_booking.user_id is distinct from p_actor_id) then
      raise exception 'UNAUTHORIZED: You may only reschedule your own bookings.';
    end if;

    if now() > (v_booking.start_at - make_interval(hours => v_booking.reschedule_cutoff_hours)) then
      raise exception 'RESCHEDULE_DEADLINE_PASSED: Bookings must be rescheduled at least % hours before the session start time.', v_booking.reschedule_cutoff_hours;
    end if;
  end if;

  perform pg_advisory_xact_lock(hashtext('offprint_pool_' || v_booking.resource_pool));

  if v_booking.booking_type = 'convocation' then
    if p_new_slot_id is null then
      raise exception 'MISSING_NEW_SLOT: Rescheduling an event booking requires selecting an available slot.';
    end if;

    if p_new_slot_id = v_booking.slot_id then
      raise exception 'SAME_SLOT: Please choose a different time slot to reschedule.';
    end if;

    select * into v_new_slot
    from public.event_time_slots
    where id = p_new_slot_id and event_id = v_booking.event_id
    for update;

    if not found then
      raise exception 'SLOT_NOT_FOUND: Target time slot does not exist.';
    end if;

    if v_new_slot.status <> 'available' then
      raise exception 'SLOT_UNAVAILABLE: Target time slot is blocked or closed.';
    end if;

    if v_new_slot.booked_count >= v_new_slot.capacity then
      raise exception 'SLOT_FULL: Target time slot is already full.';
    end if;

    v_eff_start := v_new_slot.effective_start_at;
    v_eff_end := v_new_slot.effective_end_at;

    select count(*) into v_block_count
    from public.availability_blocks b
    where (b.resource_pool = v_booking.resource_pool or b.event_id = v_booking.event_id)
      and b.start_at < v_eff_end
      and b.end_at > v_eff_start;

    if v_block_count > 0 then
      raise exception 'SLOT_BLOCKED: Target time slot is blocked.';
    end if;

    select count(*) into v_overlap_count
    from public.bookings bk
    where bk.resource_pool = v_booking.resource_pool
      and bk.id <> v_booking.id
      and bk.status in ('pending', 'confirmed', 'rescheduled')
      and (bk.slot_id is null or bk.slot_id <> v_new_slot.id)
      and bk.effective_start_at < v_eff_end
      and bk.effective_end_at > v_eff_start;

    if v_overlap_count > 0 then
      raise exception 'RESOURCE_CONFLICT: Another photography session overlaps the new slot.';
    end if;

    if v_booking.slot_id is not null then
      select * into v_old_slot
      from public.event_time_slots
      where id = v_booking.slot_id
      for update;

      if found then
        update public.event_time_slots
        set booked_count = greatest(0, booked_count - 1),
            updated_at = timezone('utc'::text, now())
        where id = v_old_slot.id;
      end if;
    end if;

    update public.event_time_slots
    set booked_count = booked_count + 1,
        updated_at = timezone('utc'::text, now())
    where id = v_new_slot.id;

    update public.bookings
    set slot_id = v_new_slot.id,
        session_id = v_new_slot.session_id,
        booking_date = v_new_slot.slot_date,
        start_at = v_new_slot.start_at,
        end_at = v_new_slot.end_at,
        buffer_before_mins = v_new_slot.buffer_before_mins,
        buffer_after_mins = v_new_slot.buffer_after_mins,
        effective_start_at = v_new_slot.effective_start_at,
        effective_end_at = v_new_slot.effective_end_at,
        status = 'rescheduled',
        rescheduled_count = rescheduled_count + 1,
        last_rescheduled_at = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now())
    where id = v_booking.id
    returning * into v_updated;

  else
    if p_new_end_at <= p_new_start_at then
      raise exception 'INVALID_TIME_RANGE: New end time must be after new start time.';
    end if;

    select * into v_service
    from public.photography_services
    where id = v_booking.service_id;

    v_eff_start := p_new_start_at - make_interval(mins => v_booking.buffer_before_mins);
    v_eff_end := p_new_end_at + make_interval(mins => v_booking.buffer_after_mins);
    v_max_concurrent := greatest(1, coalesce(v_service.max_concurrent_bookings, 1));

    v_dhaka_dow := extract(dow from (p_new_start_at at time zone 'Asia/Dhaka'))::integer;
    v_dhaka_start_time := (p_new_start_at at time zone 'Asia/Dhaka')::time;
    v_dhaka_end_time := (p_new_end_at at time zone 'Asia/Dhaka')::time;

    select * into v_rule
    from public.availability_rules
    where resource_pool = v_booking.resource_pool
      and day_of_week = v_dhaka_dow
    limit 1;

    if found and v_effective_role <> 'admin' then
      if not v_rule.is_open then
        raise exception 'DAY_CLOSED: Studio is closed on the selected day.';
      end if;
      if v_dhaka_start_time < v_rule.start_time or v_dhaka_end_time > v_rule.end_time then
        raise exception 'OUTSIDE_OPERATING_HOURS: Selected time is outside studio operating hours.';
      end if;
      v_max_concurrent := least(v_max_concurrent, greatest(1, v_rule.capacity_per_slot));
    end if;

    select count(*) into v_block_count
    from public.availability_blocks b
    where (b.resource_pool = v_booking.resource_pool or b.service_id = v_booking.service_id)
      and b.start_at < v_eff_end
      and b.end_at > v_eff_start;

    if v_block_count > 0 then
      raise exception 'SLOT_BLOCKED: Selected time window is blocked.';
    end if;

    select count(*) into v_overlap_count
    from public.bookings bk
    where bk.resource_pool = v_booking.resource_pool
      and bk.id <> v_booking.id
      and bk.status in ('pending', 'confirmed', 'rescheduled')
      and bk.effective_start_at < v_eff_end
      and bk.effective_end_at > v_eff_start;

    if v_overlap_count >= v_max_concurrent then
      raise exception 'SLOT_FULL: The requested time slot is already booked.';
    end if;

    update public.bookings
    set booking_date = p_new_date,
        start_at = p_new_start_at,
        end_at = p_new_end_at,
        duration_mins = greatest(15, extract(epoch from (p_new_end_at - p_new_start_at))::integer / 60),
        effective_start_at = v_eff_start,
        effective_end_at = v_eff_end,
        status = 'rescheduled',
        rescheduled_count = rescheduled_count + 1,
        last_rescheduled_at = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now())
    where id = v_booking.id
    returning * into v_updated;
  end if;

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
    v_updated.id,
    v_booking.status,
    'rescheduled',
    'rescheduled',
    v_booking.start_at,
    v_updated.start_at,
    p_actor_id,
    v_effective_role,
    coalesce(nullif(btrim(p_reason), ''), 'Rescheduled via portal')
  );

  return v_updated;
end;
$$;

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
  v_effective_role text := coalesce(p_actor_role, 'client');
begin
  if v_effective_role = 'admin' and auth.uid() is not null and not public.is_admin() then
    raise exception 'UNAUTHORIZED: Only administrators can perform admin cancellations.';
  end if;

  select * into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'BOOKING_NOT_FOUND: Booking record does not exist.';
  end if;

  if v_booking.status = 'cancelled' then
    return v_booking;
  end if;

  if v_booking.status = 'completed' and v_effective_role <> 'admin' then
    raise exception 'INVALID_STATUS: Completed bookings cannot be cancelled.';
  end if;

  if v_effective_role <> 'admin' then
    if (auth.uid() is not null and v_booking.user_id is distinct from auth.uid())
       or (p_actor_id is null or v_booking.user_id is distinct from p_actor_id) then
      raise exception 'UNAUTHORIZED: You may only cancel your own bookings.';
    end if;

    if now() > (v_booking.start_at - make_interval(hours => v_booking.cancellation_cutoff_hours)) then
      raise exception 'CANCELLATION_DEADLINE_PASSED: Cancellations must be requested at least % hours prior to the session.', v_booking.cancellation_cutoff_hours;
    end if;
  end if;

  perform pg_advisory_xact_lock(hashtext('offprint_pool_' || v_booking.resource_pool));

  if v_booking.slot_id is not null then
    update public.event_time_slots
    set booked_count = greatest(0, booked_count - 1),
        updated_at = timezone('utc'::text, now())
    where id = v_booking.slot_id;
  end if;

  update public.bookings
  set status = 'cancelled',
      cancellation_reason = coalesce(nullif(btrim(p_reason), ''), 'Cancelled by ' || v_effective_role),
      cancelled_at = timezone('utc'::text, now()),
      cancelled_by = case when v_effective_role = 'admin' then 'admin' else 'client' end,
      updated_at = timezone('utc'::text, now())
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
    v_updated.id,
    v_booking.status,
    'cancelled',
    'cancelled',
    v_booking.start_at,
    null,
    p_actor_id,
    v_effective_role,
    v_updated.cancellation_reason
  );

  return v_updated;
end;
$$;

create or replace function public.generate_event_session_slots(
  p_session_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session record;
  v_slot_start timestamptz;
  v_slot_end timestamptz;
  v_eff_start timestamptz;
  v_eff_end timestamptz;
  v_window_end timestamptz;
  v_created_count integer := 0;
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'FORBIDDEN: Only administrators can generate session slots.';
  end if;

  select * into v_session
  from public.event_sessions
  where id = p_session_id;

  if not found then
    raise exception 'Event session % not found', p_session_id;
  end if;

  v_slot_start := ((v_session.session_date::text || ' ' || v_session.start_time::text)::timestamp at time zone 'Asia/Dhaka');
  v_window_end := ((v_session.session_date::text || ' ' || v_session.end_time::text)::timestamp at time zone 'Asia/Dhaka');

  while (v_slot_start + make_interval(mins => v_session.slot_duration_mins)) <= v_window_end loop
    v_slot_end := v_slot_start + make_interval(mins => v_session.slot_duration_mins);
    v_eff_start := v_slot_start - make_interval(mins => v_session.buffer_before_mins);
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
      status
    )
    values (
      v_session.event_id,
      v_session.id,
      v_session.session_date,
      v_slot_start,
      v_slot_end,
      v_session.buffer_before_mins,
      v_session.buffer_after_mins,
      v_eff_start,
      v_eff_end,
      v_session.capacity_per_slot,
      0,
      'available'
    )
    on conflict (event_id, start_at, end_at) do update
    set
      session_id = excluded.session_id,
      capacity = greatest(public.event_time_slots.booked_count, excluded.capacity),
      buffer_before_mins = excluded.buffer_before_mins,
      buffer_after_mins = excluded.buffer_after_mins,
      effective_start_at = excluded.effective_start_at,
      effective_end_at = excluded.effective_end_at,
      updated_at = timezone('utc'::text, now());

    v_created_count := v_created_count + 1;
    v_slot_start := v_slot_end + make_interval(mins => v_session.buffer_after_mins);
  end loop;

  return v_created_count;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.prevent_role_self_escalation() from public, anon, authenticated;
revoke execute on function public.generate_event_session_slots(uuid) from public, anon;
grant execute on function public.generate_event_session_slots(uuid) to authenticated;
revoke execute on function public.cancel_booking_atomic(uuid, uuid, text, text) from public, anon;
grant execute on function public.cancel_booking_atomic(uuid, uuid, text, text) to authenticated;
revoke execute on function public.reschedule_booking_atomic(uuid, uuid, text, uuid, date, timestamptz, timestamptz, text) from public, anon;
grant execute on function public.reschedule_booking_atomic(uuid, uuid, text, uuid, date, timestamptz, timestamptz, text) to authenticated;
