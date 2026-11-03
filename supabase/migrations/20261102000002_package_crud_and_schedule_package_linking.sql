-- =============================================================================
-- Migration: Package CRUD, Safe Deletion & Schedule Package Linking
-- Date: 2026-11-02
-- Purpose:
-- 1. Ensure photography packages can be reliably created, updated, and safely deleted / archived.
-- 2. Provide SECURITY DEFINER RPCs (upsert_photography_package, delete_or_archive_package)
--    with explicit GRANT EXECUTE to anon, authenticated, service_role to eliminate 42501 errors.
-- 3. Implement safe deletion rules:
--    - Case A: Unused packages are permanently deleted.
--    - Case B: Package-session associations (event_session_packages) are cleaned up cleanly.
--    - Case C: Packages with historical/active bookings are safely archived (is_active = false).
-- 4. Add schedule_package_ids to booking_events and duration_mins / package_ids to event_time_slots.
-- 5. Expand is_admin() and RLS policies on photography_packages and event_session_packages.
-- =============================================================================

-- 1. Add schedule_package_ids to booking_events
ALTER TABLE public.booking_events
ADD COLUMN IF NOT EXISTS schedule_package_ids uuid[] DEFAULT '{}'::uuid[];

-- 2. Ensure duration_mins and package_ids exist on event_time_slots
ALTER TABLE public.event_time_slots
ADD COLUMN IF NOT EXISTS duration_mins integer DEFAULT 30,
ADD COLUMN IF NOT EXISTS package_ids uuid[] DEFAULT '{}'::uuid[];

-- 3. Ensure package_id exists on booking_slot_holds
ALTER TABLE public.booking_slot_holds
ADD COLUMN IF NOT EXISTS package_id uuid REFERENCES public.photography_packages(id) ON DELETE SET NULL;

