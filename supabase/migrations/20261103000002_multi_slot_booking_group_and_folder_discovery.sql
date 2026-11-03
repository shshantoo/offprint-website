-- Migration: 20261103000002_multi_slot_booking_group_and_folder_discovery.sql
-- Description: Adds booking grouping columns, enables multi-slot basket holds without auto-releasing sibling holds,
-- and enhances slot hold release and discovery.

-- 1. Add booking group columns to public.bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS booking_group_id uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS booking_group_ref text,
  ADD COLUMN IF NOT EXISTS group_total_amount numeric(12, 2),
  ADD COLUMN IF NOT EXISTS is_primary_group_item boolean DEFAULT true;

-- Indexes for efficient grouping lookups in client & admin portals
CREATE INDEX IF NOT EXISTS idx_bookings_group_id
  ON public.bookings(booking_group_id);

CREATE INDEX IF NOT EXISTS idx_bookings_group_ref
  ON public.bookings(booking_group_ref);

-- Backfill legacy single bookings where booking_group_id is null
UPDATE public.bookings
SET booking_group_id = id,
    booking_group_ref = booking_ref,
    is_primary_group_item = true
WHERE booking_group_id IS NULL;

-- 2. Update acquire_slot_hold to support multi-slot basket selection
-- CRITICAL FIX: Removed the automatic release of previous holds for different slots!
-- Sibling holds belonging to the same flow_token must coexist in the user's booking basket.
CREATE OR REPLACE FUNCTION public.acquire_slot_hold(
  p_event_id uuid,
  p_session_id uuid,
  p_slot_id uuid,
  p_flow_token text,
  p_hold_duration_mins integer DEFAULT NULL::integer,
  p_package_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  -- NOTE: Do NOT release previous active holds for different slots!
  -- Clients can now select multiple slots across packages and dates in their booking basket.

  -- 5. Check if client already has an active hold on THIS slot -> extend it
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
      flow_token,
      user_id,
      hold_duration_mins,
      expires_at,
      status,
      package_id
    ) values (
      p_event_id,
      p_session_id,
      p_slot_id,
      p_flow_token,
      auth.uid(),
      v_duration,
      v_expires_at,
      'active',
      p_package_id
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
$function$;

-- 3. Update release_slot_hold to support releasing by hold_id OR (flow_token, slot_id)
CREATE OR REPLACE FUNCTION public.release_slot_hold(
  p_hold_id uuid DEFAULT NULL::uuid,
  p_flow_token text DEFAULT ''::text,
  p_slot_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_updated integer;
begin
  if p_hold_id is not null then
    update public.booking_slot_holds
    set status = 'released'
    where id = p_hold_id
      and (flow_token = p_flow_token or public.is_admin())
      and status = 'active';
  elsif p_slot_id is not null and p_flow_token is not null and trim(p_flow_token) <> '' then
    update public.booking_slot_holds
    set status = 'released'
    where slot_id = p_slot_id
      and flow_token = p_flow_token
      and status = 'active';
  else
    -- Fallback release all active holds for this flow_token if neither hold_id nor slot_id is provided
    update public.booking_slot_holds
    set status = 'released'
    where flow_token = p_flow_token
      and status = 'active';
  end if;

  get diagnostics v_updated = row_count;

  return jsonb_build_object(
    'success', true,
    'released', v_updated > 0,
    'released_count', v_updated
  );
end;
$function$;

-- 4. Notify PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
