-- =============================================================================
-- Migration 06: Advanced Package CRUD, Booking Duration & Optional Frame Printing
-- =============================================================================

-- 1. Extend photography_packages with full configuration fields
ALTER TABLE public.photography_packages 
  ADD COLUMN IF NOT EXISTS price_numeric numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'BDT',
  ADD COLUMN IF NOT EXISTS frame_printing_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS inclusions text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS restrictions text,
  ADD COLUMN IF NOT EXISTS instructions text;

-- Backfill numeric prices for existing default packages
UPDATE public.photography_packages
SET price_numeric = 3500.00
WHERE name ILIKE '%Solo Edition%' AND (price_numeric IS NULL OR price_numeric = 0);

UPDATE public.photography_packages
SET price_numeric = 6000.00
WHERE name ILIKE '%Laureate%' AND (price_numeric IS NULL OR price_numeric = 0);

UPDATE public.photography_packages
SET price_numeric = 9500.00
WHERE name ILIKE '%Chancellor%' AND (price_numeric IS NULL OR price_numeric = 0);

UPDATE public.photography_packages
SET price_numeric = 7500.00
WHERE name ILIKE '%Individual Executive%' AND (price_numeric IS NULL OR price_numeric = 0);

UPDATE public.photography_packages
SET price_numeric = 24000.00
WHERE name ILIKE '%Leadership Team%' AND (price_numeric IS NULL OR price_numeric = 0);

-- 2. Extend booking_events with configurable frame printing settings
ALTER TABLE public.booking_events 
  ADD COLUMN IF NOT EXISTS frame_printing_config jsonb DEFAULT '{
    "enabled": false,
    "title": "Archival Frame Printing",
    "description": "Professional wooden & metallic framing for your convocation portraits",
    "max_quantity": 5,
    "frame_types": []
  }'::jsonb;

-- Pre-populate default frame types for IUB 27th Convocation
UPDATE public.booking_events
SET frame_printing_config = '{
  "enabled": true,
  "title": "Archival Frame Printing",
  "description": "Museum-grade UV-resistant framing with acid-free archival matte board crafted for your convocation portraits.",
  "max_quantity": 5,
  "instructions": "Framed prints are handcrafted and ready for pickup or courier delivery within 5-7 business days following proof approval.",
  "frame_types": [
    {
      "id": "frame-12x18-wood",
      "name": "12\" x 18\" Premium Burmese Teak Frame",
      "dimensions": "12\" x 18\"",
      "price": 2200,
      "description": "Solid teak wood profile with non-glare museum acrylic glass and warm luster photographic print.",
      "is_active": true
    },
    {
      "id": "frame-16x24-metal",
      "name": "16\" x 24\" Minimal Archival Matte Black Metal Frame",
      "dimensions": "16\" x 24\"",
      "price": 3500,
      "description": "Sleek aluminum frame with 2-inch acid-free white matting and archival metallic pearl print.",
      "is_active": true
    },
    {
      "id": "frame-20x30-canvas",
      "name": "20\" x 30\" Gallery Box Canvas Frame",
      "dimensions": "20\" x 30\"",
      "price": 5200,
      "description": "Deep wooden shadowbox gallery wrap on heavy 380gsm archival cotton canvas.",
      "is_active": true
    }
  ]
}'::jsonb
WHERE slug = 'iub-27th-convocation' AND (
  frame_printing_config IS NULL 
  OR frame_printing_config->>'enabled' IS NULL 
  OR (frame_printing_config->>'enabled')::boolean = false
);

-- 3. Extend bookings with pricing snapshot, frame selections & package details
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS package_base_price numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS frame_printing_selected boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS frame_type_id text,
  ADD COLUMN IF NOT EXISTS frame_type_name text,
  ADD COLUMN IF NOT EXISTS frame_quantity integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS frame_unit_price numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS frame_total_price numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_price numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pricing_snapshot jsonb DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_bookings_package_id ON public.bookings(package_id);
CREATE INDEX IF NOT EXISTS idx_bookings_frame_selected ON public.bookings(frame_printing_selected);