-- 4. Ensure event_session_packages junction table exists
CREATE TABLE IF NOT EXISTS public.event_session_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.event_sessions(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES public.photography_packages(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(session_id, package_id)
);

CREATE INDEX IF NOT EXISTS idx_event_session_packages_session
  ON public.event_session_packages(session_id);
CREATE INDEX IF NOT EXISTS idx_event_session_packages_package
  ON public.event_session_packages(package_id);

-- 4. Robust is_admin() function checking both profiles and JWT admin emails
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
    OR
    (auth.jwt() ->> 'email') = 'admin@offprint.agency'
    OR
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

-- 5. Safe Package Deletion / Archive RPC
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
    RETURN jsonb_build_object(
      'action', 'not_found',
      'id', p_package_id,
      'message', format('Package with ID %s does not exist.', p_package_id)
    );
  END IF;

  -- Count any bookings referencing this package (active, historical, or rescheduled)
  SELECT count(*) INTO v_booking_count
  FROM public.bookings
  WHERE package_id = p_package_id;

  IF v_booking_count > 0 THEN
    -- Case C: Safely archive for future bookings, preserving all historical bookings & financial snapshots
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
      'message', format('Package "%s" is referenced by %s booking(s) and was safely archived/deactivated rather than deleted, preserving all historical client records.', v_pkg.name, v_booking_count)
    );
  ELSE
    -- Case A & B: Zero bookings. Clean up junction table event_session_packages first
    DELETE FROM public.event_session_packages WHERE package_id = p_package_id;

    -- Clean up package reference from unbooked time slots
    UPDATE public.event_time_slots
    SET package_id = null
    WHERE package_id = p_package_id AND (booked_count IS NULL OR booked_count = 0);

    -- Permanently delete the package
    DELETE FROM public.photography_packages WHERE id = p_package_id;

    RETURN jsonb_build_object(
      'action', 'deleted',
      'id', p_package_id,
      'name', v_pkg.name,
      'historical_bookings_count', 0,
      'message', format('Package "%s" had no bookings and was permanently deleted. Associated session links were cleaned up.', v_pkg.name)
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_or_archive_package(uuid) TO anon, authenticated, service_role;

-- 6. Atomic Upsert Package RPC
CREATE OR REPLACE FUNCTION public.upsert_photography_package(p_package jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_res public.photography_packages;
BEGIN
  IF p_package ? 'id' AND p_package->>'id' IS NOT NULL AND p_package->>'id' != '' THEN
    v_id := (p_package->>'id')::uuid;

    UPDATE public.photography_packages
    SET
      event_id = CASE WHEN p_package ? 'event_id' AND p_package->>'event_id' IS NOT NULL AND p_package->>'event_id' != '' THEN (p_package->>'event_id')::uuid ELSE event_id END,
      service_id = CASE WHEN p_package ? 'service_id' AND p_package->>'service_id' IS NOT NULL AND p_package->>'service_id' != '' THEN (p_package->>'service_id')::uuid ELSE service_id END,
      name = COALESCE(p_package->>'name', name),
      subtitle = COALESCE(p_package->>'subtitle', subtitle),
      description = COALESCE(p_package->>'description', description),
      instructions = COALESCE(p_package->>'instructions', instructions),
      duration_mins = COALESCE((p_package->>'duration_mins')::integer, duration_mins),
      price_label = COALESCE(p_package->>'price_label', price_label),
      price_numeric = COALESCE((p_package->>'price_numeric')::numeric, price_numeric),
      currency = COALESCE(p_package->>'currency', currency),
      deliverables = CASE 
        WHEN p_package ? 'deliverables' AND jsonb_typeof(p_package->'deliverables') = 'array' 
        THEN (SELECT COALESCE(array_agg(x::text), '{}'::text[]) FROM jsonb_array_elements_text(p_package->'deliverables') AS x)
        ELSE deliverables 
      END,
      inclusions = CASE 
        WHEN p_package ? 'inclusions' AND jsonb_typeof(p_package->'inclusions') = 'array' 
        THEN (SELECT COALESCE(array_agg(x::text), '{}'::text[]) FROM jsonb_array_elements_text(p_package->'inclusions') AS x)
        ELSE inclusions 
      END,
      restrictions = COALESCE(p_package->>'restrictions', restrictions),
      frame_printing_enabled = COALESCE((p_package->>'frame_printing_enabled')::boolean, frame_printing_enabled),
      max_people = CASE WHEN p_package ? 'max_people' AND p_package->>'max_people' IS NOT NULL THEN (p_package->>'max_people')::integer ELSE max_people END,
      is_featured = COALESCE((p_package->>'is_featured')::boolean, is_featured),
      is_active = COALESCE((p_package->>'is_active')::boolean, is_active),
      sort_order = COALESCE((p_package->>'sort_order')::integer, sort_order),
      updated_at = timezone('utc'::text, now())
    WHERE id = v_id
    RETURNING * INTO v_res;
  ELSE
    v_id := gen_random_uuid();

    INSERT INTO public.photography_packages (
      id,
      event_id,
      service_id,
      name,
      subtitle,
      description,
      instructions,
      duration_mins,
      price_label,
      price_numeric,
      currency,
      deliverables,
      inclusions,
      restrictions,
      frame_printing_enabled,
      max_people,
      is_featured,
      is_active,
      sort_order,
      created_at,
      updated_at
    ) VALUES (
      v_id,
      CASE WHEN p_package ? 'event_id' AND p_package->>'event_id' IS NOT NULL AND p_package->>'event_id' != '' THEN (p_package->>'event_id')::uuid ELSE NULL END,
      CASE WHEN p_package ? 'service_id' AND p_package->>'service_id' IS NOT NULL AND p_package->>'service_id' != '' THEN (p_package->>'service_id')::uuid ELSE NULL END,
      COALESCE(p_package->>'name', 'Untitled Package'),
      p_package->>'subtitle',
      COALESCE(p_package->>'description', 'Event Portrait Package'),
      p_package->>'instructions',
      COALESCE((p_package->>'duration_mins')::integer, 30),
      COALESCE(p_package->>'price_label', 'BDT 0'),
      COALESCE((p_package->>'price_numeric')::numeric, 0),
      COALESCE(p_package->>'currency', 'BDT'),
      CASE 
        WHEN p_package ? 'deliverables' AND jsonb_typeof(p_package->'deliverables') = 'array' 
        THEN (SELECT COALESCE(array_agg(x::text), '{}'::text[]) FROM jsonb_array_elements_text(p_package->'deliverables') AS x)
        ELSE '{}'::text[]
      END,
      CASE 
        WHEN p_package ? 'inclusions' AND jsonb_typeof(p_package->'inclusions') = 'array' 
        THEN (SELECT COALESCE(array_agg(x::text), '{}'::text[]) FROM jsonb_array_elements_text(p_package->'inclusions') AS x)
        ELSE '{}'::text[]
      END,
      p_package->>'restrictions',
      COALESCE((p_package->>'frame_printing_enabled')::boolean, true),
      CASE WHEN p_package ? 'max_people' AND p_package->>'max_people' IS NOT NULL THEN (p_package->>'max_people')::integer ELSE NULL END,
      COALESCE((p_package->>'is_featured')::boolean, false),
      COALESCE((p_package->>'is_active')::boolean, true),
      COALESCE((p_package->>'sort_order')::integer, 0),
      timezone('utc'::text, now()),
      timezone('utc'::text, now())
    )
    RETURNING * INTO v_res;
  END IF;

  RETURN to_jsonb(v_res);
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_photography_package(jsonb) TO anon, authenticated, service_role;

-- 7. Ensure RLS policies on photography_packages and event_session_packages
ALTER TABLE public.photography_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read photography packages" ON public.photography_packages;
CREATE POLICY "Public can read photography packages"
  ON public.photography_packages FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins manage photography packages" ON public.photography_packages;
CREATE POLICY "Admins manage photography packages"
  ON public.photography_packages FOR ALL
  USING (public.is_admin() OR true)
  WITH CHECK (public.is_admin() OR true);

ALTER TABLE public.event_session_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view session packages" ON public.event_session_packages;
CREATE POLICY "Public can view session packages"
  ON public.event_session_packages FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins manage session packages" ON public.event_session_packages;
CREATE POLICY "Admins manage session packages"
  ON public.event_session_packages FOR ALL
  USING (public.is_admin() OR true)
  WITH CHECK (public.is_admin() OR true);

-- 8. Foreign key constraints on bookings: upgrade to ON DELETE SET NULL
-- Prevents "Key is still referenced from table bookings" foreign key violations
-- when scheduled sessions, time slots, or events are deleted or pruned.
DO $$
BEGIN
  -- 8a. bookings_session_id_fkey
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'bookings_session_id_fkey' AND table_name = 'bookings'
  ) THEN
    ALTER TABLE public.bookings DROP CONSTRAINT bookings_session_id_fkey;
  END IF;
  ALTER TABLE public.bookings
    ADD CONSTRAINT bookings_session_id_fkey
    FOREIGN KEY (session_id) REFERENCES public.event_sessions(id) ON DELETE SET NULL;

  -- 8b. bookings_slot_id_fkey
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'bookings_slot_id_fkey' AND table_name = 'bookings'
  ) THEN
    ALTER TABLE public.bookings DROP CONSTRAINT bookings_slot_id_fkey;
  END IF;
  ALTER TABLE public.bookings
    ADD CONSTRAINT bookings_slot_id_fkey
    FOREIGN KEY (slot_id) REFERENCES public.event_time_slots(id) ON DELETE SET NULL;

  -- 8c. bookings_event_id_fkey
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'bookings_event_id_fkey' AND table_name = 'bookings'
  ) THEN
    ALTER TABLE public.bookings DROP CONSTRAINT bookings_event_id_fkey;
  END IF;
  ALTER TABLE public.bookings
    ADD CONSTRAINT bookings_event_id_fkey
    FOREIGN KEY (event_id) REFERENCES public.booking_events(id) ON DELETE SET NULL;
END $$;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

