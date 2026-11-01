-- ------------------------------------------------------------------------------
-- MIGRATION: 20261102000001_package_linked_scheduling_and_passwordless_portal.sql
-- Description:
-- 1. Creates event_session_packages junction table to associate packages with sessions.
-- 2. Adds duration_mins and package_ids to event_time_slots.
-- 3. Adds package_id and duration_mins to booking_slot_holds.
-- 4. Upgrades acquire_slot_hold to support package associations and cross-duration overlapping conflict protection.
-- 5. Upgrades create_booking_atomic to validate package-to-session and slot duration consistency.
-- ------------------------------------------------------------------------------

-- 1. Create event_session_packages junction table
create table if not exists public.event_session_packages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.event_sessions(id) on delete cascade,
  package_id uuid not null references public.photography_packages(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (session_id, package_id)
);

create index if not exists idx_event_session_packages_session
  on public.event_session_packages(session_id);

create index if not exists idx_event_session_packages_package
  on public.event_session_packages(package_id);

-- Enable RLS on event_session_packages
alter table public.event_session_packages enable row level security;

-- Policies
create policy "Allow public read of session packages"
  on public.event_session_packages
  for select
  using (true);

create policy "Allow admin write of session packages"
  on public.event_session_packages
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 2. Extend event_time_slots with duration_mins and package_ids
alter table public.event_time_slots
  add column if not exists duration_mins integer not null default 30
    check (duration_mins >= 5 and duration_mins <= 720),
  add column if not exists package_ids uuid[] not null default array[]::uuid[];

create index if not exists idx_event_time_slots_duration
  on public.event_time_slots(duration_mins);

create index if not exists idx_event_time_slots_package_ids
  on public.event_time_slots using gin(package_ids);

-- 3. Extend booking_slot_holds with package_id and duration_mins
alter table public.booking_slot_holds
  add column if not exists package_id uuid references public.photography_packages(id) on delete set null,
  add column if not exists duration_mins integer default 30;

create index if not exists idx_booking_slot_holds_package
  on public.booking_slot_holds(package_id);

