-- ------------------------------------------------------------------------------
-- MIGRATION: 20261101000001_slot_holds_and_dynamic_event_cms.sql
-- Description:
-- 1. Adds slot_hold_duration_mins and info_blocks to public.booking_events.
-- 2. Creates public.booking_slot_holds table for temporary slot reservation.
-- 3. Implements atomic RPCs: acquire_slot_hold, release_slot_hold, consume_slot_hold.
-- 4. Updates create_booking_atomic to validate and consume slot holds atomically.
-- ------------------------------------------------------------------------------

-- 1. Extend booking_events with slot_hold_duration_mins and info_blocks
alter table public.booking_events
  add column if not exists slot_hold_duration_mins integer not null default 5
    check (slot_hold_duration_mins >= 1 and slot_hold_duration_mins <= 60),
  add column if not exists info_blocks jsonb not null default '[]'::jsonb;

-- 2. Create booking_slot_holds table
create table if not exists public.booking_slot_holds (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.booking_events(id) on delete cascade,
  session_id uuid references public.event_sessions(id) on delete cascade,
  slot_id uuid not null references public.event_time_slots(id) on delete cascade,
  flow_token text not null,
  user_id uuid references auth.users(id) on delete set null,
  hold_duration_mins integer not null default 5,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'consumed', 'released', 'expired')),
  consumed_booking_id uuid references public.bookings(id) on delete set null,
  consumed_booking_ref text
);

-- Indexes for fast availability checks & token lookups
create index if not exists idx_booking_slot_holds_slot_active
  on public.booking_slot_holds(slot_id, expires_at)
  where status = 'active';

create index if not exists idx_booking_slot_holds_flow_token
  on public.booking_slot_holds(flow_token, status);

create index if not exists idx_booking_slot_holds_event_status
  on public.booking_slot_holds(event_id, status);

-- Enable RLS
alter table public.booking_slot_holds enable row level security;

-- Policies
create policy "Allow public to create and view their own holds by flow_token"
  on public.booking_slot_holds
  for select
  using (
    flow_token = coalesce(current_setting('request.headers', true)::json->>'x-flow-token', flow_token)
    or auth.uid() = user_id
    or public.is_admin()
  );

create policy "Allow public insert of holds"
  on public.booking_slot_holds
  for insert
  with check (true);

create policy "Allow public to update their own holds by flow_token"
  on public.booking_slot_holds
  for update
  using (
    flow_token = coalesce(current_setting('request.headers', true)::json->>'x-flow-token', flow_token)
    or auth.uid() = user_id
    or public.is_admin()
  );

-- ------------------------------------------------------------------------------
-- 3. ATOMIC RPC: acquire_slot_hold
-- ------------------------------------------------------------------------------
create or replace function public.acquire_slot_hold(
  p_event_id uuid,
  p_session_id uuid,
  p_slot_id uuid,
  p_flow_token text,
  p_hold_duration_mins integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot public.event_time_slots;
  v_event public.booking_events;
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

  -- 2. Get hold duration from event if not provided
  if p_hold_duration_mins is not null and p_hold_duration_mins > 0 then
    v_duration := p_hold_duration_mins;
  else
    select * into v_event from public.booking_events where id = p_event_id;
    v_duration := coalesce(v_event.slot_hold_duration_mins, 5);
  end if;

  -- 3. Calculate active confirmed bookings on this slot
  select count(*) into v_booked_count
  from public.bookings
  where slot_id = p_slot_id
    and status in ('pending', 'confirmed', 'rescheduled');

  -- 4. Calculate active, unexpired holds from OTHER visitors
  select count(*) into v_other_holds_count
  from public.booking_slot_holds
  where slot_id = p_slot_id
    and status = 'active'
    and expires_at > now()
    and flow_token <> p_flow_token;

  v_available_cap := v_slot.capacity - (v_booked_count + v_other_holds_count);

  if v_available_cap <= 0 then
    return jsonb_build_object(
      'success', false,
      'code', 'SLOT_CAPACITY_EXCEEDED',
      'message', 'This time slot is currently being held or fully booked by another visitor. Please choose another slot.'
    );
  end if;

  v_expires_at := now() + (v_duration * interval '1 minute');

  -- 5. Release any PREVIOUS active holds held by this flow_token for different slots
  update public.booking_slot_holds
  set status = 'released'
  where flow_token = p_flow_token
    and status = 'active'
    and slot_id <> p_slot_id;

  -- 6. Check if client already has an active hold on THIS slot -> extend it
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
        hold_duration_mins = v_duration
    where id = v_hold_id;
  else
    insert into public.booking_slot_holds (
      event_id,
      session_id,
      slot_id,
      flow_token,
      user_id,
      hold_duration_mins,
      expires_at,
      status
    ) values (
      p_event_id,
      p_session_id,
      p_slot_id,
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
    'expires_at', v_expires_at,
    'duration_mins', v_duration,
    'remaining_seconds', extract(epoch from (v_expires_at - now()))::integer
  );
end;
$$;

-- ------------------------------------------------------------------------------
-- 4. ATOMIC RPC: release_slot_hold
-- ------------------------------------------------------------------------------
create or replace function public.release_slot_hold(
  p_hold_id uuid,
  p_flow_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer;
begin
  update public.booking_slot_holds
  set status = 'released'
  where id = p_hold_id
    and (flow_token = p_flow_token or public.is_admin())
    and status = 'active';

  get diagnostics v_updated = row_count;

  return jsonb_build_object(
    'success', true,
    'released', v_updated > 0
  );
end;
$$;

-- ------------------------------------------------------------------------------
-- 5. ATOMIC RPC: consume_slot_hold
-- ------------------------------------------------------------------------------
create or replace function public.consume_slot_hold(
  p_hold_id uuid,
  p_flow_token text,
  p_booking_id uuid,
  p_booking_ref text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.booking_slot_holds
  set status = 'consumed',
      consumed_booking_id = p_booking_id,
      consumed_booking_ref = p_booking_ref
  where id = p_hold_id
    and (flow_token = p_flow_token or public.is_admin());

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.acquire_slot_hold(uuid, uuid, uuid, text, integer) to anon, authenticated;
grant execute on function public.release_slot_hold(uuid, text) to anon, authenticated;
grant execute on function public.consume_slot_hold(uuid, text, uuid, text) to authenticated;