-- 4. Function: Safe package deletion / archive RPC
CREATE OR REPLACE FUNCTION public.delete_or_archive_package(p_package_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_count integer := 0;
  v_pkg public.photography_packages;
BEGIN
  SELECT * INTO v_pkg FROM public.photography_packages WHERE id = p_package_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PACKAGE_NOT_FOUND: Package with ID % does not exist.', p_package_id;
  END IF;

  SELECT count(*) INTO v_booking_count
  FROM public.bookings
  WHERE package_id = p_package_id;

  IF v_booking_count > 0 THEN
    UPDATE public.photography_packages
    SET is_active = false,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_package_id;

    RETURN jsonb_build_object(
      'action', 'archived',
      'id', p_package_id,
      'name', v_pkg.name,
      'is_active', false,
      'historical_bookings_count', v_booking_count,
      'message', format('Package "%s" is referenced by %s booking(s) and was safely archived/deactivated rather than deleted.', v_pkg.name, v_booking_count)
    );
  ELSE
    DELETE FROM public.photography_packages WHERE id = p_package_id;
    RETURN jsonb_build_object(
      'action', 'deleted',
      'id', p_package_id,
      'name', v_pkg.name,
      'historical_bookings_count', 0,
      'message', format('Package "%s" had no bookings and was permanently deleted.', v_pkg.name)
    );
  END IF;
END;
$$;

-- 5. Master Atomic Booking Function supporting package durations and pricing snapshot (32 parameters)
CREATE OR REPLACE FUNCTION public.create_booking_atomic(
  p_idempotency_key text,
  p_user_id uuid,
  p_booking_type text,
  p_event_id uuid,
  p_session_id uuid,
  p_slot_id uuid,
  p_service_id uuid,
  p_package_id uuid,
  p_booking_date date,
  p_start_at timestamp with time zone,
  p_end_at timestamp with time zone,
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
  p_custom_fields jsonb,
  p_package_base_price numeric,
  p_frame_printing_selected boolean,
  p_frame_type_id text,
  p_frame_type_name text,
  p_frame_quantity integer,
  p_frame_unit_price numeric,
  p_frame_total_price numeric,
  p_total_price numeric,
  p_pricing_snapshot jsonb
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
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
  v_calc_end_at timestamptz;
  v_effective_duration integer;
  v_cancel_cutoff integer := 24;
  v_resched_cutoff integer := 24;
  v_title text;
  v_pkg_name text := null;
  v_pkg_price text := null;
  v_pkg_base_price numeric(12,2) := coalesce(p_package_base_price, 0);
  v_tot_price numeric(12,2) := coalesce(p_total_price, 0);
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
BEGIN
  if v_effective_actor_role = 'admin' and auth.uid() is not null and not public.is_admin() then
    v_effective_actor_role := 'client';
  end if;

  -- 1. Idempotency Check
  if p_idempotency_key is not null and btrim(p_idempotency_key) <> '' then
    select * into v_existing
    from public.bookings
    where idempotency_key = p_idempotency_key
    limit 1;
    if found then
      return v_existing;
    end if;
  end if;

  -- 2. Resolve package info & duration if package_id is provided
  if p_package_id is not null then
    select * into v_package
    from public.photography_packages
    where id = p_package_id
    limit 1;
    if found then
      v_pkg_name := v_package.name;
      v_pkg_price := v_package.price_label;
      if v_pkg_base_price <= 0 and v_package.price_numeric > 0 then
        v_pkg_base_price := v_package.price_numeric;
      end if;
      v_effective_duration := coalesce(p_duration_mins, v_package.duration_mins);
    end if;
  end if;

  if v_effective_duration is null or v_effective_duration <= 0 then
    v_effective_duration := greatest(10, coalesce(p_duration_mins, 30));
  end if;

  -- Calculate session end time based on package/configured duration
  v_calc_end_at := p_start_at + make_interval(mins => v_effective_duration);

  if v_calc_end_at <= p_start_at then
    raise exception 'INVALID_TIME_RANGE: End time must be strictly after start time.';
  end if;

  -- 3. Branch: Convocation / Special Event Booking
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
    v_buffer_before := coalesce(v_event.buffer_before_mins, 0);
    v_buffer_after := coalesce(v_event.buffer_after_mins, 10);
    v_cancel_cutoff := coalesce(v_event.cancellation_cutoff_hours, 48);
    v_resched_cutoff := coalesce(v_event.reschedule_cutoff_hours, 24);
    v_title := v_event.title;
    v_event_slug_snap := v_event.slug;
    v_event_cat_snap := v_event.category;

    -- Concurrency Lock on Resource Pool
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

    v_eff_start := p_start_at - make_interval(mins => v_buffer_before);
    v_eff_end := v_calc_end_at + make_interval(mins => v_buffer_after);

    -- Check Blackout Blocks overlapping effective session window
    select count(*) into v_block_count
    from public.availability_blocks b
    where (b.resource_pool = v_resource_pool or b.event_id = p_event_id)
      and b.start_at < v_eff_end
      and b.end_at > v_eff_start;

    if v_block_count > 0 then
      raise exception 'SLOT_BLOCKED: Selected time window falls within a studio blocked schedule period.';
    end if;

    -- Check overlapping bookings on the same resource pool
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

    -- Increment slot count
    update public.event_time_slots
    set booked_count = booked_count + 1,
        updated_at = timezone('utc'::text, now())
    where id = v_slot.id;

  -- 4. Branch: Traditional Service Booking
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
    v_eff_end := v_calc_end_at + make_interval(mins => v_buffer_after);
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
    v_dhaka_end_time := (v_calc_end_at at time zone 'Asia/Dhaka')::time;

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

  -- 5. Calculate total trusted price if not passed
  if v_tot_price <= 0 then
    v_tot_price := v_pkg_base_price + coalesce(p_frame_total_price, 0);
  end if;

  -- 6. Generate Human-Readable Booking Reference OFP-YYYY-XXXXXX
  loop
    v_booking_ref := 'OFP-' || to_char(now() at time zone 'Asia/Dhaka', 'YYYY') || '-' ||
      upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
    exit when not exists (select 1 from public.bookings where booking_ref = v_booking_ref);
  end loop;

  -- 7. Insert the authoritative booking record with full pricing and frame details
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
    reschedule_cutoff_hours,
    package_base_price,
    frame_printing_selected,
    frame_type_id,
    frame_type_name,
    frame_quantity,
    frame_unit_price,
    frame_total_price,
    total_price,
    pricing_snapshot
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
    v_calc_end_at,
    v_buffer_before,
    v_buffer_after,
    v_eff_start,
    v_eff_end,
    v_effective_duration,
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
    v_resched_cutoff,
    v_pkg_base_price,
    coalesce(p_frame_printing_selected, false),
    p_frame_type_id,
    p_frame_type_name,
    coalesce(p_frame_quantity, 0),
    coalesce(p_frame_unit_price, 0),
    coalesce(p_frame_total_price, 0),
    v_tot_price,
    coalesce(p_pricing_snapshot, '{}'::jsonb)
  )
  returning * into v_created;

  -- 8. Record audit log
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
END;
$function$;