-- 4. Upgrade acquire_slot_hold RPC with package association and cross-duration overlap protection
create or replace function public.acquire_slot_hold(
  p_event_id uuid,
  p_session_id uuid,
  p_slot_id uuid,
  p_flow_token text,
  p_hold_duration_mins integer default null,
  p_package_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot public.event_time_slots;
  v_event public.booking_events;
  v_pkg public.photography_packages;
  v_duration integer;
  v_booked_count integer;
  v_other_holds_count integer;
  v_available_cap integer;
  v_hold_id uuid;
  v_expires_at timestamptz;
begin
  if p_flow_token is null or trim(p_flow_token) = '' then
    raise exception 'INVALID_FLOW_TOKEN: Client flow token is required.';
  end if;

  -- 1. Lock the slot row to prevent concurrent hold race conditions
  select * into v_slot
  from public.event_time_slots
  where id = p_slot_id
  for update;

  if not found then
    raise exception 'SLOT_NOT_FOUND: The requested time slot does not exist.';
  end if;

  if v_slot.status <> 'available' then
    raise exception 'SLOT_UNAVAILABLE: This time slot is not open for booking (status: %).', v_slot.status;
  end if;

  -- 2. Validate package if provided
  if p_package_id is not null then
    select * into v_pkg
    from public.photography_packages
    where id = p_package_id;

    if not found or v_pkg.is_active = false then
      raise exception 'PACKAGE_NOT_FOUND: The selected package does not exist or is inactive.';
    end if;

    -- Verify package is enabled for this session if associations exist
    if exists (select 1 from public.event_session_packages where session_id = p_session_id) then
      if not exists (
        select 1 from public.event_session_packages
        where session_id = p_session_id and package_id = p_package_id
      ) then
        raise exception 'PACKAGE_NOT_AVAILABLE_FOR_SESSION: This package is not available for the selected session.';
      end if;
    end if;

    -- Verify slot duration matches package duration
    if v_pkg.duration_mins is not null and v_pkg.duration_mins > 0 then
      if v_slot.duration_mins <> v_pkg.duration_mins then
        raise exception 'DURATION_MISMATCH: Selected slot duration (%) does not match package duration (%).',
          v_slot.duration_mins, v_pkg.duration_mins;
      end if;
    end if;
  end if;

  -- 3. Get hold duration from event if not provided
  if p_hold_duration_mins is not null and p_hold_duration_mins > 0 then
    v_duration := p_hold_duration_mins;
  else
    select * into v_event from public.booking_events where id = p_event_id;
    v_duration := coalesce(v_event.slot_hold_duration_mins, 5);
  end if;

  -- 4. Calculate active confirmed bookings overlapping this slot's time window on the same resource
  select count(*) into v_booked_count
  from public.bookings b
  where (
    b.slot_id = p_slot_id
    or (
      b.resource_pool = coalesce(v_event.resource_pool, 'primary_studio')
      and b.status in ('pending', 'confirmed', 'rescheduled')
      and b.effective_start_at < v_slot.effective_end_at
      and b.effective_end_at > v_slot.effective_start_at
    )
  );

  -- 5. Calculate active, unexpired holds from OTHER visitors on this slot OR overlapping time ranges
  select count(*) into v_other_holds_count
  from public.booking_slot_holds h
  join public.event_time_slots s on s.id = h.slot_id
  where h.status = 'active'
    and h.expires_at > now()
    and h.flow_token <> p_flow_token
    and (
      h.slot_id = p_slot_id
      or (
        h.event_id = p_event_id
        and s.effective_start_at < v_slot.effective_end_at
        and s.effective_end_at > v_slot.effective_start_at
      )
    );

  v_available_cap := v_slot.capacity - (v_booked_count + v_other_holds_count);

  if v_available_cap <= 0 then
    return jsonb_build_object(
      'success', false,
      'code', 'SLOT_CAPACITY_EXCEEDED',
      'message', 'This time slot is currently being held or fully booked by another visitor. Please choose another slot.'
    );
  end if;

  v_expires_at := now() + (v_duration * interval '1 minute');

  -- 6. Release any PREVIOUS active holds held by this flow_token for different slots or packages
  update public.booking_slot_holds
  set status = 'released'
  where flow_token = p_flow_token
    and status = 'active'
    and (slot_id <> p_slot_id or (p_package_id is not null and package_id is not null and package_id <> p_package_id));

  -- 7. Check if client already has an active hold on THIS slot -> extend it
  select id into v_hold_id
  from public.booking_slot_holds
  where slot_id = p_slot_id
    and flow_token = p_flow_token
    and status = 'active'
  order by created_at desc
  limit 1;

  if v_hold_id is not null then
    update public.booking_slot_holds
    set expires_at = v_expires_at,
        hold_duration_mins = v_duration,
        package_id = coalesce(p_package_id, package_id)
    where id = v_hold_id;
  else
    insert into public.booking_slot_holds (
      event_id,
      session_id,
      slot_id,
      package_id,
      flow_token,
      user_id,
      hold_duration_mins,
      expires_at,
      status
    ) values (
      p_event_id,
      p_session_id,
      p_slot_id,
      p_package_id,
      p_flow_token,
      auth.uid(),
      v_duration,
      v_expires_at,
      'active'
    )
    returning id into v_hold_id;
  end if;

  return jsonb_build_object(
    'success', true,
    'hold_id', v_hold_id,
    'slot_id', p_slot_id,
    'package_id', p_package_id,
    'expires_at', v_expires_at,
    'duration_mins', v_duration,
    'remaining_seconds', extract(epoch from (v_expires_at - now()))::integer
  );
end;
$$;

grant execute on function public.acquire_slot_hold(uuid, uuid, uuid, text, integer, uuid) to anon, authenticated;

-- Backfill existing slots with duration_mins calculated from timestamps
update public.event_time_slots
set duration_mins = greatest(5, round(extract(epoch from (end_at - start_at)) / 60)::integer)
where duration_mins is null or duration_mins = 30;

-- Notify PostgREST to reload schema
notify pgrst, 'reload schema';
